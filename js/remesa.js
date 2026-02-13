// Sistema de Remesa - Envío de dinero
document.addEventListener('DOMContentLoaded', function() {
    initRemesaSystem();
});

function initRemesaSystem() {
    const remesaBtn = document.getElementById('remesa-btn');
    const remesaModal = document.getElementById('remesa-modal');
    const remesaModalClose = document.getElementById('remesa-modal-close');
    const remesaBtnCancel = document.getElementById('remesa-btn-cancel');
    const remesaBtnAdd = document.getElementById('remesa-btn-add');
    const remesaAmount = document.getElementById('remesa-amount');
    const remesaCurrency = document.getElementById('remesa-currency');
    const remesaCurrencySymbol = document.getElementById('remesa-currency-symbol');

    if (!remesaBtn || !remesaModal) return;

    // Actualizar tasa de cambio al abrir el modal
    const updateExchangeRateDisplay = () => {
        const exchangeRateDisplay = document.getElementById('remesa-exchange-rate-display');
        if (exchangeRateDisplay && typeof window.getCurrencyConfig === 'function') {
            const currencyConfig = window.getCurrencyConfig();
            if (currencyConfig.enabled && currencyConfig.exchangeRate) {
                exchangeRateDisplay.textContent = `1 USD = ${currencyConfig.exchangeRate.toLocaleString('es-CU')} CUP`;
            } else {
                exchangeRateDisplay.textContent = '1 USD = 500 CUP';
            }
        }
    };

    // Abrir modal
    remesaBtn.addEventListener('click', () => {
        remesaModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateExchangeRateDisplay();
    });

    // Cerrar modal
    const closeModal = () => {
        remesaModal.classList.remove('active');
        document.body.style.overflow = '';
        // Resetear formulario
        remesaAmount.value = '';
        updateRemesaCalculation();
    };

    if (remesaModalClose) remesaModalClose.addEventListener('click', closeModal);
    if (remesaBtnCancel) remesaBtnCancel.addEventListener('click', closeModal);

    // Cerrar al hacer clic fuera del modal
    remesaModal.addEventListener('click', (e) => {
        if (e.target === remesaModal) {
            closeModal();
        }
    });

    // Cambiar símbolo de moneda
    if (remesaCurrency) {
        remesaCurrency.addEventListener('change', () => {
            const currency = remesaCurrency.value;
            remesaCurrencySymbol.textContent = currency === 'USD' ? '$' : '₱';
            updateRemesaCalculation();
        });
    }

    // Calcular en tiempo real
    if (remesaAmount) {
        remesaAmount.addEventListener('input', updateRemesaCalculation);
    }

    // Agregar al carrito
    if (remesaBtnAdd) {
        remesaBtnAdd.addEventListener('click', () => {
            addRemesaToCart();
        });
    }
}

function updateRemesaCalculation() {
    const amountInput = document.getElementById('remesa-amount');
    const currencySelect = document.getElementById('remesa-currency');
    const baseAmountSpan = document.getElementById('remesa-base-amount');
    const feeAmountSpan = document.getElementById('remesa-fee-amount');
    const totalAmountSpan = document.getElementById('remesa-total-amount');
    const currencySymbol = document.getElementById('remesa-currency-symbol');
    const cupDeliveryRow = document.getElementById('remesa-cup-delivery-row');
    const cupAmountSpan = document.getElementById('remesa-cup-amount');

    if (!amountInput || !currencySelect) return;

    const amount = parseFloat(amountInput.value) || 0;
    const currency = currencySelect.value;
    
    // IMPORTANTE: La cantidad siempre se ingresa en USD, independientemente de la moneda de entrega
    // El total a pagar siempre es en USD (con comisión del 10%)
    const fee = amount * 0.10;
    const total = amount + fee; // Total a pagar con Square (siempre en USD)

    // Mostrar cálculos en USD (siempre se paga en USD)
    if (baseAmountSpan) {
        baseAmountSpan.textContent = `$${amount.toFixed(2)}`;
    }
    if (feeAmountSpan) {
        feeAmountSpan.textContent = `$${fee.toFixed(2)}`;
    }
    if (totalAmountSpan) {
        totalAmountSpan.innerHTML = `<strong>$${total.toFixed(2)}</strong>`;
    }

    // Si se selecciona CUP como moneda de entrega, mostrar cuánto se entregará en CUP
    if (currency === 'CUP' && amount > 0) {
        // Obtener tasa de cambio
        let exchangeRate = 500; // Default
        if (typeof window.getCurrencyConfig === 'function') {
            const currencyConfig = window.getCurrencyConfig();
            if (currencyConfig.enabled && currencyConfig.exchangeRate) {
                exchangeRate = currencyConfig.exchangeRate;
            }
        }
        
        // Calcular: cantidad en USD × tasa de cambio = cantidad en CUP
        const cupAmount = amount * exchangeRate;
        
        if (cupDeliveryRow) {
            cupDeliveryRow.style.display = 'flex';
        }
        if (cupAmountSpan) {
            cupAmountSpan.textContent = `${cupAmount.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CUP`;
        }
    } else {
        // Ocultar si no es CUP o no hay cantidad
        if (cupDeliveryRow) {
            cupDeliveryRow.style.display = 'none';
        }
    }
}

