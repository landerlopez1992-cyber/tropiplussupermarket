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

    // Abrir modal
    remesaBtn.addEventListener('click', () => {
        remesaModal.classList.add('active');
        document.body.style.overflow = 'hidden';
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

    if (!amountInput || !currencySelect) return;

    const amount = parseFloat(amountInput.value) || 0;
    const currency = currencySelect.value;
    const symbol = currency === 'USD' ? '$' : '₱';
    
    // Calcular fee (10%)
    const fee = amount * 0.10;
    const total = amount + fee;

    if (baseAmountSpan) {
        baseAmountSpan.textContent = `${symbol}${amount.toFixed(2)}`;
    }
    if (feeAmountSpan) {
        feeAmountSpan.textContent = `${symbol}${fee.toFixed(2)}`;
    }
    if (totalAmountSpan) {
        totalAmountSpan.innerHTML = `<strong>${symbol}${total.toFixed(2)}</strong>`;
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
        alert('Por favor, ingrese una cantidad válida');
        return;
    }

    if (!name) {
        alert('Por favor, ingrese el nombre de quien recogerá la remesa');
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
        alert(`Remesa agregada al carrito: ${currency === 'USD' ? '$' : '₱'}${total.toFixed(2)}`);
    } else {
        console.error('addToCart function not available');
        alert('Error: No se pudo agregar la remesa al carrito');
    }
}

// Hacer funciones disponibles globalmente
window.addRemesaToCart = addRemesaToCart;
window.updateRemesaCalculation = updateRemesaCalculation;
