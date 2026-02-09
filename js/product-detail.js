// Producto Detail Page
let currentProduct = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Obtener el ID del producto de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        console.error('No se especificó ID de producto');
        window.location.href = 'index.html';
        return;
    }
    
    // Cargar el producto
    await loadProductDetails(productId);
    
    // Event listeners
    initQuantityControls();
    initAddToCart();
});

async function loadProductDetails(productId) {
    try {
        console.log('🔄 Cargando detalles del producto:', productId);
        
        // Obtener el producto de Square
        const response = await squareApiCall(`/v2/catalog/object/${productId}`, 'GET');
        
        if (!response.object) {
            throw new Error('Producto no encontrado');
        }
        
        currentProduct = response.object;
        const itemData = currentProduct.item_data;
        
        if (!itemData) {
            throw new Error('Datos del producto inválidos');
        }
        
        // Renderizar detalles del producto
        renderProductDetails(currentProduct);
        
        // Cargar productos relacionados
        if (itemData.categories && itemData.categories.length > 0) {
            loadRelatedProducts(itemData.categories[0].id);
        }
        
        console.log('✅ Producto cargado:', currentProduct);
    } catch (error) {
        console.error('❌ Error cargando producto:', error);
        document.getElementById('product-name').textContent = 'Error cargando producto';
        document.querySelector('.product-description-section').innerHTML = '<p>No se pudo cargar el producto. <a href="index.html">Volver al inicio</a></p>';
    }
}

async function renderProductDetails(product) {
    const itemData = product.item_data;
    
    // Título
    const title = itemData.name || 'Producto';
    document.getElementById('product-name').textContent = title;
    document.getElementById('product-title').textContent = `${title} - Tropiplus Supermarket`;
    document.getElementById('breadcrumb-product').textContent = title;
    
    // Precio
    const variation = itemData.variations && itemData.variations[0];
    const price = variation?.item_variation_data?.price_money;
    if (price) {
        const priceFormatted = formatSquarePrice(price);
        document.getElementById('product-price').textContent = priceFormatted;
        
        // Precio por unidad
        const pricePerUnit = (price.amount / 100).toFixed(2);
        document.getElementById('product-price-unit').textContent = `${pricePerUnit} US$/unidad`;
    }
    
    // Verificar inventario y mostrar cantidad disponible
    if (typeof isProductAvailable === 'function') {
        const availability = await isProductAvailable(currentProduct);
        const stockInfo = document.getElementById('product-stock-info');
        if (stockInfo) {
            if (!availability.available) {
                stockInfo.innerHTML = '<span style="color: #f44336; font-weight: 600;">AGOTADO - Próximamente estará en existencia</span>';
                stockInfo.style.display = 'block';
            } else if (availability.quantity !== null) {
                stockInfo.innerHTML = `<span style="color: #4caf50; font-weight: 600;">En existencia: ${availability.quantity} unidades</span>`;
                stockInfo.style.display = 'block';
            } else {
                stockInfo.style.display = 'none';
            }
        }
    }
    
    // Imagen principal - obtener correctamente desde Square API
    let imageUrl = 'images/placeholder.svg';
    if (itemData.image_ids && itemData.image_ids.length > 0) {
        const imageId = itemData.image_ids[0];
        const squareImageUrl = await getCachedProductImageUrl(imageId);
        if (squareImageUrl) {
            imageUrl = squareImageUrl;
        }
    }
    
    const mainImage = document.getElementById('main-image');
    mainImage.src = imageUrl;
    mainImage.alt = title;
    mainImage.onerror = function() {
        this.src = 'images/placeholder.svg';
        this.onerror = null;
    };
    
    // Thumbnails (si hay múltiples imágenes)
    const thumbnailsContainer = document.getElementById('thumbnails');
    thumbnailsContainer.innerHTML = '';
    
    if (itemData.image_ids && itemData.image_ids.length > 1) {
        for (let index = 0; index < itemData.image_ids.length; index++) {
            const imageId = itemData.image_ids[index];
            const thumbUrl = await getCachedProductImageUrl(imageId) || 'images/placeholder.svg';
            
            const thumb = document.createElement('img');
            thumb.src = thumbUrl;
            thumb.alt = `${title} - Imagen ${index + 1}`;
            thumb.className = 'product-thumbnail';
            thumb.onclick = function() {
                mainImage.src = thumbUrl;
            };
            thumb.onerror = function() {
                this.src = 'images/placeholder.svg';
                this.onerror = null;
            };
            thumbnailsContainer.appendChild(thumb);
        }
    }
    
    // Categoría
    if (itemData.categories && itemData.categories.length > 0) {
        const categoryName = itemData.categories[0].name || 'Sin categoría';
        document.getElementById('product-category').textContent = categoryName;
        document.getElementById('breadcrumb-category').textContent = categoryName;
    }
    
    // Marca (primera palabra del nombre)
    const brand = itemData.name?.split(' ')[0] || '-';
    document.getElementById('product-brand').textContent = brand;
    
    // Descripción
    const description = itemData.description || itemData.name || 'Sin descripción disponible';
    document.getElementById('product-description').innerHTML = `
        <p><strong>Ingredientes:</strong></p>
        <p>${description}</p>
        ${variation?.item_variation_data?.name ? `<p><strong>Presentación:</strong> ${variation.item_variation_data.name}</p>` : ''}
    `;
}