function addRemesaToCart() {
    const amountInput = document.getElementById('remesa-amount');
    const currencySelect = document.getElementById('remesa-currency');
    const recipientName = document.getElementById('remesa-recipient-name');
    const recipientId = document.getElementById('remesa-recipient-id');

    if (!amountInput || !currencySelect || !recipientName) return;

    const amount = parseFloat(amountInput.value);
    const currency = currencySelect.value;
    const name = recipientName.value.trim();
    const idNumber = recipientId ? recipientId.value.trim() : '';

    if (!amount || amount <= 0) {
        if (typeof showModal === 'function') {
            showModal('Cantidad inválida', 'Por favor, ingrese una cantidad válida', 'warning');
        } else {
            alert('Por favor, ingrese una cantidad válida');
        }
        return;
    }

    if (!name) {
        if (typeof showModal === 'function') {
            showModal('Nombre requerido', 'Por favor, ingrese el nombre de quien recogerá la remesa', 'warning');
        } else {
            alert('Por favor, ingrese el nombre de quien recogerá la remesa');
        }
        return;
    }

    const fee = amount * 0.10;
    const total = amount + fee;

    // Crear item de remesa para el carrito
    const remesaItem = {
        id: `remesa_${Date.now()}`,
        name: `Remesa - ${currency === 'USD' ? 'Dólares' : 'Pesos Cubanos'}`,
        amount: amount,
        currency: currency,
        fee: fee,
        total: total,
        type: 'remesa',
        recipientName: name,
        recipientId: idNumber,
        description: `Envío de remesa: ${currency === 'USD' ? '$' : '₱'}${amount.toFixed(2)} + comisión ${currency === 'USD' ? '$' : '₱'}${fee.toFixed(2)}. Recogerá: ${name}${idNumber ? ` (CI: ${idNumber})` : ''}`
    };

        // Agregar al carrito global
        if (typeof addToCart === 'function') {
            // Convertir a formato de carrito
            const cartItem = {
                id: remesaItem.id,
                name: remesaItem.name,
                price: total,
                quantity: 1,
                image: null,
                type: 'remesa',
                remesaData: {
                    amount: amount,
                    currency: currency,
                    fee: fee,
                    total: total,
                    recipientName: name,
                    recipientId: idNumber
                }
            };
        
        addToCart(cartItem);
        
        // Cerrar modal
        const remesaModal = document.getElementById('remesa-modal');
        if (remesaModal) {
            remesaModal.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        // Resetear formulario
        amountInput.value = '';
        updateRemesaCalculation();
        
        // Mostrar mensaje de éxito
        if (typeof showModal === 'function') {
            showModal('Remesa agregada', `Remesa agregada al carrito: ${currency === 'USD' ? '$' : '₱'}${total.toFixed(2)}`, 'success');
        } else {
            alert(`Remesa agregada al carrito: ${currency === 'USD' ? '$' : '₱'}${total.toFixed(2)}`);
        }
    } else {
        console.error('addToCart function not available');
        if (typeof showModal === 'function') {
            showModal('Error', 'No se pudo agregar la remesa al carrito', 'error');
        } else {
            alert('Error: No se pudo agregar la remesa al carrito');
        }
    }
}

// Hacer funciones disponibles globalmente
window.addRemesaToCart = addRemesaToCart;
window.updateRemesaCalculation = updateRemesaCalculation;
