// Página de Checkout con Square Payments
function getCart() {
    if (!Array.isArray(window.shoppingCart)) {
        window.shoppingCart = JSON.parse(localStorage.getItem('tropiplus_cart')) || [];
    }
    return window.shoppingCart;
}

function saveCart(cart) {
    window.shoppingCart = cart;
    localStorage.setItem('tropiplus_cart', JSON.stringify(cart));
}
let payments;
let cardInstance = null;

// Función auxiliar para obtener imagen
async function getCheckoutItemImageUrl(imageId) {
    if (typeof getCachedProductImageUrl === 'function') {
        return await getCachedProductImageUrl(imageId);
    }
    if (imageId && typeof squareApiCall === 'function') {
        try {
            const response = await squareApiCall(`/v2/catalog/object/${imageId}`, 'GET');
            if (response && response.object && response.object.image_data) {
                return response.object.image_data.url;
            }
        } catch (error) {
            console.warn('Error obteniendo imagen:', error);
        }
    }
    return 'images/placeholder.svg';
}

function loadSquareSdk() {
    if (typeof Square !== 'undefined') {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        if (typeof SQUARE_CONFIG === 'undefined') {
            reject(new Error('Configuración de Square no disponible'));
            return;
        }
        const isProd = SQUARE_CONFIG.environment === 'production';
        const scriptSrc = isProd
            ? 'https://web.squarecdn.com/v1/square.js'
            : 'https://sandbox.web.squarecdn.com/v1/square.js';

        const existing = document.querySelector(`script[src="${scriptSrc}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Error cargando Square SDK')));
            return;
        }

        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Error cargando Square SDK'));
        document.head.appendChild(script);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 Checkout page DOMContentLoaded');
    console.log('📍 URL actual:', window.location.href);
    
    // IMPORTANTE: Recargar el carrito desde localStorage
    const cartFromStorage = localStorage.getItem('tropiplus_cart');
    console.log('📦 localStorage.getItem("tropiplus_cart"):', cartFromStorage);
    
    if (cartFromStorage) {
        try {
            saveCart(JSON.parse(cartFromStorage));
            console.log('✅ Carrito parseado correctamente');
            console.log('📊 Número de items:', getCart().length);
            console.log('🛒 Carrito completo:', JSON.stringify(getCart(), null, 2));
        } catch (e) {
            console.error('❌ Error parseando carrito:', e);
            console.error('❌ Contenido del localStorage:', cartFromStorage);
            saveCart([]);
        }
    } else {
        saveCart([]);
        console.warn('⚠️ localStorage está vacío o no existe "tropiplus_cart"');
        console.warn('⚠️ Todas las keys en localStorage:', Object.keys(localStorage));
    }
    
    console.log('💳 Checkout inicializado con:', getCart().length, 'items');
    
    // Verificar que hay items en el carrito
    if (!getCart() || getCart().length === 0) {
        console.warn('⚠️ Carrito vacío, redirigiendo...');
        setTimeout(() => {
            alert('Tu carrito está vacío. Redirigiendo al carrito...');
            window.location.href = 'cart.html';
        }, 100);
        return;
    }

    // Renderizar items del pedido primero
    renderCheckoutItems().then(() => {
        updateCheckoutSummary();
        updateCartCount();
    });
    
    // Inicializar selector de método de entrega
    initDeliveryMethodSelector();
    
    // Inicializar Square Payments después de cargar el SDK
    const statusContainer = document.getElementById('payment-status-container');
    loadSquareSdk()
        .then(() => {
            setTimeout(() => {
                // Verificar que Square SDK esté cargado
                if (typeof Square === 'undefined') {
                    console.error('❌ Square Web Payments SDK no está cargado');
                    if (statusContainer) {
                        statusContainer.innerHTML = `
                            <div class="payment-error">
                                <i class="fas fa-exclamation-circle"></i>
                                Error: Square Payments SDK no está disponible. Por favor, recarga la página.
                            </div>
                        `;
                    }
                    return;
                }

                // Verificar configuración
                if (typeof SQUARE_CONFIG === 'undefined' || !SQUARE_CONFIG.applicationId || !SQUARE_CONFIG.locationId) {
                    console.error('❌ Configuración de Square incompleta');
                    if (statusContainer) {
                        statusContainer.innerHTML = `
                            <div class="payment-error">
                                <i class="fas fa-exclamation-circle"></i>
                                Error: Configuración de Square incompleta. Por favor, contacta al administrador.
                            </div>
                        `;
                    }
                    return;
                }

                console.log('✅ Square SDK cargado, inicializando pagos...');
                console.log('📋 Configuración:', {
                    applicationId: SQUARE_CONFIG.applicationId.substring(0, 10) + '...',
                    locationId: SQUARE_CONFIG.locationId,
                    environment: SQUARE_CONFIG.environment
                });

                // Inicializar Square Payments
                try {
                    payments = Square.payments(SQUARE_CONFIG.applicationId, SQUARE_CONFIG.locationId);
                    console.log('✅ Square Payments inicializado');
                    initializePaymentForm();
                } catch (error) {
                    console.error('❌ Error inicializando Square Payments:', error);
                    if (statusContainer) {
                        statusContainer.innerHTML = `
                            <div class="payment-error">
                                <i class="fas fa-exclamation-circle"></i>
                                Error inicializando el sistema de pagos: ${error.message}
                                <br><small>Por favor, recarga la página o intenta más tarde.</small>
                            </div>
                        `;
                    }
                }
            }, 200);
        })
        .catch((error) => {
            console.error('❌ Error cargando Square SDK:', error);
            if (statusContainer) {
                statusContainer.innerHTML = `
                    <div class="payment-error">
                        <i class="fas fa-exclamation-circle"></i>
                        Error al cargar el formulario de pago. Por favor, recarga la página.
                    </div>
                `;
            }
        });
});

async function renderCheckoutItems() {
    const itemsList = document.getElementById('checkout-items-list');
    if (!itemsList) {
        console.error('❌ No se encontró el elemento checkout-items-list');
        return;
    }

    // Recargar carrito una vez más antes de renderizar
    const cartFromStorage = localStorage.getItem('tropiplus_cart');
    if (cartFromStorage) {
        try {
            saveCart(JSON.parse(cartFromStorage));
            console.log('🔄 Carrito recargado antes de renderizar:', getCart().length, 'items');
        } catch (e) {
            console.error('❌ Error parseando carrito:', e);
        }
    }

    console.log('🛒 Renderizando', getCart().length, 'items en checkout');
    console.log('📦 Items a renderizar:', JSON.stringify(getCart(), null, 2));
    
    if (!getCart() || getCart().length === 0) {
        console.warn('⚠️ Carrito vacío en renderCheckoutItems');
        itemsList.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--gray-text);">No hay items en el carrito</p>';
        return;
    }

    let html = '';
    
    for (const item of getCart()) {
        console.log('📦 Renderizando item:', item);
        const itemPrice = item.price || 0;
        const itemQuantity = item.quantity || 1;
        const itemTotal = itemPrice * itemQuantity;
        
        // Si es una recarga de tarjeta, mostrar icono
        if (item.type === 'giftcard_reload') {
            html += `
                <div class="checkout-item-row">
                    <div class="checkout-item-icon-wrapper giftcard-icon-cart">
                        <i class="fas fa-gift"></i>
                    </div>
                    <div class="checkout-item-info">
                        <div class="checkout-item-name">${item.name || 'Recarga de tarjeta'}</div>
                        <div class="checkout-item-details">$${itemPrice.toFixed(2)} x ${itemQuantity}</div>
                    </div>
                    <div class="checkout-item-total">$${itemTotal.toFixed(2)}</div>
                </div>
            `;
        } else if (item.type === 'remesa') {
            // Si es una remesa, mostrar icono de monedas
            html += `
                <div class="checkout-item-row">
                    <div class="checkout-item-icon-wrapper remesa-icon-cart">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="checkout-item-info">
                        <div class="checkout-item-name">${item.name || 'Remesa'}</div>
                        <div class="checkout-item-details">$${itemPrice.toFixed(2)} x ${itemQuantity}</div>
                    </div>
                    <div class="checkout-item-total">$${itemTotal.toFixed(2)}</div>
                </div>
            `;
        } else {
            // Producto normal con imagen
            let imageUrl = 'images/placeholder.svg';
            if (item.image) {
                try {
                    imageUrl = await getCheckoutItemImageUrl(item.image) || 'images/placeholder.svg';
                } catch (error) {
                    console.warn('Error cargando imagen para', item.name, error);
                    imageUrl = 'images/placeholder.svg';
                }
            }
            
            html += `
                <div class="checkout-item-row">
                    <img src="${imageUrl}" alt="${item.name}" class="checkout-item-image">
                    <div class="checkout-item-info">
                        <div class="checkout-item-name">${item.name || 'Producto sin nombre'}</div>
                        <div class="checkout-item-details">$${itemPrice.toFixed(2)} x ${itemQuantity}</div>
                    </div>
                    <div class="checkout-item-total">$${itemTotal.toFixed(2)}</div>
                </div>
            `;
        }
    }

    itemsList.innerHTML = html;
    console.log('✅ Items renderizados en checkout');
}

function updateCheckoutSummary() {
    console.log('💰 Calculando totales del carrito:', getCart());
    
    const subtotal = getCart().reduce((sum, item) => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        console.log(`  - ${item.name}: $${item.price} x ${item.quantity} = $${itemTotal}`);
        return sum + itemTotal;
    }, 0);
    
    const total = subtotal; // Sin impuestos ni envío
    
    console.log('💰 Subtotal calculado:', subtotal);
    console.log('💰 Total calculado:', total);

    const checkoutSubtotal = document.getElementById('checkout-subtotal');
    const checkoutTotal = document.getElementById('checkout-total');
    const paymentAmount = document.getElementById('payment-amount');

    if (checkoutSubtotal) {
        checkoutSubtotal.textContent = `${subtotal.toFixed(2)} US$`;
        console.log('✅ Subtotal actualizado en DOM');
    }
    if (checkoutTotal) {
        checkoutTotal.textContent = `${total.toFixed(2)} US$`;
        console.log('✅ Total actualizado en DOM');
    }
    if (paymentAmount) {
        paymentAmount.textContent = total.toFixed(2);
        console.log('✅ Monto de pago actualizado en DOM');
    }
}

async function initializePaymentForm() {
    try {
        console.log('💳 Inicializando formulario de pago...');
        
        // Verificar si hay remesas o recargas de tarjetas en el carrito
        const cart = getCart();
        const hasRemesa = cart.some(item => item.type === 'remesa');
        const hasGiftCardReload = cart.some(item => item.type === 'giftcard_reload');
        const requiresCardOnly = hasRemesa || hasGiftCardReload;
        
        // Ocultar información de recogida si hay recargas de tarjetas (no se recogen físicamente)
        const pickupInfoSection = document.querySelector('.checkout-pickup-info');
        const pickupInfoTitle = document.querySelector('.checkout-section-title');
        if (hasGiftCardReload) {
            // Ocultar toda la sección de información de recogida
            if (pickupInfoSection) {
                pickupInfoSection.style.display = 'none';
            }
            // Buscar el título que contiene "Información de Recogida"
            const allTitles = document.querySelectorAll('.checkout-section-title');
            allTitles.forEach(title => {
                if (title.textContent.includes('Información de Recogida')) {
                    title.style.display = 'none';
                }
            });
        } else {
            if (pickupInfoSection) {
                pickupInfoSection.style.display = 'block';
            }
            const allTitles = document.querySelectorAll('.checkout-section-title');
            allTitles.forEach(title => {
                if (title.textContent.includes('Información de Recogida')) {
                    title.style.display = 'block';
                }
            });
        }
        
        // Selector de método de pago
        const paymentMethodInputs = document.querySelectorAll('input[name="payment-method"]');
        const cardSection = document.getElementById('card-container');
        const cashSection = document.getElementById('cash-payment-section');
        const statusContainer = document.getElementById('payment-status-container');
        const form = document.getElementById('payment-form');
        const cardRadio = document.querySelector('input[name="payment-method"][value="CARD"]');
        const cashRadio = document.querySelector('input[name="payment-method"][value="CASH"]');
        const cashRadioLabel = cashRadio ? cashRadio.closest('label.payment-method-option') : null;
        
        // Si hay remesas o recargas, ocultar opción de efectivo y forzar tarjeta
        if (requiresCardOnly) {
            console.log('💳 Carrito contiene remesas o recargas - solo se permite pago con tarjeta');
            
            // Ocultar opción de efectivo
            if (cashRadioLabel) {
                cashRadioLabel.style.display = 'none';
            }
            if (cashRadio) {
                cashRadio.disabled = true;
                cashRadio.checked = false;
            }
            
            // Forzar selección de tarjeta
            if (cardRadio) {
                cardRadio.checked = true;
                cardRadio.disabled = false;
            }
            
            // Ocultar sección de efectivo
            if (cashSection) {
                cashSection.style.display = 'none';
            }
            
            // Mostrar sección de tarjeta
            if (cardSection) {
                cardSection.style.display = 'block';
            }
            
            // Mostrar mensaje informativo
            if (statusContainer) {
                let messageText = '';
                if (hasRemesa && hasGiftCardReload) {
                    messageText = 'Las remesas y recargas de tarjetas solo se pueden pagar con tarjeta de crédito/débito.';
                } else if (hasRemesa) {
                    messageText = 'Las remesas solo se pueden pagar con tarjeta de crédito/débito.';
                } else if (hasGiftCardReload) {
                    messageText = 'Las recargas de tarjetas solo se pueden pagar con tarjeta de crédito/débito.';
                }
                
                statusContainer.innerHTML = `
                    <div class="payment-info-message">
                        <i class="fas fa-info-circle"></i>
                        <span>${messageText}</span>
                    </div>
                `;
            }
        } else {
            // Mostrar mensaje de carga inicial solo si no hay restricciones
            if (statusContainer) {
                statusContainer.innerHTML = '<div class="payment-loading"><i class="fas fa-spinner fa-spin"></i> Cargando formulario de pago...</div>';
            }
        }
        
        paymentMethodInputs.forEach(input => {
            input.addEventListener('change', () => {
                // Si hay remesas o recargas, no permitir cambiar a efectivo
                if (requiresCardOnly && input.value === 'CASH') {
                    if (cardRadio) cardRadio.checked = true;
                    if (typeof showModal === 'function') {
                        showModal('Pago requerido', 'Las remesas y recargas de tarjetas solo se pueden pagar con tarjeta de crédito/débito.', 'warning');
                    }
                    return;
                }
                
                const saveCardOption = document.getElementById('save-card-option');
                if (input.value === 'CARD') {
                    if (cardSection) cardSection.style.display = 'block';
                    if (cashSection) cashSection.style.display = 'none';
                    if (saveCardOption) saveCardOption.style.display = 'block';
                } else {
                    if (cardSection) cardSection.style.display = 'none';
                    if (cashSection) cashSection.style.display = 'block';
                    if (saveCardOption) saveCardOption.style.display = 'none';
                }
            });
        });

        // Intentar inicializar tarjeta (si falla, dejamos solo efectivo)
        try {
            // Verificar que Square esté disponible
            if (typeof Square === 'undefined') {
                throw new Error('Square Web Payments SDK no está cargado');
            }

            // Verificar configuración
            if (!SQUARE_CONFIG || !SQUARE_CONFIG.applicationId || !SQUARE_CONFIG.locationId) {
                throw new Error('Configuración de Square incompleta');
            }

            console.log('✅ Square SDK disponible, creando formulario de tarjeta...');

            // Crear el contenedor de la tarjeta
            // Nota: Square solo acepta ciertos selectores CSS. Usamos estilos mínimos válidos.
            cardInstance = await payments.card({
                style: {
                    '.input-container': {
                        borderColor: '#e0e0e0',
                        borderRadius: '6px'
                    }
                }
            });
            
            await cardInstance.attach('#card-container');
            console.log('✅ Formulario de tarjeta creado y adjuntado');
            
            // Mostrar opción de guardar tarjeta
            const saveCardOption = document.getElementById('save-card-option');
            if (saveCardOption) {
                saveCardOption.style.display = 'block';
            }

            // Limpiar mensaje de carga
            if (statusContainer) {
                statusContainer.innerHTML = '';
            }
        } catch (error) {
            console.error('Error inicializando tarjeta:', error);
            if (statusContainer) {
                statusContainer.innerHTML = `
                    <div class="payment-error">
                        <i class="fas fa-exclamation-circle"></i>
                        Error inicializando tarjeta: ${error.message}
                        <br><small>Si eliges efectivo, puedes continuar sin tarjeta.</small>
                    </div>
                `;
            }
            // Verificar si hay remesas o recargas - si las hay, no permitir efectivo
            const cart = getCart();
            const hasRemesa = cart.some(item => item.type === 'remesa');
            const hasGiftCardReload = cart.some(item => item.type === 'giftcard_reload');
            const requiresCardOnly = hasRemesa || hasGiftCardReload;
            
            if (requiresCardOnly) {
                // Si hay remesas o recargas, mostrar error pero no permitir efectivo
                if (statusContainer) {
                    statusContainer.innerHTML = `
                        <div class="payment-error">
                            <i class="fas fa-exclamation-circle"></i>
                            Error inicializando tarjeta: ${error.message}
                            <br><small>Las remesas y recargas de tarjetas requieren pago con tarjeta. Por favor, recarga la página o verifica tu conexión.</small>
                        </div>
                    `;
                }
                // Mantener tarjeta seleccionada y deshabilitar efectivo
                if (cardRadio) {
                    cardRadio.checked = true;
                    cardRadio.disabled = false;
                }
                if (cashRadio) {
                    cashRadio.disabled = true;
                    cashRadio.checked = false;
                }
                if (cashSection) cashSection.style.display = 'none';
                if (cardSection) cardSection.style.display = 'block';
            } else {
                // Solo deshabilitar tarjeta y seleccionar efectivo si NO hay remesas/recargas
                if (cardRadio) cardRadio.disabled = true;
                if (cashRadio) {
                    cashRadio.checked = true;
                    if (cardSection) cardSection.style.display = 'none';
                    if (cashSection) cashSection.style.display = 'block';
                }
            }
        }

        // Manejar el envío del formulario (siempre)
        if (form && !form.dataset.boundSubmit) {
            form.dataset.boundSubmit = 'true';
            form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const submitButton = document.getElementById('card-button');
            const statusContainer = document.getElementById('payment-status-container');
            const selectedPaymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
            
            if (!selectedPaymentMethod) {
                if (typeof showModal === 'function') {
                    showModal('Método de pago requerido', 'Por favor, selecciona un método de pago', 'warning');
                } else {
                    alert('Por favor, selecciona un método de pago');
                }
                return;
            }
            
            // Verificar que si hay remesas o recargas, solo se permita tarjeta
            const cart = getCart();
            const hasRemesa = cart.some(item => item.type === 'remesa');
            const hasGiftCardReload = cart.some(item => item.type === 'giftcard_reload');
            const requiresCardOnly = hasRemesa || hasGiftCardReload;
            
            if (requiresCardOnly && selectedPaymentMethod !== 'CARD') {
                if (typeof showModal === 'function') {
                    showModal('Pago requerido', 'Las remesas y recargas de tarjetas solo se pueden pagar con tarjeta de crédito/débito.', 'warning');
                } else {
                    alert('Las remesas y recargas de tarjetas solo se pueden pagar con tarjeta de crédito/débito.');
                }
                // Forzar selección de tarjeta
                const cardRadio = document.querySelector('input[name="payment-method"][value="CARD"]');
                if (cardRadio) cardRadio.checked = true;
                return;
            }
            
            console.log('💳 Método de pago seleccionado:', selectedPaymentMethod);

            try {
                // Verificar que el usuario esté logueado
                if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
                    alert('Debes iniciar sesión para realizar un pedido');
                    window.location.href = 'login.html';
                    return;
                }

                const user = getCurrentUser();
                if (!user || !user.id) {
                    alert('Usuario no encontrado. Por favor, inicia sesión nuevamente.');
                    window.location.href = 'login.html';
                    return;
                }

                // Deshabilitar el botón
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

                let paymentToken = null;

                if (selectedPaymentMethod === 'CARD') {
                    // Verificar que card esté disponible
                    if (!cardInstance) {
                        throw new Error('Formulario de tarjeta no está inicializado. Por favor, recarga la página.');
                    }
                    
                    console.log('💳 Tokenizando tarjeta...');
                    // Obtener el token de la tarjeta
                    const tokenResult = await cardInstance.tokenize();
                    console.log('📋 Resultado de tokenización:', tokenResult);
                    
                    if (tokenResult.status === 'OK') {
                        paymentToken = tokenResult.token;
                        console.log('✅ Token de pago obtenido:', paymentToken.substring(0, 20) + '...');
                        
                        // Verificar si el usuario quiere guardar la tarjeta
                        const saveCardCheckbox = document.getElementById('save-card-checkbox');
                        if (saveCardCheckbox && saveCardCheckbox.checked) {
                            console.log('💾 Guardando tarjeta para uso futuro...');
                            try {
                                await saveCardForFutureUse(paymentToken, user.id);
                                console.log('✅ Tarjeta guardada exitosamente');
                            } catch (saveError) {
                                console.warn('⚠️ No se pudo guardar la tarjeta, pero el pago continuará:', saveError);
                                // No lanzamos error, solo continuamos con el pago
                            }
                        }
                    } else {
                        let errorMessage = `Error al procesar la tarjeta: ${tokenResult.status}`;
                        if (tokenResult.errors && tokenResult.errors.length > 0) {
                            errorMessage = tokenResult.errors[0].detail || errorMessage;
                        }
                        throw new Error(errorMessage);
                    }
                }

                // Separar recargas de tarjetas del resto del carrito
                const cart = getCart();
                const giftCardReloads = cart.filter(item => item.type === 'giftcard_reload');
                const regularItems = cart.filter(item => item.type !== 'giftcard_reload');
                
                // Procesar recargas de tarjetas directamente (sin crear orden)
                if (giftCardReloads.length > 0) {
                    console.log('💳 Procesando recargas de tarjeta directamente...');
                    for (const reloadItem of giftCardReloads) {
                        try {
                            // Procesar pago para la recarga
                            const reloadAmount = reloadItem.price * reloadItem.quantity;
                            const reloadAmountInCents = Math.round(reloadAmount * 100);
                            
                            let reloadPaymentToken = paymentToken;
                            
                            // Si es pago en efectivo, no necesitamos token
                            if (selectedPaymentMethod === 'CASH') {
                                // Para cash, crear un pago directo sin orden
                                if (typeof processGiftCardReloadDirectly === 'function') {
                                    await processGiftCardReloadDirectly(reloadItem, reloadAmountInCents, selectedPaymentMethod, null, user.id);
                                } else {
                                    throw new Error('Función de recarga no disponible');
                                }
                            } else {
                                // Para tarjeta, usar el mismo token
                                if (typeof processGiftCardReloadDirectly === 'function') {
                                    await processGiftCardReloadDirectly(reloadItem, reloadAmountInCents, selectedPaymentMethod, reloadPaymentToken, user.id);
                                } else {
                                    throw new Error('Función de recarga no disponible');
                                }
                            }
                            
                            console.log('✅ Recarga procesada exitosamente:', reloadItem.giftCardGan);
                        } catch (error) {
                            console.error('❌ Error procesando recarga:', error);
                            throw new Error(`Error al procesar recarga de tarjeta: ${error.message}`);
                        }
                    }
                    
                    // Remover recargas del carrito después de procesarlas
                    const updatedCart = getCart().filter(item => item.type !== 'giftcard_reload');
                    saveCart(updatedCart);
                }
                
                // Procesar productos regulares (crear orden solo si hay productos)
                if (regularItems.length > 0) {
                    await processPayment(selectedPaymentMethod, paymentToken, user.id);
                } else if (giftCardReloads.length > 0) {
                    // Si solo había recargas, mostrar mensaje de éxito
                    statusContainer.innerHTML = `
                        <div class="payment-success">
                            <i class="fas fa-check-circle"></i>
                            <h3>¡Recarga exitosa!</h3>
                            <p>Las tarjetas han sido recargadas correctamente.</p>
                        </div>
                    `;
                    
                    // Redirigir después de 2 segundos
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                    return;
                }
                
                // Si llegamos aquí, el pago fue exitoso, no hay error
                
            } catch (error) {
                console.error('Error procesando pago:', error);
                const friendlyMessage = error.userMessage || error.message || 'Error desconocido';
                
                // Restaurar botón inmediatamente
                submitButton.disabled = false;
                const paymentAmount = document.getElementById('payment-amount')?.textContent || '0.00';
                submitButton.innerHTML = `<i class="fas fa-lock"></i> Confirmar Pedido <span id="payment-amount">${paymentAmount}</span> US$`;
                
                // Mostrar error en modal
                showPaymentErrorModal(friendlyMessage);
            }
            });
        }
    } catch (error) {
        console.error('Error inicializando formulario de pago:', error);
        document.getElementById('payment-status-container').innerHTML = `
            <div class="payment-error">
                <i class="fas fa-exclamation-circle"></i>
                Error al inicializar el formulario de pago: ${error.message}
            </div>
        `;
    }
}

async function processPayment(paymentMethod, paymentToken, customerId) {
    const statusContainer = document.getElementById('payment-status-container');
    const submitButton = document.getElementById('card-button');
    
    try {
        // Filtrar recargas - no deben estar en la verificación de inventario ni en la orden
        const cart = getCart().filter(item => item.type !== 'giftcard_reload');
        
        if (cart.length === 0) {
            throw new Error('No hay productos para procesar');
        }
        
        // Verificar inventario antes de procesar el pago
        const outOfStockItems = [];
        const lowStockItems = [];
        
        for (const item of cart) {
            if (item.variationId && typeof isProductAvailable === 'function') {
                try {
                    // Buscar el producto completo
                    let product = null;
                    if (typeof squareProducts !== 'undefined' && Array.isArray(squareProducts)) {
                        product = squareProducts.find(p => {
                            const variation = p.item_data?.variations?.[0];
                            return variation?.id === item.variationId;
                        });
                    }
                    
                    // Si no se encuentra, buscar desde Square API
                    if (!product && item.id) {
                        try {
                            const response = await squareApiCall(`/v2/catalog/object/${item.id}`, 'GET');
                            if (response && response.object) {
                                product = response.object;
                            }
                        } catch (error) {
                            console.warn('Error obteniendo producto para verificar inventario:', error);
                        }
                    }
                    
                    if (product) {
                        const availability = await isProductAvailable(product);
                        if (!availability.available) {
                            outOfStockItems.push(item.name);
                        } else if (availability.quantity !== null && item.quantity > availability.quantity) {
                            lowStockItems.push({
                                name: item.name,
                                requested: item.quantity,
                                available: availability.quantity
                            });
                        }
                    }
                } catch (error) {
                    console.warn('Error verificando inventario para', item.name, error);
                }
            }
        }
        
        if (outOfStockItems.length > 0) {
            throw new Error(`Los siguientes productos se han agotado: ${outOfStockItems.join(', ')}. Por favor, elimínalos del carrito.`);
        }
        
        if (lowStockItems.length > 0) {
            const lowStockMessage = lowStockItems.map(item => 
                `${item.name}: solicitaste ${item.requested}, solo hay ${item.available} disponibles`
            ).join('\n');
            throw new Error(`Stock insuficiente para:\n${lowStockMessage}\n\nPor favor, ajusta las cantidades.`);
        }
        
        // Calcular el total
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        console.log('🛒 Creando orden en Square con:', {
            items: cart.length,
            total: totalAmount,
            paymentMethod: paymentMethod,
            customerId: customerId
        });

        // Obtener método de entrega y destinatario
        const deliveryMethod = getSelectedDeliveryMethod();
        let deliveryRecipient = null;
        
        if (deliveryMethod === 'delivery') {
            deliveryRecipient = await getSelectedDeliveryRecipient();
            if (!deliveryRecipient) {
                throw new Error('Debe seleccionar una dirección de entrega');
            }
        }
        
        // Crear la orden en Square
        const order = await createSquareOrder(
            getCart(),
            customerId,
            paymentMethod,
            paymentToken,
            deliveryMethod,
            deliveryRecipient
        );

        if (!order || !order.id) {
            throw new Error('No se pudo crear la orden en Square');
        }

        console.log('✅ Orden creada exitosamente:', order.id);

        // Detectar y guardar remesas en Supabase
        const cart = getCart();
        const remesas = cart.filter(item => item.type === 'remesa' && item.remesaData);
        const confirmationCodes = [];
        
        if (remesas.length > 0 && typeof window.saveRemesaToSupabase === 'function') {
            const user = getCurrentUser();
            const currencyConfig = typeof window.getCurrencyConfig === 'function' ? window.getCurrencyConfig() : { exchangeRate: 500, enabled: true };
            
            for (const remesaItem of remesas) {
                try {
                    const remesaData = {
                        orderId: order.id,
                        senderCustomerId: user?.id || null,
                        senderName: user ? [user.given_name, user.family_name].filter(Boolean).join(' ').trim() || user.name || user.email : 'Usuario',
                        senderEmail: user?.email || null,
                        recipientName: remesaItem.remesaData.recipientName,
                        recipientId: remesaItem.remesaData.recipientId || null,
                        amount: remesaItem.remesaData.amount,
                        currency: remesaItem.remesaData.currency || 'USD',
                        fee: remesaItem.remesaData.fee,
                        total: remesaItem.remesaData.total,
                        exchangeRate: currencyConfig.enabled ? currencyConfig.exchangeRate : null
                    };
                    
                    const savedRemesa = await window.saveRemesaToSupabase(remesaData);
                    if (savedRemesa && savedRemesa.confirmation_code) {
                        confirmationCodes.push(savedRemesa.confirmation_code);
                        console.log('✅ Remesa guardada con código:', savedRemesa.confirmation_code);
                    }
                } catch (error) {
                    console.error('❌ Error guardando remesa:', error);
                    // No bloquear el flujo si falla guardar la remesa
                }
            }
        }

        // Si es pago en efectivo, mostrar modal de 24 horas
        if (paymentMethod === 'CASH') {
            showCashPickupModal(order.id);
        }

        // Mostrar mensaje de éxito (con códigos de confirmación si hay remesas)
        const paymentMethodText = paymentMethod === 'CARD' ? 'con tarjeta' : 'en efectivo (al recoger)';
        let remesaConfirmationHtml = '';
        
        if (confirmationCodes.length > 0) {
            remesaConfirmationHtml = `
                <div style="background: #f0f7ff; border-left: 4px solid #42b649; padding: 16px; border-radius: 4px; margin: 16px 0;">
                    <h4 style="margin-top: 0; color: #1f318a; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-key" style="color: #42b649;"></i>
                        Código(s) de Confirmación de Remesa:
                    </h4>
                    ${confirmationCodes.map(code => {
                        const display = typeof window.formatRemesaCodeDisplay === 'function'
                            ? window.formatRemesaCodeDisplay(code)
                            : code;
                        return `
                        <div style="background: white; padding: 12px; border-radius: 4px; margin: 8px 0; border: 2px solid #42b649;">
                            <div style="font-size:12px;color:#666;margin-bottom:4px;">Código de seguridad (dar al familiar)</div>
                            <strong style="font-size: 22px; color: #42b649; letter-spacing: 3px; font-family: monospace;">${display}</strong>
                        </div>`;
                    }).join('')}
                    <p style="margin-bottom: 0; color: #1f318a; font-size: 14px;">
                        <i class="fas fa-info-circle"></i> 
                        <strong>Importante:</strong> El destinatario debe mostrar este código en tienda para cobrar la remesa (como Western Union). 
                        También puedes verlo en <a href="account-remesas.html" style="color: #42b649; font-weight: bold;">Mis Remesas</a>.
                    </p>
                </div>
            `;
        }
        
        statusContainer.innerHTML = `
            <div class="payment-success">
                <i class="fas fa-check-circle"></i>
                <h3>¡Pedido confirmado exitosamente!</h3>
                <p><strong>Número de orden: ${order.id}</strong></p>
                <p>Pago procesado ${paymentMethodText}.</p>
                ${remesaConfirmationHtml}
                <p>Tu pedido ha sido creado y aparecerá en nuestro sistema.</p>
                <p>Recogerás tu compra en:</p>
                <p><strong>TropiParts Real Campiña<br>Aguada de Pasajeros, Cienfuegos</strong></p>
                ${paymentMethod === 'CASH' ? '<p class="cash-note"><i class="fas fa-info-circle"></i> Recuerda traer el efectivo cuando recojas tu pedido.</p>' : ''}
                <p>Puedes ver el estado de tu pedido en <a href="account-orders.html">Mis Órdenes</a>.</p>
            </div>
        `;

        // Limpiar el carrito
        localStorage.removeItem('tropiplus_cart');
        shoppingCart = [];
        updateCartCount();

        // Redirigir después de 5 segundos
        setTimeout(() => {
            window.location.href = 'account-orders.html';
        }, 5000);

    } catch (error) {
        console.error('Error procesando pago:', error);
        const friendlyMessage = error.userMessage || error.message || 'Error desconocido';
        throw { ...error, userMessage: friendlyMessage };
    }
}

function generateIdempotencyKey() {
    return 'tropiplus_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function updateCartCount() {
    const totalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadges = document.querySelectorAll('.cart-badge-number, .cart-badge');
    cartBadges.forEach(badge => {
        badge.textContent = totalItems;
    });
}

// Inicializar selector de método de entrega
function initDeliveryMethodSelector() {
    const pickupRadio = document.getElementById('delivery-method-pickup');
    const deliveryRadio = document.getElementById('delivery-method-delivery');
    const pickupSection = document.getElementById('pickup-info-section');
    const deliverySection = document.getElementById('delivery-info-section');
    const recipientSelect = document.getElementById('delivery-recipient-select');
    const btnAddAddress = document.getElementById('btn-add-delivery-address');
    
    if (!pickupRadio || !deliveryRadio) return;
    
    // Cambiar entre pickup y delivery
    pickupRadio.addEventListener('change', () => {
        if (pickupRadio.checked) {
            pickupSection.style.display = 'block';
            deliverySection.style.display = 'none';
            if (recipientSelect) recipientSelect.removeAttribute('required');
        }
    });
    
    deliveryRadio.addEventListener('change', async () => {
        if (deliveryRadio.checked) {
            pickupSection.style.display = 'none';
            deliverySection.style.display = 'block';
            if (recipientSelect) recipientSelect.setAttribute('required', 'required');
            // Cargar direcciones inmediatamente
            console.log('📦 Cargando direcciones para delivery...');
            await loadDeliveryRecipients();
        }
    });
    
    // Botón agregar dirección
    if (btnAddAddress) {
        btnAddAddress.addEventListener('click', () => {
            window.location.href = 'account-recipients.html';
        });
    }
    
    // Cambiar dirección seleccionada
    if (recipientSelect) {
        recipientSelect.addEventListener('change', () => {
            const selectedIndex = recipientSelect.value;
            if (selectedIndex && selectedIndex !== '') {
                displaySelectedRecipient(selectedIndex);
            } else {
                document.getElementById('selected-delivery-address').style.display = 'none';
            }
        });
    }
}

// Cargar direcciones del usuario para delivery
async function loadDeliveryRecipients() {
    const recipientSelect = document.getElementById('delivery-recipient-select');
    if (!recipientSelect) {
        console.warn('⚠️ Selector de destinatarios no encontrado');
        return;
    }
    
    // Mostrar loading
    recipientSelect.innerHTML = '<option value="">Cargando direcciones...</option>';
    recipientSelect.disabled = true;
    
    try {
        const user = getCurrentUser();
        if (!user || !user.id) {
            recipientSelect.innerHTML = '<option value="">Debe iniciar sesión para usar delivery</option>';
            recipientSelect.disabled = false;
            return;
        }
        
        console.log('👤 Usuario encontrado:', user.id);
        
        // Verificar que la función esté disponible
        if (typeof getRecipientsFromSquare !== 'function') {
            console.error('❌ getRecipientsFromSquare no está disponible');
            recipientSelect.innerHTML = '<option value="">Error: función no disponible. Recargue la página.</option>';
            recipientSelect.disabled = false;
            return;
        }
        
        // Obtener destinatarios desde Square
        console.log('📞 Llamando a getRecipientsFromSquare...');
        const recipients = await getRecipientsFromSquare(user.id);
        console.log('✅ Destinatarios recibidos:', recipients);
        
        recipientSelect.innerHTML = '<option value="">Seleccione una dirección...</option>';
        
        if (recipients && Array.isArray(recipients) && recipients.length > 0) {
            console.log(`📋 Agregando ${recipients.length} direcciones al selector`);
            recipients.forEach((recipient, index) => {
                const option = document.createElement('option');
                option.value = index;
                const addressText = formatRecipientAddress(recipient.address);
                option.textContent = `${recipient.name || 'Destinatario'} - ${addressText}`;
                recipientSelect.appendChild(option);
            });
            console.log('✅ Direcciones agregadas al selector');
        } else {
            console.warn('⚠️ No se encontraron direcciones guardadas');
            recipientSelect.innerHTML += '<option value="" disabled>No tiene direcciones guardadas. Agregue una dirección primero.</option>';
        }
        
        recipientSelect.disabled = false;
    } catch (error) {
        console.error('❌ Error cargando destinatarios:', error);
        recipientSelect.innerHTML = '<option value="">Error al cargar direcciones. Intente recargar la página.</option>';
        recipientSelect.disabled = false;
    }
}

// Formatear dirección del destinatario
function formatRecipientAddress(address) {
    if (!address) return 'Sin dirección';
    const parts = [];
    if (address.address_line_1) parts.push(address.address_line_1);
    if (address.locality) parts.push(address.locality);
    if (address.municipality) parts.push(address.municipality);
    return parts.join(', ') || 'Sin dirección';
}

// Mostrar dirección seleccionada
async function displaySelectedRecipient(index) {
    try {
        const user = getCurrentUser();
        if (!user || !user.id) return;
        
        const recipients = await getRecipientsFromSquare(user.id);
        if (!recipients || !recipients[index]) return;
        
        const recipient = recipients[index];
        const displayDiv = document.getElementById('selected-delivery-address');
        const nameSpan = document.getElementById('delivery-recipient-name');
        const addressSpan = document.getElementById('delivery-recipient-address');
        const phoneSpan = document.getElementById('delivery-recipient-phone');
        
        if (displayDiv && nameSpan && addressSpan) {
            nameSpan.textContent = recipient.name || 'Destinatario';
            addressSpan.textContent = formatRecipientAddress(recipient.address);
            if (phoneSpan) {
                phoneSpan.textContent = recipient.phone ? `Tel: ${recipient.phone}` : '';
            }
            displayDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error mostrando destinatario:', error);
    }
}

// Obtener método de entrega seleccionado
function getSelectedDeliveryMethod() {
    const pickupRadio = document.getElementById('delivery-method-pickup');
    if (pickupRadio && pickupRadio.checked) {
        return 'pickup';
    }
    return 'delivery';
}

// Obtener destinatario seleccionado para delivery
async function getSelectedDeliveryRecipient() {
    const recipientSelect = document.getElementById('delivery-recipient-select');
    if (!recipientSelect || !recipientSelect.value || recipientSelect.value === '') {
        return null;
    }
    
    try {
        const user = getCurrentUser();
        if (!user || !user.id) return null;
        
        const recipients = await getRecipientsFromSquare(user.id);
        const index = parseInt(recipientSelect.value);
        
        if (recipients && recipients[index]) {
            return recipients[index];
        }
    } catch (error) {
        console.error('Error obteniendo destinatario:', error);
    }
    
    return null;
}

// Función para mostrar modal de error de pago
function showPaymentErrorModal(message) {
    const modal = document.getElementById('payment-error-modal');
    const messageElement = document.getElementById('payment-error-message');
    const okButton = document.getElementById('payment-error-ok-btn');
    
    if (!modal || !messageElement) return;
    
    messageElement.textContent = message;
    modal.classList.add('active');
    
    // Cerrar modal al hacer clic en Aceptar
    if (okButton) {
        okButton.onclick = () => {
            closePaymentErrorModal();
        };
    }
    
    // Cerrar modal al hacer clic fuera
    modal.onclick = (e) => {
        if (e.target === modal) {
            closePaymentErrorModal();
        }
    };
}

// Función para cerrar modal de error
function closePaymentErrorModal() {
    const modal = document.getElementById('payment-error-modal');
    if (modal) {
        modal.classList.remove('active');
        // Limpiar el contenedor de estado
        const statusContainer = document.getElementById('payment-status-container');
        if (statusContainer) {
            statusContainer.innerHTML = '';
        }
    }
}

// Función para mostrar modal de información de recogida para pago en efectivo
function showCashPickupModal(orderId) {
    // Crear modal si no existe
    let modal = document.getElementById('cash-pickup-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cash-pickup-modal';
        modal.className = 'modal cash-pickup-modal';
        modal.innerHTML = `
            <div class="modal-content cash-pickup-modal-content">
                <span class="close-button">&times;</span>
                <div class="modal-header">
                    <i class="fas fa-clock modal-icon-warning"></i>
                    <h3 class="modal-title">Importante: Recogida en 24 horas</h3>
                </div>
                <div class="modal-body">
                    <p><strong>Tu orden #${orderId} ha sido confirmada.</strong></p>
                    <p>Tienes <strong>24 horas</strong> para recoger tu pedido en la tienda.</p>
                    <p><strong>Ubicación:</strong><br>
                    TropiParts Real Campiña<br>
                    Aguada de Pasajeros, Cienfuegos</p>
                    <div class="cash-pickup-warning-box">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p><strong>Importante:</strong> Si no recoges tu pedido en 24 horas, la orden se cancelará automáticamente por falta de pago. Los productos no se pueden mantener por más tiempo.</p>
                    </div>
                    <p>Recuerda traer el efectivo cuando recojas tu pedido.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-modal-close cash-pickup-ok-btn">Entendido</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Event listeners para cerrar
        const closeBtn = modal.querySelector('.close-button');
        const okBtn = modal.querySelector('.cash-pickup-ok-btn');
        
        const closeModal = () => {
            modal.classList.remove('active');
        };
        
        if (closeBtn) closeBtn.onclick = closeModal;
        if (okBtn) okBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }
    
    // Mostrar modal
    modal.classList.add('active');
}