async function loadRelatedProducts(categoryId) {
    try {
        // Obtener productos de la misma categoría
        const products = squareProducts.filter(product => {
            const itemData = product.item_data;
            if (!itemData || !itemData.categories) return false;
            return itemData.categories.some(cat => cat.id === categoryId);
        });
        
        // Filtrar el producto actual y tomar solo 5
        const relatedProducts = products
            .filter(p => p.id !== currentProduct.id)
            .slice(0, 5);
        
        renderRelatedProducts(relatedProducts);
    } catch (error) {
        console.error('Error cargando productos relacionados:', error);
    }
}

async function renderRelatedProducts(products) {
    const container = document.getElementById('related-products');
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = '<p>No hay productos relacionados disponibles</p>';
        return;
    }
    
    for (const product of products) {
        const productCard = await createProductCard(product);
        container.appendChild(productCard);
    }
}

function initQuantityControls() {
    const minusBtn = document.querySelector('.qty-btn-minus');
    const plusBtn = document.querySelector('.qty-btn-plus');
    const qtyInput = document.getElementById('quantity');
    
    if (minusBtn) {
        minusBtn.addEventListener('click', () => {
            const currentValue = parseInt(qtyInput.value) || 1;
            if (currentValue > 1) {
                qtyInput.value = currentValue - 1;
            }
        });
    }
    
    if (plusBtn) {
        plusBtn.addEventListener('click', () => {
            const currentValue = parseInt(qtyInput.value) || 1;
            qtyInput.value = currentValue + 1;
        });
    }
}

function initAddToCart() {
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async () => {
            if (!currentProduct) return;
            
            // Verificar inventario antes de agregar
            if (typeof isProductAvailable === 'function') {
                const availability = await isProductAvailable(currentProduct);
                if (!availability.available) {
                    alert('Este producto ya no está disponible. Se ha agotado.');
                    // Actualizar el mensaje de stock
                    const stockInfo = document.getElementById('product-stock-info');
                    if (stockInfo) {
                        stockInfo.innerHTML = '<span style="color: #f44336; font-weight: 600;">AGOTADO - Próximamente estará en existencia</span>';
                        stockInfo.style.display = 'block';
                    }
                    return;
                }
                
                const quantity = parseInt(document.getElementById('quantity').value) || 1;
                if (availability.quantity !== null && quantity > availability.quantity) {
                    alert(`Solo hay ${availability.quantity} unidades disponibles.`);
                    return;
                }
            }
            
            const quantity = parseInt(document.getElementById('quantity').value) || 1;
            // Usar la función global addToCart si está disponible
            if (typeof addToCart === 'function') {
                addToCart(currentProduct, quantity);
            } else {
                // Fallback local
                addProductToCart(currentProduct, quantity);
            }
        });
    }
}

// Función local para agregar al carrito (si no está disponible globalmente)
function addProductToCart(product, quantity = 1) {
    console.log('🛒 Añadiendo al carrito:', product, 'Cantidad:', quantity);
    
    let shoppingCart = JSON.parse(localStorage.getItem('tropiplus_cart')) || [];
    const itemData = product.item_data;
    const variation = itemData?.variations?.[0];
    const price = variation?.item_variation_data?.price_money;
    
    const cartItem = {
        id: product.id,
        name: itemData?.name || 'Producto sin nombre',
        price: price ? price.amount / 100 : 0,
        quantity: quantity,
        image: itemData?.image_ids?.[0] || null
    };
    
    const existingItemIndex = shoppingCart.findIndex(item => item.id === product.id);
    
    if (existingItemIndex >= 0) {
        shoppingCart[existingItemIndex].quantity += quantity;
    } else {
        shoppingCart.push(cartItem);
    }
    
    localStorage.setItem('tropiplus_cart', JSON.stringify(shoppingCart));
    
    // Actualizar contador
    const totalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadges = document.querySelectorAll('.cart-badge-number, .cart-badge');
    cartBadges.forEach(badge => {
        badge.textContent = totalItems;
    });
    
    // Mostrar notificación
    showCartNotification(cartItem.name, quantity);
    
    // Abrir carrito
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    if (cartSidebar) cartSidebar.classList.add('open');
    if (cartOverlay) cartOverlay.classList.add('active');
}

function showCartNotification(productName, quantity) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${quantity}x ${productName} agregado al carrito</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatSquarePrice(price) {
    if (!price) return '$0.00';
    const amount = price.amount || price;
    return `$${(amount / 100).toFixed(2)}`;
}
