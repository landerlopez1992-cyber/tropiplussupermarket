// Integración con Square Orders API
// Crea órdenes en Square que aparecen en el POS y Dashboard

/**
 * Crea una orden en Square asociada a un customer
 * @param {Array} cartItems - Items del carrito
 * @param {string} customerId - ID del customer de Square
 * @param {string} paymentMethod - 'CARD' o 'CASH'
 * @param {string} paymentToken - Token de pago (solo para CARD)
 * @returns {Promise} Orden creada en Square
 */
async function createSquareOrder(cartItems, customerId, paymentMethod = 'CARD', paymentToken = null) {
    try {
        const user = getCurrentUser();
        if (!user || !user.id) {
            throw new Error('Usuario no autenticado');
        }

        const buildLineItems = (items, useCatalogObjectIds = true) => {
            return items.map(item => {
                const itemPrice = item.price || 0;
                const quantity = item.quantity || 1;
                const lineItem = {
                    quantity: quantity.toString(),
                    base_price_money: {
                        amount: Math.round(itemPrice * 100),
                        currency: 'USD'
                    }
                };

                // Si es una remesa, usar CUSTOM_AMOUNT con detalles en note
                if (item.type === 'remesa' && item.remesaData) {
                    const remesaData = item.remesaData;
                    const symbol = remesaData.currency === 'USD' ? '$' : '₱';
                    lineItem.item_type = 'CUSTOM_AMOUNT';
                    lineItem.note = `Remesa ${remesaData.currency}: ${symbol}${remesaData.amount.toFixed(2)} + Comisión ${symbol}${remesaData.fee.toFixed(2)} = Total ${symbol}${remesaData.total.toFixed(2)}`;
                } else {
                    const variationId = item.variationId || item.catalogObjectId || null;
                    if (useCatalogObjectIds && variationId) {
                        lineItem.catalog_object_id = variationId;
                        lineItem.item_type = 'ITEM';
                        lineItem.name = item.name || 'Producto';
                    } else {
                        // Para CUSTOM_AMOUNT no se permite "name". Usamos note para identificar.
                        lineItem.item_type = 'CUSTOM_AMOUNT';
                        lineItem.note = item.name || 'Producto';
                    }
                }

                return lineItem;
            });
        };

        // Calcular totales
        let totalAmount = 0;
        for (const item of cartItems) {
            const itemPrice = item.price || 0;
            const quantity = item.quantity || 1;
            const lineItemTotal = itemPrice * quantity;
            totalAmount += lineItemTotal;
        }

        // Crear la orden en Square
        let lineItems = buildLineItems(cartItems, true);
        const fullName = [user?.given_name, user?.family_name].filter(Boolean).join(' ').trim();
        const recipient = {
            display_name: fullName || user?.name || user?.email || 'Cliente',
            email_address: user?.email || user?.email_address || undefined,
            phone_number: user?.phone_number || user?.phone || undefined
        };
        Object.keys(recipient).forEach(key => recipient[key] === undefined && delete recipient[key]);

        const pickupDetails = {
            recipient,
            schedule_type: 'ASAP',
            note: 'Recogida en tienda - Tropiplus Supermarket Real Campiña, Aguada de Pasajeros, Cienfuegos'
        };

        const orderData = {
            idempotency_key: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            order: {
                location_id: SQUARE_CONFIG.locationId,
                ticket_name: `WEB-${new Date().toLocaleString('es-ES')}`,
                note: 'Pedido web (pago en tienda)',
                source: {
                    name: 'Tropiplus Web'
                },
                line_items: lineItems,
                customer_id: customerId,
                state: 'OPEN', // Estado inicial: OPEN, COMPLETED, CANCELED
                fulfillments: [
                    {
                        type: 'PICKUP', // Tipo: PICKUP, SHIPMENT, DELIVERY
                        state: 'PROPOSED', // Estado: PROPOSED, RESERVED, PREPARED, COMPLETED, CANCELED, FAILED
                        pickup_details: {
                            ...pickupDetails,
                            prep_time_duration: 'PT15M' // Tiempo de preparación estimado: 15 minutos
                        }
                    }
                ],
                metadata: {
                    source: 'web_app',
                    payment_method: paymentMethod,
                    pickup_location: 'Tropiplus Supermarket Real Campiña, Aguada de Pasajeros, Cienfuegos',
                    created_at: new Date().toISOString()
                }
            }
        };

        console.log('📦 Creando orden en Square:', orderData);

        // Crear la orden
        let orderResponse;
        try {
            orderResponse = await squareApiCall(
                '/v2/orders',
                'POST',
                orderData
            );
        } catch (error) {
            const message = error?.message || '';
            if (message.includes('Item variation with catalog object ID')) {
                console.warn('⚠️ Variación no encontrada. Reintentando como items personalizados...');
                lineItems = buildLineItems(cartItems, false);
                const fallbackOrderData = {
                    ...orderData,
                    order: {
                        ...orderData.order,
                        line_items: lineItems,
                        fulfillments: orderData.order.fulfillments // Mantener fulfillments en el fallback
                    }
                };
                orderResponse = await squareApiCall(
                    '/v2/orders',
                    'POST',
                    fallbackOrderData
                );
            } else {
                throw error;
            }
        }

        if (!orderResponse || !orderResponse.order) {
            throw new Error('No se pudo crear la orden en Square');
        }

        const order = orderResponse.order;
        console.log('✅ Orden creada en Square:', order.id);

        // DESCONTAR INVENTARIO cuando se crea la orden
        try {
            await adjustInventoryForOrder(cartItems);
            console.log('✅ Inventario actualizado correctamente');
        } catch (inventoryError) {
            console.error('⚠️ Error actualizando inventario (la orden se creó correctamente):', inventoryError);
            // No lanzar error - la orden ya se creó, solo loguear el problema
        }

        // Si el pago es con tarjeta, procesar el pago
        if (paymentMethod === 'CARD' && paymentToken) {
            await processCardPayment(order.id, paymentToken, totalAmount);
        } else if (paymentMethod === 'CASH') {
            // Para CASH, el pago debe quedar realmente registrado en Square.
            // Si falla, NO confirmamos éxito en la web para evitar estados inconsistentes.
            await processCashPayment(order.id, totalAmount);
            console.log('💰 Pago en efectivo registrado correctamente en Square.');
        }

        return order;

    } catch (error) {
        console.error('❌ Error creando orden en Square:', error);
        throw error;
    }
}

