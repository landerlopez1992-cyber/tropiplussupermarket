// Página de Mis Órdenes - Integrada con Square Orders API

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está logueado
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
        initOrdersPage();
    } else {
        window.location.href = 'login.html';
    }
});

function initOrdersPage() {
    const orderTabs = document.querySelectorAll('.order-tab');
    const ordersPeriod = document.getElementById('orders-period');
    
    // Tabs
    orderTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            orderTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabType = tab.dataset.tab;
            loadOrders(tabType);
        });
    });
    
    // Filtro de período
    if (ordersPeriod) {
        ordersPeriod.addEventListener('change', () => {
            const activeTab = document.querySelector('.order-tab.active');
            const tabType = activeTab ? activeTab.dataset.tab : 'all';
            loadOrders(tabType);
        });
    }
    
    // Cargar órdenes iniciales
    loadOrders('all');
}

async function loadOrders(tabType) {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    try {
        const user = getCurrentUser();
        if (!user || !user.id) {
            throw new Error('Usuario no encontrado');
        }

        ordersList.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="fas fa-spinner fa-spin" style="font-size: 32px;"></i><p>Cargando órdenes...</p></div>';

        // Obtener órdenes desde Square
        const orders = await getCustomerOrders(user.id);
        
        // Filtrar recargas de tarjetas - no deben aparecer como órdenes
        // Las recargas se procesan directamente sin crear órdenes
        const ordersWithoutGiftCardReloads = orders.filter(order => {
            // Si la orden solo contiene recargas de tarjetas, excluirla
            if (!order.line_items || order.line_items.length === 0) {
                return true; // Mantener órdenes sin items (por si acaso)
            }
            
            // Verificar si todos los items son recargas de tarjetas
            const allAreGiftCardReloads = order.line_items.every(item => {
                const isGiftCardReload = (item.note && item.note.includes('Recarga Tarjeta')) || 
                                        (item.name && item.name.includes('Recarga Tarjeta'));
                return isGiftCardReload;
            });
            
            // Excluir si todos los items son recargas
            return !allAreGiftCardReloads;
        });
        
        // Filtrar según el tab
        let filteredOrders = ordersWithoutGiftCardReloads;
        if (tabType === 'unpaid') {
            // "Órdenes NO cobradas": SOLO órdenes con pago declinado o canceladas
            // NO incluir órdenes en proceso (RESERVED, PREPARED) aunque sean cash
            filteredOrders = ordersWithoutGiftCardReloads.filter(order => {
                const isPaid = isOrderPaidSuccessfully(order);
                const paymentMethod = order.metadata?.payment_method || 'CARD';
                const fulfillmentState = getFulfillmentState(order);
                
                // Solo mostrar órdenes realmente no cobradas:
                // 1. Órdenes canceladas
                if (order.state === 'CANCELED' || fulfillmentState === 'CANCELED') {
                    return true;
                }
                
                // 2. Órdenes con pago declinado (tarjeta rechazada)
                if (paymentMethod === 'CARD' && !isPaid && order.state === 'OPEN') {
                    // Verificar si tiene tenders fallidos
                    const hasFailedTenders = order.tenders && order.tenders.some(t => 
                        t.state === 'FAILED' || t.state === 'CANCELED'
                    );
                    if (hasFailedTenders) {
                        return true;
                    }
                }
                
                // NO incluir órdenes en proceso (PROPOSED, RESERVED, PREPARED) aunque sean cash
                // Estas van a "Mis órdenes" porque están activas
                
                return false;
            });
        } else {
            // "Mis órdenes": todas las órdenes activas (pagadas o en proceso)
            filteredOrders = orders.filter(order => {
                const isPaid = isOrderPaidSuccessfully(order);
                const paymentMethod = order.metadata?.payment_method || 'CARD';
                const fulfillmentState = getFulfillmentState(order);
                
                // Excluir solo órdenes canceladas o con pago declinado confirmado
                if (order.state === 'CANCELED' || fulfillmentState === 'CANCELED') {
                    return false;
                }
                
                // Si es tarjeta y no está pagada, verificar si es declinada
                if (paymentMethod === 'CARD' && !isPaid) {
                    const hasFailedTenders = order.tenders && order.tenders.some(t => 
                        t.state === 'FAILED' || t.state === 'CANCELED'
                    );
                    // Si tiene tenders fallidos, es declinada, no mostrarla aquí
                    if (hasFailedTenders) {
                        return false;
                    }
                }
                
                // Todas las demás órdenes (activas, en proceso, pagadas) van aquí
                return true;
            });
        }

        // Filtrar por período
        const period = document.getElementById('orders-period')?.value || 'month';
        filteredOrders = filterOrdersByPeriod(filteredOrders, period);

        if (filteredOrders.length === 0) {
            ordersList.innerHTML = `
                <div class="orders-empty">
                    <div class="orders-empty-icon">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <h3>No se han encontrado órdenes.</h3>
                    <p>Por favor seleccione un período de tiempo diferente.</p>
                    <a href="products.html" class="auth-submit-btn" style="display: inline-block; margin-top: 20px;">
                        Ir a todos los productos
                    </a>
                </div>
            `;
            return;
        }

        // Renderizar órdenes
        renderOrders(filteredOrders, ordersList);

    } catch (error) {
        console.error('Error cargando órdenes:', error);
        ordersList.innerHTML = `
            <div class="orders-empty">
                <div class="orders-empty-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error al cargar las órdenes</h3>
                <p>${error.message}</p>
                <button onclick="loadOrders('all')" class="auth-submit-btn" style="display: inline-block; margin-top: 20px;">
                    Reintentar
                </button>
            </div>
        `;
    }
}

