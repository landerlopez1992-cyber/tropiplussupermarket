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
            alert('Por favor, ingrese el número de tarjeta');
            return;
        }

        // Deshabilitar botón mientras se verifica
        if (giftcardBtnCheck) {
            giftcardBtnCheck.disabled = true;
            giftcardBtnCheck.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        }

        try {
            // Buscar la tarjeta en Square usando el número
            // Square Gift Cards API: POST /v2/gift-cards/search
            // Intentar buscar por GAN completo primero
            let response = null;
            
            try {
                response = await squareApiCall(`/v2/gift-cards/search`, 'POST', {
                    query: {
                        exact_query: {
                            gan: cardNumber
                        }
                    }
                });
            } catch (error) {
                console.warn('Error buscando por GAN completo, intentando por últimos 4 dígitos:', error);
            }
            
            // Si no se encuentra, intentar buscar por los últimos 4 dígitos
            if (!response || !response.gift_cards || response.gift_cards.length === 0) {
                const last4 = cardNumber.slice(-4);
                try {
                    response = await squareApiCall(`/v2/gift-cards/search`, 'POST', {
                        query: {
                            exact_query: {
                                last4: last4
                            }
                        }
                    });
                } catch (error2) {
                    console.warn('Error buscando por últimos 4 dígitos:', error2);
                }
            }

            if (response && response.gift_cards && response.gift_cards.length > 0) {
                const giftCard = response.gift_cards[0];
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
                alert('Tarjeta no encontrada. Verifique el número e intente nuevamente.');
            }
        } catch (error) {
            console.error('Error verificando tarjeta:', error);
            alert('Error al verificar la tarjeta. Por favor, intente nuevamente.');
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
            alert('Por favor, verifique primero el saldo de la tarjeta');
            return;
        }

        const reloadAmount = parseFloat(giftcardReloadAmount?.value);
        
        if (!reloadAmount || reloadAmount <= 0) {
            alert('Por favor, ingrese una cantidad válida para recargar');
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
            alert(`Recarga de $${reloadAmount.toFixed(2)} agregada al carrito`);
        } else {
            console.error('addToCart function not available');
            alert('Error: No se pudo agregar la recarga al carrito');
        }
    }

    // Hacer funciones disponibles globalmente
    window.checkGiftCardBalance = checkGiftCardBalance;
    window.addGiftCardReloadToCart = addGiftCardReloadToCart;
}
