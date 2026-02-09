// Página de Lista de Deseos - Guardada en Square API

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está logueado
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
        loadWishlist();
    } else {
        window.location.href = 'login.html';
    }
});

async function loadWishlist() {
    const wishlistEmpty = document.getElementById('wishlist-empty');
    const wishlistProducts = document.getElementById('wishlist-products');
    
    try {
        const user = getCurrentUser();
        if (!user || !user.id) {
            console.error('Usuario no encontrado');
            return;
        }
        
        // Obtener lista de deseos desde Square (guardada en customer.note)
        const wishlist = await getWishlistFromSquare(user.id);
        
        if (!wishlist || wishlist.length === 0) {
            // Mostrar mensaje vacío
            if (wishlistEmpty) wishlistEmpty.style.display = 'block';
            if (wishlistProducts) wishlistProducts.style.display = 'none';
            return;
        }
        
        // Ocultar mensaje vacío y mostrar productos
        if (wishlistEmpty) wishlistEmpty.style.display = 'none';
        if (wishlistProducts) {
            wishlistProducts.style.display = 'grid';
            wishlistProducts.innerHTML = '';
            
            // Cargar productos desde Square
            const products = await getSquareProducts();
            const wishlistProductsData = products.filter(p => wishlist.includes(p.id));
            
            if (wishlistProductsData.length === 0) {
                if (wishlistEmpty) wishlistEmpty.style.display = 'block';
                if (wishlistProducts) wishlistProducts.style.display = 'none';
                return;
            }
            
            // Renderizar productos
            for (const product of wishlistProductsData) {
                const productCard = await createWishlistProductCard(product);
                wishlistProducts.appendChild(productCard);
            }
        }
        
    } catch (error) {
        console.error('Error cargando lista de deseos:', error);
        if (wishlistEmpty) wishlistEmpty.style.display = 'block';
        if (wishlistProducts) wishlistProducts.style.display = 'none';
    }
}

async function createWishlistProductCard(product) {
    const card = document.createElement('div');
    card.className = 'wishlist-product-card';
    
    const itemData = product.item_data;
    const productName = itemData?.name || 'Producto sin nombre';
    const productPrice = itemData?.variations?.[0]?.item_variation_data?.price_money;
    const priceAmount = productPrice?.amount ? (productPrice.amount / 100).toFixed(2) : '0.00';
    const imageId = itemData?.image_ids?.[0];
    
    // Obtener categoría
    let categoryName = 'Sin categoría';
    if (itemData?.category_id && typeof squareCategories !== 'undefined' && squareCategories.length > 0) {
        const category = squareCategories.find(cat => cat.id === itemData.category_id);
        if (category && category.category_data && category.category_data.name) {
            categoryName = category.category_data.name;
        }
    }
    
    // Obtener imagen
    let imageUrl = 'images/placeholder.svg';
    if (imageId && typeof getCachedProductImageUrl === 'function') {
        const cachedUrl = await getCachedProductImageUrl(imageId);
        if (cachedUrl) imageUrl = cachedUrl;
    }
    
    card.innerHTML = `
        <div class="wishlist-card-image-wrapper">
            <div class="wishlist-card-image-container">
                <img src="${imageUrl}" alt="${productName}" class="wishlist-card-image" loading="lazy">
            </div>
            <button class="wishlist-card-heart-btn active" data-product-id="${product.id}" title="Quitar de lista de deseos">
                <i class="fas fa-heart"></i>
            </button>
        </div>
        <div class="wishlist-card-content">
            <p class="wishlist-card-category">${categoryName}</p>
            <h3 class="wishlist-card-name">${productName}</h3>
            <p class="wishlist-card-price">$${priceAmount}</p>
            <div class="wishlist-card-actions">
                <div class="wishlist-quantity-controls">
                    <button class="wishlist-qty-btn wishlist-qty-minus" data-product-id="${product.id}">-</button>
                    <span class="wishlist-qty-value" data-product-id="${product.id}">1</span>
                    <button class="wishlist-qty-btn wishlist-qty-plus" data-product-id="${product.id}">+</button>
                </div>
                <button class="wishlist-add-cart-btn" data-product-id="${product.id}" title="Agregar al carrito">
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </div>
        </div>
    `;
    
    // Event listeners
    const heartBtn = card.querySelector('.wishlist-card-heart-btn');
    if (heartBtn) {
        heartBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await removeFromWishlist(product.id);
            card.remove();
            // Verificar si quedan productos
            const remainingProducts = document.querySelectorAll('.wishlist-product-card');
            if (remainingProducts.length === 0) {
                const wishlistEmpty = document.getElementById('wishlist-empty');
                const wishlistProducts = document.getElementById('wishlist-products');
                if (wishlistEmpty) wishlistEmpty.style.display = 'block';
                if (wishlistProducts) wishlistProducts.style.display = 'none';
            }
        });
    }
    
    // Controles de cantidad
    const qtyMinus = card.querySelector('.wishlist-qty-minus');
    const qtyPlus = card.querySelector('.wishlist-qty-plus');
    const qtyValue = card.querySelector('.wishlist-qty-value');
    
    if (qtyMinus) {
        qtyMinus.addEventListener('click', (e) => {
            e.stopPropagation();
            let currentQty = parseInt(qtyValue.textContent) || 1;
            if (currentQty > 1) {
                currentQty--;
                qtyValue.textContent = currentQty;
            }
        });
    }
    
    if (qtyPlus) {
        qtyPlus.addEventListener('click', (e) => {
            e.stopPropagation();
            let currentQty = parseInt(qtyValue.textContent) || 1;
            currentQty++;
            qtyValue.textContent = currentQty;
        });
    }
    
    // Botón agregar al carrito
    const addCartBtn = card.querySelector('.wishlist-add-cart-btn');
    if (addCartBtn && typeof addToCart === 'function') {
        addCartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const quantity = parseInt(qtyValue.textContent) || 1;
            addToCart(product.id, quantity);
            // Mostrar feedback visual
            addCartBtn.style.backgroundColor = '#4caf50';
            addCartBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                addCartBtn.style.backgroundColor = '';
                addCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i>';
            }, 1000);
        });
    }
    
    // Navegación al hacer clic en la tarjeta (excepto en botones)
    card.addEventListener('click', (e) => {
        if (!e.target.closest('button') && !e.target.closest('.wishlist-card-actions')) {
            window.location.href = `product.html?id=${product.id}`;
        }
    });
    
    return card;
}