/**
 * Ajusta el inventario cuando se crea una orden
 * Descuenta las cantidades de los productos ordenados
 */
async function adjustInventoryForOrder(cartItems) {
    try {
        const changes = [];
        
        for (const item of cartItems) {
            const variationId = item.variationId || item.catalogObjectId;
            if (!variationId) {
                console.warn('⚠️ Item sin variationId, no se puede ajustar inventario:', item.name);
                continue;
            }
            
            const quantity = item.quantity || 1;
            
            // Crear cambio de inventario (descontar cantidad)
            changes.push({
                type: 'ADJUSTMENT',
                adjustment: {
                    catalog_object_id: variationId,
                    catalog_object_type: 'ITEM_VARIATION',
                    from_state: 'NONE', // Estado actual (NONE = cualquier estado)
                    to_state: 'SOLD', // Estado final (SOLD = vendido)
                    location_id: SQUARE_CONFIG.locationId,
                    quantity: quantity.toString(),
                    occurred_at: new Date().toISOString()
                }
            });
        }
        
        if (changes.length === 0) {
            console.warn('⚠️ No hay items con variationId para ajustar inventario');
            return;
        }
        
        console.log('📦 Ajustando inventario para', changes.length, 'items');
        
        const inventoryResponse = await squareApiCall(
            '/v2/inventory/batch-change',
            'POST',
            {
                idempotency_key: `inventory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                changes: changes,
                ignore_unchanged_counts: true
            }
        );
        
        if (inventoryResponse && inventoryResponse.counts) {
            console.log('✅ Inventario ajustado:', inventoryResponse.counts.length, 'items actualizados');
            return inventoryResponse;
        } else {
            throw new Error('No se recibió respuesta válida del ajuste de inventario');
        }
        
    } catch (error) {
        console.error('❌ Error ajustando inventario:', error);
        throw error;
    }
}

/**
 * Procesa un pago con tarjeta usando Square Payments API
 */
function mapSquarePaymentError(error) {
    const raw = (error && error.message) ? error.message : 'Error desconocido';
    const upper = raw.toUpperCase();
    let userMessage = 'No se pudo procesar el pago. Intenta nuevamente o usa otra tarjeta.';

    if (upper.includes('INSUFFICIENT_FUNDS')) {
        userMessage = 'Pago rechazado por fondos insuficientes. Usa otra tarjeta o revisa tu saldo.';
    } else if (upper.includes('CARD_DECLINED')) {
        userMessage = 'La tarjeta fue rechazada por el banco. Usa otra tarjeta o contacta al banco.';
    } else if (upper.includes('TRANSACTION_LIMIT')) {
        userMessage = 'Pago rechazado por el banco (límite o fondos insuficientes). Usa otra tarjeta o revisa tu saldo.';
    } else if (upper.includes('VERIFY_CVV')) {
        userMessage = 'El banco requiere verificación del CVV. Revisa el CVV o usa otra tarjeta.';
    } else if (upper.includes('INVALID_EXPIRATION')) {
        userMessage = 'La fecha de expiración no es válida. Revisa los datos de la tarjeta.';
    } else if (upper.includes('ADDRESS_VERIFICATION')) {
        userMessage = 'El banco requiere verificación de dirección. Revisa los datos de la tarjeta.';
    }

    return { raw, userMessage };
}

async function processCardPayment(orderId, paymentToken, amount) {
    try {
        const paymentData = {
            idempotency_key: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source_id: paymentToken,
            amount_money: {
                amount: Math.round(amount * 100), // Convertir a centavos
                currency: 'USD'
            },
            order_id: orderId,
            location_id: SQUARE_CONFIG.locationId
        };

        console.log('💳 Procesando pago con tarjeta:', paymentData);

        const paymentResponse = await squareApiCall(
            '/v2/payments',
            'POST',
            paymentData
        );

        if (!paymentResponse || !paymentResponse.payment) {
            throw new Error('No se pudo procesar el pago');
        }

        console.log('✅ Pago procesado:', paymentResponse.payment.id);
        return paymentResponse.payment;

    } catch (error) {
        console.error('❌ Error procesando pago:', error);
        const mapped = mapSquarePaymentError(error);
        error.userMessage = mapped.userMessage;
        error.rawMessage = mapped.raw;
        throw error;
    }
}

/**
 * Obtiene las órdenes de un customer desde Square
 */
async function getCustomerOrders(customerId, limit = 50) {
    try {
        const response = await squareApiCall(
            '/v2/orders/search',
            'POST',
            {
                location_ids: [SQUARE_CONFIG.locationId],
                query: {
                    filter: {
                        customer_filter: {
                            customer_ids: [customerId]
                        }
                    }
                },
                limit: limit
            }
        );

        if (response && response.orders) {
            return response.orders;
        }
        return [];

    } catch (error) {
        console.error('❌ Error obteniendo órdenes del customer:', error);
        return [];
    }
}

/**
 * Obtiene una orden específica por ID
 */
async function getOrderById(orderId) {
    try {
        const response = await squareApiCall(
            `/v2/orders/${orderId}`,
            'GET'
        );

        if (response && response.order) {
            return response.order;
        }
        return null;

    } catch (error) {
        console.error('❌ Error obteniendo orden:', error);
        return null;
    }
}

/**
 * Actualiza el estado de una orden
 */
async function updateOrderState(orderId, newState) {
    try {
        // Primero obtener la orden actual
        const currentOrder = await getOrderById(orderId);
        if (!currentOrder) {
            throw new Error('Orden no encontrada');
        }

        const updateData = {
            order: {
                version: currentOrder.version, // Importante: incluir la versión actual
                state: newState // OPEN, COMPLETED, CANCELED
            }
        };

        const response = await squareApiCall(
            `/v2/orders/${orderId}`,
            'PUT',
            updateData
        );

        console.log('✅ Estado de orden actualizado:', newState);
        return response.order;

    } catch (error) {
        console.error('❌ Error actualizando estado de orden:', error);
        throw error;
    }
}

/**
 * Procesa pago en efectivo para una orden existente
 * Esto se hace cuando el cliente recoge la orden en la tienda
 */
async function processCashPayment(orderId, amount) {
    try {
        // Para pagos en efectivo, intentar primero con source_id = CASH.
        const amountInCents = Math.round(amount * 100);
        const paymentData = {
            idempotency_key: `cash_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source_id: 'CASH',
            amount_money: {
                amount: amountInCents, // Convertir a centavos
                currency: 'USD'
            },
            // Requerido por Square cuando source_id = CASH
            cash_details: {
                buyer_supplied_money: {
                    amount: amountInCents,
                    currency: 'USD'
                }
            },
            order_id: orderId,
            location_id: SQUARE_CONFIG.locationId,
            note: 'Pago en efectivo registrado desde web'
        };

        console.log('💵 Procesando pago en efectivo:', paymentData);

        const paymentResponse = await squareApiCall(
            '/v2/payments',
            'POST',
            paymentData
        );

        if (!paymentResponse || !paymentResponse.payment) {
            throw new Error('No se pudo procesar el pago en efectivo');
        }

        // No completar la orden aquí; el flujo de fulfillment controla READY/PICKED UP.
        console.log('✅ Pago en efectivo registrado:', paymentResponse.payment.id);
        return paymentResponse.payment;

    } catch (error) {
        console.error('❌ Error procesando pago en efectivo:', error);
        // Fallback documentado para pagos fuera de Square card rails.
        try {
            console.log('🔄 Reintentando pago en efectivo con source_id=EXTERNAL...');
            const fallbackPaymentData = {
                idempotency_key: `cash_payment_ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                source_id: 'EXTERNAL',
                amount_money: {
                    amount: amountInCents,
                    currency: 'USD'
                },
                order_id: orderId,
                location_id: SQUARE_CONFIG.locationId,
                external_details: {
                    // "CASH" no es un tipo válido para EXTERNAL en Square.
                    // Usamos EXTERNAL para registrar pago fuera de los rails de tarjeta.
                    type: 'EXTERNAL',
                    source: 'WEB_APP'
                },
                note: 'Pago en efectivo registrado desde web (EXTERNAL)'
            };

            const fallbackResponse = await squareApiCall(
                '/v2/payments',
                'POST',
                fallbackPaymentData
            );

            if (!fallbackResponse || !fallbackResponse.payment) {
                throw new Error('Fallback sin payment en respuesta');
            }

            console.log('✅ Pago en efectivo procesado (fallback):', fallbackResponse.payment.id);
            return fallbackResponse.payment;
        } catch (fallbackError) {
            console.error('❌ Error en fallback de pago en efectivo:', fallbackError);
            const combined = new Error(
                `No se pudo registrar el pago en efectivo en Square. ` +
                `Intento CASH: ${error.message || 'error desconocido'}. ` +
                `Intento EXTERNAL: ${fallbackError.message || 'error desconocido'}.`
            );
            combined.userMessage = 'No se pudo registrar el pago en efectivo en Square. Intenta nuevamente.';
            throw combined;
        }
    }
}

// Hacer funciones disponibles globalmente
window.createSquareOrder = createSquareOrder;
window.getCustomerOrders = getCustomerOrders;
window.getOrderById = getOrderById;
window.updateOrderState = updateOrderState;
window.processCashPayment = processCashPayment;
window.saveCardForFutureUse = saveCardForFutureUse;
window.adjustInventoryForOrder = adjustInventoryForOrder;
