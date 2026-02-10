// Sistema de Recarga de Tarjetas de Regalo - Square Gift Cards API
document.addEventListener('DOMContentLoaded', function() {
    initGiftCardSystem();
});

function initGiftCardSystem() {
    const giftcardBtn = document.getElementById('giftcard-btn');
    const giftcardModal = document.getElementById('giftcard-modal');
    const giftcardModalClose = document.getElementById('giftcard-modal-close');
    const giftcardBtnCancel = document.getElementById('giftcard-btn-cancel');
    const giftcardBtnCheck = document.getElementById('giftcard-btn-check');
    const giftcardBtnReload = document.getElementById('giftcard-btn-reload');
    const giftcardNumber = document.getElementById('giftcard-number');
    const giftcardReloadAmount = document.getElementById('giftcard-reload-amount');

    if (!giftcardBtn || !giftcardModal) return;

    let currentGiftCard = null;

    // Abrir modal
    giftcardBtn.addEventListener('click', () => {
        giftcardModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        resetGiftCardForm();
    });

    // Cerrar modal
    const closeModal = () => {
        giftcardModal.classList.remove('active');
        document.body.style.overflow = '';
        resetGiftCardForm();
    };

    if (giftcardModalClose) giftcardModalClose.addEventListener('click', closeModal);
    if (giftcardBtnCancel) giftcardBtnCancel.addEventListener('click', closeModal);

    // Cerrar al hacer clic fuera del modal
    giftcardModal.addEventListener('click', (e) => {
        if (e.target === giftcardModal) {
            closeModal();
        }
    });

    // Verificar saldo
    if (giftcardBtnCheck) {
        giftcardBtnCheck.addEventListener('click', async () => {
            await checkGiftCardBalance();
        });
    }

    // Calcular nuevo saldo en tiempo real
    if (giftcardReloadAmount) {
        giftcardReloadAmount.addEventListener('input', () => {
            updateGiftCardCalculation();
        });
    }

    // Agregar recarga al carrito
    if (giftcardBtnReload) {
        giftcardBtnReload.addEventListener('click', () => {
            addGiftCardReloadToCart();
        });
    }

    function resetGiftCardForm() {
        if (giftcardNumber) giftcardNumber.value = '';
        if (giftcardReloadAmount) giftcardReloadAmount.value = '';
        document.getElementById('giftcard-balance-info').style.display = 'none';
        document.getElementById('giftcard-reload-section').style.display = 'none';
        document.getElementById('giftcard-btn-reload').style.display = 'none';
        currentGiftCard = null;
    }

    async function checkGiftCardBalance() {
        const cardNumber = giftcardNumber?.value.trim();
        
        if (!cardNumber) {
            if (typeof showModal === 'function') {
                showModal('Número de tarjeta requerido', 'Por favor, ingrese el número de tarjeta', 'warning');
            } else {
                alert('Por favor, ingrese el número de tarjeta');
            }
            return;
        }

        // Deshabilitar botón mientras se verifica
        if (giftcardBtnCheck) {
            giftcardBtnCheck.disabled = true;
            giftcardBtnCheck.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        }

        try {
            // Buscar la tarjeta en Square usando el número
            // Square Gift Cards API: Según la documentación, debemos usar el endpoint correcto
            // El endpoint correcto es: POST /v2/gift-cards/from-gan (para obtener por GAN)
            // O usar: GET /v2/gift-cards/{id} si tenemos el ID
            let response = null;
            let giftCard = null;
            
            // Método 1: Intentar obtener la tarjeta directamente por GAN usando el endpoint from-gan
            try {
                console.log('🔍 Buscando tarjeta por GAN usando from-gan:', cardNumber);
                response = await squareApiCall(`/v2/gift-cards/from-gan`, 'POST', {
                    gan: cardNumber
                });
                console.log('✅ Respuesta de Square (from-gan):', response);
                
                if (response && response.gift_card) {
                    giftCard = response.gift_card;
                }
            } catch (error) {
                console.warn('⚠️ Error usando from-gan:', error);
                console.log('📋 Detalles del error:', error.message || JSON.stringify(error, null, 2));
            }
            
            // Método 2: Si from-gan no funciona, intentar buscar usando el endpoint de retrieve balance
            // Este endpoint permite verificar el saldo usando el GAN
            if (!giftCard) {
                try {
                    console.log('🔍 Intentando obtener saldo directamente por GAN...');
                    // Square tiene un endpoint para verificar saldo: POST /v2/gift-cards/from-gan
                    // O podemos intentar obtener todas las tarjetas y buscar
                    const balanceResponse = await squareApiCall(`/v2/gift-cards/from-gan`, 'POST', {
                        gan: cardNumber
                    });
                    
                    if (balanceResponse && balanceResponse.gift_card) {
                        giftCard = balanceResponse.gift_card;
                        console.log('✅ Tarjeta encontrada mediante from-gan:', giftCard);
                    }
                } catch (error2) {
                    console.warn('⚠️ Error obteniendo saldo:', error2);
                }
            }
            
            // Método 3: Si aún no funciona, intentar obtener todas las tarjetas usando el endpoint correcto
            // Square Gift Cards API usa: GET /v2/gift-cards (sin search)
            if (!giftCard) {
                console.log('🔍 Intentando obtener todas las tarjetas...');
                try {
                    // Intentar listar todas las tarjetas (si el endpoint existe)
                    const listResponse = await squareApiCall(`/v2/gift-cards`, 'GET');
                    console.log('📋 Respuesta de listado:', listResponse);
                    
                    if (listResponse && listResponse.gift_cards) {
                        // Buscar manualmente por GAN
                        const foundCard = listResponse.gift_cards.find(card => {
                            const gan = card.gan || '';
                            return gan === cardNumber || 
                                   gan.endsWith(cardNumber) || 
                                   cardNumber.endsWith(gan);
                        });
                        
                        if (foundCard) {
                            giftCard = foundCard;
                            console.log('✅ Tarjeta encontrada en listado:', foundCard);
                        }
                    }
                } catch (error3) {
                    console.error('❌ Error listando tarjetas:', error3);
                    console.log('📋 Detalles del error:', error3.message || JSON.stringify(error3, null, 2));
                }
            }

            if (giftCard) {
                currentGiftCard = giftCard;
                
                // Mostrar información de la tarjeta
                const balance = giftCard.balance_money ? (giftCard.balance_money.amount / 100) : 0;
                const state = giftCard.state || 'ACTIVE';
                
                document.getElementById('giftcard-current-balance').textContent = `$${balance.toFixed(2)}`;
                document.getElementById('giftcard-status').textContent = state === 'ACTIVE' ? 'Activa' : 'Inactiva';
                document.getElementById('giftcard-balance-display').textContent = `$${balance.toFixed(2)}`;
                
                document.getElementById('giftcard-balance-info').style.display = 'block';
                document.getElementById('giftcard-reload-section').style.display = 'block';
                document.getElementById('giftcard-btn-reload').style.display = 'block';
                
                updateGiftCardCalculation();
            } else {
                if (typeof showModal === 'function') {
                    showModal('Tarjeta no encontrada', 'Verifique el número e intente nuevamente.', 'error');
                } else {
                    alert('Tarjeta no encontrada. Verifique el número e intente nuevamente.');
                }
            }
        } catch (error) {
            console.error('Error verificando tarjeta:', error);
            if (typeof showModal === 'function') {
                showModal('Error al verificar tarjeta', 'Por favor, intente nuevamente.', 'error');
            } else {
                alert('Error al verificar la tarjeta. Por favor, intente nuevamente.');
            }
        } finally {
            if (giftcardBtnCheck) {
                giftcardBtnCheck.disabled = false;
                giftcardBtnCheck.innerHTML = '<i class="fas fa-search-dollar"></i> Verificar Saldo';
            }
        }
    }

    function updateGiftCardCalculation() {
        if (!currentGiftCard) return;
        
        const reloadAmount = parseFloat(giftcardReloadAmount?.value) || 0;
        const currentBalance = currentGiftCard.balance_money ? (currentGiftCard.balance_money.amount / 100) : 0;
        const newBalance = currentBalance + reloadAmount;

        document.getElementById('giftcard-reload-display').textContent = `$${reloadAmount.toFixed(2)}`;
        document.getElementById('giftcard-new-balance').innerHTML = `<strong>$${newBalance.toFixed(2)}</strong>`;
    }

    async function addGiftCardReloadToCart() {
        if (!currentGiftCard) {
            if (typeof showModal === 'function') {
                showModal('Verificar saldo primero', 'Por favor, verifique primero el saldo de la tarjeta', 'warning');
            } else {
                alert('Por favor, verifique primero el saldo de la tarjeta');
            }
            return;
        }

        const reloadAmount = parseFloat(giftcardReloadAmount?.value);
        
        if (!reloadAmount || reloadAmount <= 0) {
            if (typeof showModal === 'function') {
                showModal('Cantidad inválida', 'Por favor, ingrese una cantidad válida para recargar', 'warning');
            } else {
                alert('Por favor, ingrese una cantidad válida para recargar');
            }
            return;
        }

        // Crear item de recarga para el carrito
        const reloadItem = {
            id: `giftcard_reload_${Date.now()}`,
            name: `Recarga Tarjeta Tropiplus - ${currentGiftCard.gan || 'N/A'}`,
            price: reloadAmount,
            quantity: 1,
            type: 'giftcard_reload',
            giftCardId: currentGiftCard.id,
            giftCardGan: currentGiftCard.gan,
            currentBalance: currentGiftCard.balance_money ? (currentGiftCard.balance_money.amount / 100) : 0,
            reloadAmount: reloadAmount,
            newBalance: (currentGiftCard.balance_money ? (currentGiftCard.balance_money.amount / 100) : 0) + reloadAmount
        };

        // Agregar al carrito global
        if (typeof addToCart === 'function') {
            addToCart(reloadItem);
            
            // Cerrar modal
            closeModal();
            
            // Mostrar mensaje de éxito
            if (typeof showModal === 'function') {
                showModal('Recarga agregada', `Recarga de $${reloadAmount.toFixed(2)} agregada al carrito`, 'success');
            } else {
                alert(`Recarga de $${reloadAmount.toFixed(2)} agregada al carrito`);
            }
        } else {
            console.error('addToCart function not available');
            if (typeof showModal === 'function') {
                showModal('Error', 'No se pudo agregar la recarga al carrito', 'error');
            } else {
                alert('Error: No se pudo agregar la recarga al carrito');
            }
        }
    }

    // Hacer funciones disponibles globalmente
    window.checkGiftCardBalance = checkGiftCardBalance;
    window.addGiftCardReloadToCart = addGiftCardReloadToCart;
}