function filterOrdersByPeriod(orders, period) {
    const now = new Date();
    let cutoffDate;

    switch (period) {
        case 'month':
            cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            break;
        case '3months':
            cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            break;
        case '6months':
            cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            break;
        case 'year':
            cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            break;
        default:
            return orders;
    }

    return orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= cutoffDate;
    });
}

function isOrderPaidSuccessfully(order) {
    // Verificar si la orden tiene pagos asociados Y fueron exitosos
    // En Square, una orden pagada tiene tenders con estado CAPTURED o COMPLETED
    
    if (!order.tenders || order.tenders.length === 0) {
        return false;
    }
    
    // Verificar que al menos un tender tenga estado exitoso
    const successfulTenders = order.tenders.filter(tender => {
        // En Square, un tender exitoso tiene state: 'CAPTURED' o 'COMPLETED'
        // O si tiene payment_id, verificar que el pago fue exitoso
        // Excluir estados de fallo: FAILED, CANCELED
        const state = tender.state || '';
        if (state === 'FAILED' || state === 'CANCELED') {
            return false;
        }
        
        return state === 'CAPTURED' || 
               state === 'COMPLETED' ||
               (tender.payment_id && tender.type === 'CARD');
    });
    
    return successfulTenders.length > 0;
}

function renderOrders(orders, container) {
    container.innerHTML = '';

    orders.forEach(order => {
        const orderCard = createOrderCard(order);
        // Solo agregar si la tarjeta fue creada (puede ser null si es recarga)
        if (orderCard) {
            container.appendChild(orderCard);
        }
    });
}