// Obtener lista de deseos desde Square (guardada en customer.note como JSON)
async function getWishlistFromSquare(customerId) {
    try {
        const response = await squareApiCall(`/v2/customers/${customerId}`, 'GET');
        
        if (response && response.customer && response.customer.note) {
            try {
                const noteData = JSON.parse(response.customer.note);
                if (noteData.wishlist && Array.isArray(noteData.wishlist)) {
                    return noteData.wishlist;
                }
            } catch (e) {
                // Si no es JSON válido, intentar parsear como array directo
                console.warn('Note no es JSON válido, intentando otro formato');
            }
        }
        
        // Si no hay wishlist en Square, verificar localStorage como fallback
        const localWishlist = JSON.parse(localStorage.getItem('tropiplus_wishlist')) || [];
        return localWishlist;
        
    } catch (error) {
        console.error('Error obteniendo wishlist desde Square:', error);
        // Fallback a localStorage
        const localWishlist = JSON.parse(localStorage.getItem('tropiplus_wishlist')) || [];
        return localWishlist;
    }
}

// Guardar lista de deseos en Square (en customer.note)
async function saveWishlistToSquare(customerId, wishlist) {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // Obtener nota actual del cliente
        const customerResponse = await squareApiCall(`/v2/customers/${customerId}`, 'GET');
        let noteData = {};
        
        if (customerResponse && customerResponse.customer && customerResponse.customer.note) {
            try {
                noteData = JSON.parse(customerResponse.customer.note);
            } catch (e) {
                // Si no es JSON, crear nuevo objeto
                noteData = {};
            }
        }
        
        // Actualizar wishlist en note
        noteData.wishlist = wishlist;
        noteData.lastUpdated = new Date().toISOString();
        
        // Actualizar cliente en Square
        await squareApiCall(
            `/v2/customers/${customerId}`,
            'PUT',
            {
                note: JSON.stringify(noteData)
            }
        );
        
        // También guardar en localStorage como backup
        localStorage.setItem('tropiplus_wishlist', JSON.stringify(wishlist));
        
        console.log('✅ Lista de deseos guardada en Square');
        
    } catch (error) {
        console.error('Error guardando wishlist en Square:', error);
        // Fallback: solo guardar en localStorage
        localStorage.setItem('tropiplus_wishlist', JSON.stringify(wishlist));
    }
}

// Remover producto de lista de deseos
async function removeFromWishlist(productId) {
    try {
        const user = getCurrentUser();
        if (!user || !user.id) return;
        
        const wishlist = await getWishlistFromSquare(user.id);
        const updatedWishlist = wishlist.filter(id => id !== productId);
        
        await saveWishlistToSquare(user.id, updatedWishlist);
        
        // Actualizar localStorage también
        localStorage.setItem('tropiplus_wishlist', JSON.stringify(updatedWishlist));
        
        // Si existe la función global, actualizarla
        if (typeof updateWishlistUI === 'function') {
            updateWishlistUI();
        }
        
    } catch (error) {
        console.error('Error removiendo de wishlist:', error);
    }
}

// Hacer funciones disponibles globalmente
window.getWishlistFromSquare = getWishlistFromSquare;
window.saveWishlistToSquare = saveWishlistToSquare;
window.removeFromWishlist = removeFromWishlist;
