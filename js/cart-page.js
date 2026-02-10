// Página de Carrito Completo
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

// Función auxiliar para obtener imagen (fallback si no está disponible getCachedProductImageUrl)
async function getItemImageUrl(imageId) {
    if (typeof getCachedProductImageUrl === 'function') {
        return await getCachedProductImageUrl(imageId);
    }
    // Fallback: intentar obtener desde Square API directamente
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

document.addEventListener('DOMContentLoaded', function() {
    // IMPORTANTE: Recargar el carrito desde localStorage cada vez que se carga la página
    const cart = getCart();
    console.log('🛒 Carrito cargado desde localStorage:', cart.length, 'items');
    console.log('📦 Contenido del carrito:', cart);
    
    renderCartItems();
    updateCartSummary();
    initCartPage();
    updateCartCount();
});

function initCartPage() {
    // Botón de checkout
    const btnCheckout = document.getElementById('btn-checkout');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            // Recargar carrito antes de navegar
            const cart = getCart();
            console.log('🛒 Navegando a checkout con', cart.length, 'items');
            console.log('📦 Carrito antes de navegar:', JSON.stringify(cart, null, 2));
            
            if (cart.length === 0) {
                alert('Tu carrito está vacío');
                return;
            }
            
            // Asegurar que el carrito esté guardado antes de navegar
            saveCart(cart);
            console.log('✅ Carrito guardado antes de navegar');
            
            // Pequeño delay para asegurar que se guarde
            setTimeout(() => {
                window.location.href = 'checkout.html';
            }, 100);
        });
    }

    // Actualizar contador del carrito en el header
    updateCartCount();
}