function createOrderCard(order) {
    // Detectar si es una remesa
    // NOTA: Las recargas de tarjetas ya fueron filtradas y no deberían llegar aquí
    const isRemesa = order.line_items && order.line_items.some(item => 
        (item.note && item.note.includes('Remesa')) || 
        (item.name && item.name.includes('Remesa'))
    );
    
    // Verificar si hay recargas (por si acaso alguna pasó el filtro)
    const hasGiftCardReload = order.line_items && order.line_items.some(item => 
        (item.note && item.note.includes('Recarga Tarjeta')) || 
        (item.name && item.name.includes('Recarga Tarjeta'))
    );
    
    // Si es solo recarga, no renderizar (no debería pasar, pero por seguridad)
    if (hasGiftCardReload && !isRemesa) {
        const allAreGiftCardReloads = order.line_items.every(item => {
            const isGiftCardReload = (item.note && item.note.includes('Recarga Tarjeta')) || 
                                    (item.name && item.name.includes('Recarga Tarjeta'));
            return isGiftCardReload;
        });
        if (allAreGiftCardReloads) {
            // No renderizar recargas de tarjetas
            return null;
        }
    }
    
    const card = document.createElement('div');
    card.className = isRemesa ? 'order-card order-card-remesa' : 'order-card';

    const orderDate = new Date(order.created_at);
    const formattedDate = orderDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const totalAmount = order.total_money ? (order.total_money.amount / 100).toFixed(2) : '0.00';
    // Obtener el estado del fulfillment (más preciso que el estado de la orden)
    const fulfillmentState = getFulfillmentState(order);
    
    // Para remesas, usar estados diferentes
    let stateText, stateClass, progressTimeline;
    if (isRemesa) {
        stateText = getRemesaStateText(fulfillmentState, order.state, isOrderPaidSuccessfully(order));
        stateClass = getRemesaStateClass(fulfillmentState, order.state, isOrderPaidSuccessfully(order));
        progressTimeline = createRemesaProgressTimeline(fulfillmentState, order.state, isOrderPaidSuccessfully(order));
    } else {
        stateText = getOrderStateText(fulfillmentState, order.state);
        stateClass = getOrderStateClass(fulfillmentState, order.state);
        progressTimeline = createOrderProgressTimeline(fulfillmentState, order.state);
    }
    
    const isPaid = isOrderPaidSuccessfully(order);
    const paymentMethod = order.metadata?.payment_method || 'CARD';
    
    // Determinar si el pago fue declinado
    const isDeclined = paymentMethod === 'CARD' && !isPaid && order.state === 'OPEN';

    // Calcular fecha límite de recogida (24 horas desde la creación)
    const orderCreatedDate = new Date(order.created_at);
    const pickupDeadline = new Date(orderCreatedDate.getTime() + (24 * 60 * 60 * 1000));
    const now = new Date();
    const hoursRemaining = Math.max(0, Math.ceil((pickupDeadline - now) / (1000 * 60 * 60)));
    const isCashOrder = paymentMethod === 'CASH';
    const showPickupWarning = isCashOrder && !isPaid && hoursRemaining > 0 && hoursRemaining <= 24;
    
    // Extraer información de la remesa del note
    let remesaInfo = null;
    if (isRemesa && order.line_items) {
        const remesaItem = order.line_items.find(item => item.note && item.note.includes('Remesa'));
        if (remesaItem && remesaItem.note) {
            // Parsear el note para extraer información
            const noteParts = remesaItem.note.split('|');
            remesaInfo = {
                currency: remesaItem.note.includes('USD') ? 'USD' : 'CUP',
                amount: remesaItem.note.match(/\$(\d+\.?\d*)/)?.[1] || '0',
                recipient: noteParts.find(p => p.includes('Recogerá:'))?.replace('Recogerá:', '').trim() || null,
                idNumber: noteParts.find(p => p.includes('CI:'))?.replace('CI:', '').trim() || null
            };
        }
    }
    
    // Si es una remesa, mostrar diseño especial
    if (isRemesa) {
        card.innerHTML = `
            <div class="order-card-header remesa-header">
                <div class="remesa-icon-large">
                    <i class="fas fa-coins"></i>
                </div>
                <div class="order-card-info">
                    <h3 class="order-number remesa-title">Remesa #${order.id}</h3>
                    <p class="order-date">${formattedDate}</p>
                </div>
                <div class="order-status">
                    <span class="order-state remesa-state ${stateClass}">${stateText}</span>
                </div>
            </div>
            ${progressTimeline}
            <div class="remesa-details-section">
                ${remesaInfo ? `
                    <div class="remesa-info-card">
                        <div class="remesa-info-row">
                            <span class="remesa-label">Moneda:</span>
                            <span class="remesa-value">${remesaInfo.currency}</span>
                        </div>
                        <div class="remesa-info-row">
                            <span class="remesa-label">Cantidad enviada:</span>
                            <span class="remesa-value">${remesaInfo.currency === 'USD' ? '$' : '₱'}${remesaInfo.amount}</span>
                        </div>
                        ${remesaInfo.recipient ? `
                            <div class="remesa-info-row">
                                <span class="remesa-label">Recogerá:</span>
                                <span class="remesa-value">${remesaInfo.recipient}</span>
                            </div>
                        ` : ''}
                        ${remesaInfo.idNumber ? `
                            <div class="remesa-info-row">
                                <span class="remesa-label">Carnet de Identidad:</span>
                                <span class="remesa-value">${remesaInfo.idNumber}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="order-card-body">
                <div class="order-items">
                    ${order.line_items ? order.line_items.map(item => `
                        <div class="order-item remesa-item">
                            <i class="fas fa-coins remesa-item-icon"></i>
                            <span class="order-item-name">${item.note || item.name || 'Remesa'}</span>
                            <span class="order-item-price">$${item.total_money ? (item.total_money.amount / 100).toFixed(2) : '0.00'}</span>
                        </div>
                    `).join('') : '<p>No hay items en esta orden</p>'}
                </div>
                <div class="order-card-footer">
                    <div class="order-total">
                        <span>Total:</span>
                        <strong>$${totalAmount} US$</strong>
                    </div>
                    <div class="order-payment-info">
                        <span class="payment-method ${paymentMethod === 'CASH' ? 'payment-method-cash' : 'payment-method-card'}">
                            <i class="fas ${paymentMethod === 'CASH' ? 'fa-money-bill-wave' : 'fa-credit-card'}"></i>
                            <span>${paymentMethod === 'CASH' ? 'Pago en efectivo' : 'Pago con tarjeta'}</span>
                        </span>
                        ${isDeclined ? '<span class="payment-declined">Pago declinado</span>' : ''}
                        ${!isPaid && paymentMethod === 'CASH' && !isDeclined ? '<span class="payment-pending">Pendiente de pago</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    } else {
        card.innerHTML = `
            <div class="order-card-header">
                <div class="order-card-info">
                    <h3 class="order-number">Orden #${order.id}</h3>
                    <p class="order-date">${formattedDate}</p>
                </div>
                <div class="order-status">
                    <span class="order-state ${stateClass}">${stateText}</span>
                </div>
            </div>
            ${progressTimeline}
            ${showPickupWarning ? `
                <div class="order-pickup-warning">
                    <i class="fas fa-clock"></i>
                    <div class="pickup-warning-content">
                        <strong>Tienes ${hoursRemaining} horas para recoger tu pedido</strong>
                        <p>Si no recoges en 24 horas, la orden se cancelará por falta de pago.</p>
                    </div>
                </div>
            ` : ''}
            <div class="order-card-body">
                <div class="order-items">
                    ${order.line_items ? order.line_items.map(item => `
                        <div class="order-item">
                            <span class="order-item-name">${item.name || item.note || 'Producto'}</span>
                            <span class="order-item-quantity">x${item.quantity || 1}</span>
                            <span class="order-item-price">$${item.total_money ? (item.total_money.amount / 100).toFixed(2) : '0.00'}</span>
                        </div>
                    `).join('') : '<p>No hay items en esta orden</p>'}
                </div>
                <div class="order-card-footer">
                    <div class="order-total">
                        <span>Total:</span>
                        <strong>$${totalAmount} US$</strong>
                    </div>
                    <div class="order-payment-info">
                        <span class="payment-method ${paymentMethod === 'CASH' ? 'payment-method-cash' : 'payment-method-card'}">
                            <i class="fas ${paymentMethod === 'CASH' ? 'fa-money-bill-wave' : 'fa-credit-card'}"></i>
                            <span>${paymentMethod === 'CASH' ? 'Pago en efectivo' : 'Pago con tarjeta'}</span>
                        </span>
                        ${isDeclined ? '<span class="payment-declined">Pago declinado</span>' : ''}
                        ${!isPaid && paymentMethod === 'CASH' && !isDeclined ? '<span class="payment-pending">Pendiente de pago</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    return card;
}

/**
 * Obtiene el estado del fulfillment de una orden
 * Esto es más preciso que el estado de la orden para mostrar el progreso
 */
function getFulfillmentState(order) {
    // Si hay fulfillments, usar el primero (normalmente solo hay uno para pickup)
    if (order.fulfillments && order.fulfillments.length > 0) {
        const fulfillment = order.fulfillments[0];
        return fulfillment.state || 'PROPOSED';
    }
    
    // Si no hay fulfillment, usar el estado de la orden como fallback
    return order.state || 'OPEN';
}

/**
 * Mapea el estado del fulfillment a texto legible en español
 */
function getOrderStateText(fulfillmentState, orderState) {
    // Estados del fulfillment (más precisos para el flujo)
    const fulfillmentStates = {
        'PROPOSED': 'PENDIENTE',      // Orden creada, esperando preparación
        'RESERVED': 'PROCESANDO',     // Empleado empezó a preparar
        'PREPARED': 'LISTO',          // Orden lista para recoger
        'COMPLETED': 'RECOGIDO',      // Cliente recogió la orden
        'CANCELED': 'CANCELADA',      // Orden cancelada
        'FAILED': 'FALLIDA'           // Orden fallida
    };
    
    // Si tenemos un estado de fulfillment, usarlo
    if (fulfillmentStates[fulfillmentState]) {
        return fulfillmentStates[fulfillmentState];
    }
    
    // Fallback a estados de orden (si no hay fulfillment)
    const orderStates = {
        'OPEN': 'PENDIENTE',
        'COMPLETED': 'COMPLETADA',
        'CANCELED': 'CANCELADA',
        'DRAFT': 'BORRADOR'
    };
    
    return orderStates[orderState] || fulfillmentState || 'PENDIENTE';
}

/**
 * Obtiene el estado de texto para una remesa
 */
function getRemesaStateText(fulfillmentState, orderState, isPaid) {
    if (!isPaid) {
        return 'PROCESÁNDOSE';
    }
    
    // Si está pagada, verificar el estado del fulfillment
    const remesaStates = {
        'PROPOSED': 'PROCESÁNDOSE',      // Remesa pagada, procesándose
        'RESERVED': 'PROCESÁNDOSE',      // Remesa en proceso
        'PREPARED': 'COBRADA EXITOSAMENTE', // Remesa lista para recoger
        'COMPLETED': 'PAGADA Y ENVIADA',   // Remesa completada/recogida
        'CANCELED': 'CANCELADA',
        'FAILED': 'FALLIDA'
    };
    
    if (remesaStates[fulfillmentState]) {
        return remesaStates[fulfillmentState];
    }
    
    // Si está pagada pero no hay fulfillment específico
    if (isPaid && orderState === 'COMPLETED') {
        return 'PAGADA Y ENVIADA';
    }
    
    return 'PROCESÁNDOSE';
}

/**
 * Obtiene la clase CSS para el estado de una remesa
 */
function getRemesaStateClass(fulfillmentState, orderState, isPaid) {
    if (!isPaid) {
        return 'remesa-processing';
    }
    
    if (fulfillmentState === 'COMPLETED' || orderState === 'COMPLETED') {
        return 'remesa-completed';
    }
    
    if (fulfillmentState === 'PREPARED') {
        return 'remesa-ready';
    }
    
    return 'remesa-processing';
}

/**
 * Crea la línea de progreso para una remesa
 */
function createRemesaProgressTimeline(fulfillmentState, orderState, isPaid) {
    const steps = [
        { id: 'processing', label: 'PROCESÁNDOSE', icon: 'fa-cog', active: !isPaid || fulfillmentState === 'PROPOSED' || fulfillmentState === 'RESERVED' },
        { id: 'paid', label: 'COBRADA EXITOSAMENTE', icon: 'fa-check-circle', active: isPaid && (fulfillmentState === 'PREPARED' || fulfillmentState === 'COMPLETED') },
        { id: 'sent', label: 'PAGADA Y ENVIADA', icon: 'fa-paper-plane', active: fulfillmentState === 'COMPLETED' || orderState === 'COMPLETED' }
    ];
    
    let html = '<div class="order-progress-tracker remesa-progress">';
    
    steps.forEach((step, index) => {
        const isActive = step.active;
        const isPast = steps.slice(0, index).some(s => s.active);
        
        html += `
            <div class="progress-step ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}">
                <div class="step-icon">
                    <i class="fas ${step.icon}"></i>
                </div>
                <div class="step-label">${step.label}</div>
            </div>
        `;
        
        if (index < steps.length - 1) {
            html += `<div class="progress-line ${isActive || isPast ? 'filled' : ''}"></div>`;
        }
    });
    
    html += '</div>';
    return html;
}

/**
 * Mapea el estado a una clase CSS para estilos
 */
function getOrderStateClass(fulfillmentState, orderState) {
    // Clases según el estado del fulfillment
    const fulfillmentClasses = {
        'PROPOSED': 'state-pending',      // Amarillo
        'RESERVED': 'state-processing',   // Azul
        'PREPARED': 'state-ready',        // Verde claro
        'COMPLETED': 'state-completed',   // Verde
        'CANCELED': 'state-canceled',    // Rojo
        'FAILED': 'state-failed'          // Rojo
    };
    
    // Si tenemos un estado de fulfillment, usarlo
    if (fulfillmentClasses[fulfillmentState]) {
        return fulfillmentClasses[fulfillmentState];
    }
    
    // Fallback a estados de orden
    const orderClasses = {
        'OPEN': 'state-pending',
        'COMPLETED': 'state-completed',
        'CANCELED': 'state-canceled',
        'DRAFT': 'state-draft'
    };
    
    return orderClasses[orderState] || 'state-pending';
}

function getOrderProgressStep(fulfillmentState, orderState) {
    const fulfillmentSteps = {
        'PROPOSED': 0,
        'RESERVED': 1,
        'PREPARED': 2,
        'COMPLETED': 3
    };

    if (fulfillmentSteps[fulfillmentState] !== undefined) {
        return fulfillmentSteps[fulfillmentState];
    }

    const orderSteps = {
        'OPEN': 0,
        'COMPLETED': 3
    };

    return orderSteps[orderState] !== undefined ? orderSteps[orderState] : 0;
}

function createOrderProgressTimeline(fulfillmentState, orderState) {
    const isCanceled = fulfillmentState === 'CANCELED' || orderState === 'CANCELED';
    const isFailed = fulfillmentState === 'FAILED';
    const currentStep = getOrderProgressStep(fulfillmentState, orderState);
    const steps = [
        { label: 'Pendiente', icon: 'fa-receipt' },
        { label: 'Procesando', icon: 'fa-box-open' },
        { label: 'Listo', icon: 'fa-check-circle' },
        { label: 'Recogido', icon: 'fa-handshake' }
    ];

    const timelineClass = isCanceled || isFailed ? ' order-progress-canceled' : '';
    const timeline = steps.map((step, index) => {
        const activeClass = index <= currentStep ? 'is-active' : '';
        const currentClass = index === currentStep ? 'is-current' : '';
        return `
            <div class="order-progress-step ${activeClass} ${currentClass}">
                <div class="order-progress-dot">
                    <i class="fas ${step.icon}"></i>
                </div>
                <span class="order-progress-label">${step.label}</span>
            </div>
        `;
    }).join('');

    const canceledNote = (isCanceled || isFailed)
        ? `<div class="order-progress-warning">Esta orden fue ${isFailed ? 'marcada como fallida' : 'cancelada'}.</div>`
        : '';

    return `
        <div class="order-progress-timeline${timelineClass}">
            ${timeline}
        </div>
        ${canceledNote}
    `;
}