async function renderCartItems() {
    const cartItemsList = document.getElementById('cart-items-list');
    const cartEmpty = document.getElementById('cart-empty');
    
    if (!cartItemsList) return;

    const cart = getCart();
    if (cart.length === 0) {
        if (cartItemsList) cartItemsList.style.display = 'none';
        if (cartEmpty) {
            cartEmpty.style.display = 'block';
            cartEmpty.classList.add('show');
        }
        return;
    }

    if (cartItemsList) cartItemsList.style.display = 'block';
    if (cartEmpty) {
        cartEmpty.style.display = 'none';
        cartEmpty.classList.remove('show');
    }

    let html = '';
    
    for (const item of cart) {
        // Si es una remesa, renderizar de forma especial
        if (item.type === 'remesa' && item.remesaData) {
            const remesaData = item.remesaData;
            const symbol = remesaData.currency === 'USD' ? '$' : '₱';
            html += `
                <div class="cart-item-card cart-item-remesa" data-item-id="${item.id}">
                    <div class="cart-item-image-wrapper remesa-icon-wrapper">
                        <i class="fas fa-money-bill-wave remesa-icon"></i>
                    </div>
                    <div class="cart-item-details">
                        <h3 class="cart-item-name-large">${item.name}</h3>
                        <div class="remesa-details">
                            <p><strong>Cantidad a enviar:</strong> ${symbol}${remesaData.amount.toFixed(2)}</p>
                            <p><strong>Comisión (10%):</strong> ${symbol}${remesaData.fee.toFixed(2)}</p>
                            <p><strong>Moneda:</strong> ${remesaData.currency}</p>
                        </div>
                        <div class="cart-item-price-large">$${item.price.toFixed(2)}</div>
                    </div>
                    <div class="cart-item-total-section">
                        <div class="cart-item-total-large">$${(item.price * item.quantity).toFixed(2)}</div>
                        <button class="cart-item-remove" data-item-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            continue;
        }
        
        let imageUrl = 'images/placeholder.svg';
        if (item.image) {
            try {
                imageUrl = await getItemImageUrl(item.image) || 'images/placeholder.svg';
            } catch (error) {
                console.warn('Error cargando imagen para', item.name, error);
                imageUrl = 'images/placeholder.svg';
            }
        }
        
        // Verificar inventario del producto
        let isItemAvailable = true;
        let availableStock = null;
        let stockMessage = '';
        
        if (item.variationId && typeof isProductAvailable === 'function') {
            try {
                // Buscar el producto completo para verificar inventario
                // Primero intentar desde squareProducts global, si no existe, buscar desde Square API
                let product = null;
                if (typeof squareProducts !== 'undefined' && Array.isArray(squareProducts)) {
                    product = squareProducts.find(p => {
                        const variation = p.item_data?.variations?.[0];
                        return variation?.id === item.variationId;
                    });
                }
                
                // Si no se encuentra en squareProducts, buscar por ID del producto
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
                    isItemAvailable = availability.available;
                    availableStock = availability.quantity;
                    
                    if (!isItemAvailable) {
                        stockMessage = '<span class="cart-item-out-of-stock">AGOTADO - Próximamente estará en existencia</span>';
                    } else if (availableStock !== null && item.quantity > availableStock) {
                        stockMessage = `<span class="cart-item-low-stock">Solo ${availableStock} disponibles (tienes ${item.quantity})</span>`;
                    }
                }
            } catch (error) {
                console.warn('Error verificando inventario para', item.name, error);
            }
        }
        
        html += `
            <div class="cart-item-card ${!isItemAvailable ? 'cart-item-out-of-stock-card' : ''}" data-item-id="${item.id}">
                ${!isItemAvailable ? '<span class="cart-item-out-of-stock-badge">AGOTADO</span>' : ''}
                <div class="cart-item-image-wrapper ${!isItemAvailable ? 'out-of-stock-overlay' : ''}">
                    <img src="${imageUrl}" alt="${item.name}" class="cart-item-image-large ${!isItemAvailable ? 'out-of-stock-image' : ''}">
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-name-large">${item.name}</h3>
                    ${stockMessage}
                    <div class="cart-item-price-large">$${item.price.toFixed(2)}</div>
                    <div class="cart-item-quantity-control ${!isItemAvailable ? 'disabled' : ''}">
                        <button class="qty-btn-minus" data-item-id="${item.id}" ${!isItemAvailable ? 'disabled' : ''}>
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="qty-input-large" value="${item.quantity}" min="1" data-item-id="${item.id}" ${!isItemAvailable ? 'disabled' : ''}>
                        <button class="qty-btn-plus" data-item-id="${item.id}" ${!isItemAvailable ? 'disabled' : ''}>
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="cart-item-total-section">
                    <div class="cart-item-total-large">$${(item.price * item.quantity).toFixed(2)}</div>
                    <button class="cart-item-remove" data-item-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    cartItemsList.innerHTML = html;

    // Event listeners para cantidad
    document.querySelectorAll('.qty-btn-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = btn.getAttribute('data-item-id');
            updateItemQuantity(itemId, -1);
        });
    });

    document.querySelectorAll('.qty-btn-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = btn.getAttribute('data-item-id');
            updateItemQuantity(itemId, 1);
        });
    });

    document.querySelectorAll('.qty-input-large').forEach(input => {
        input.addEventListener('change', (e) => {
            const itemId = input.getAttribute('data-item-id');
            const newQuantity = parseInt(input.value) || 1;
            setItemQuantity(itemId, newQuantity);
        });
    });

    // Event listeners para eliminar
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = btn.getAttribute('data-item-id');
            removeItem(itemId);
        });
    });
}

function updateItemQuantity(itemId, change) {
    const cart = getCart();
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    item.quantity = Math.max(1, item.quantity + change);
    saveCart(cart);
    renderCartItems();
    updateCartSummary();
    updateCartCount();
}

function setItemQuantity(itemId, quantity) {
    const cart = getCart();
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    item.quantity = Math.max(1, quantity);
    saveCart(cart);
    renderCartItems();
    updateCartSummary();
    updateCartCount();
}

function removeItem(itemId) {
    const cart = getCart().filter(i => i.id !== itemId);
    saveCart(cart);
    renderCartItems();
    updateCartSummary();
    updateCartCount();
}

function updateCartSummary() {
    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal; // Por ahora no hay impuestos ni envío

    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTotal = document.getElementById('summary-total');

    if (summarySubtotal) summarySubtotal.textContent = `${subtotal.toFixed(2)} US$`;
    if (summaryTotal) summaryTotal.textContent = `${total.toFixed(2)} US$`;
}

function updateCartCount() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadges = document.querySelectorAll('.cart-badge-number, .cart-badge');
    cartBadges.forEach(badge => {
        badge.textContent = totalItems;
    });
}
