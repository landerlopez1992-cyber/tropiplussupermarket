// Funcionalidad principal Supermarket23

document.addEventListener('DOMContentLoaded', function() {
    initCartSidebar();
    initSearch();
    initCarousels();
    initCategoriesScroll();
    initCategoriesSidebar();
    initMainMenu();
    initUserAccount();
});

function initUserAccount() {
    const userAccountLink = document.getElementById('user-account-link');
    const userAccountText = document.getElementById('user-account-text');
    
    if (userAccountLink && userAccountText) {
        // Verificar si el usuario está logueado
        if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
            const user = getCurrentUser();
            if (user) {
                const userName = user.given_name || user.email || 'Usuario';
                userAccountText.textContent = userName;
                userAccountLink.href = 'account.html';
                console.log('✅ Usuario logueado, enlace configurado a account.html');
            } else {
                console.warn('⚠️ Usuario logueado pero no se encontraron datos');
                userAccountLink.href = 'login.html';
            }
        } else {
            console.log('👤 Usuario no logueado, enlace a login.html');
            userAccountLink.href = 'login.html';
            userAccountText.textContent = 'Entrar Registrar';
        }
    } else {
        console.error('❌ No se encontraron elementos user-account-link o user-account-text');
    }
}

function initCartSidebar() {
    const cartTrigger = document.getElementById('cart-trigger');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCart = document.getElementById('close-cart');
    const cartGoToBtn = document.getElementById('cart-go-to-btn');
    const cartPayBtn = document.getElementById('cart-pay-btn');
    
    if (cartTrigger) {
        cartTrigger.addEventListener('click', () => {
            if (cartSidebar) cartSidebar.classList.add('open');
            if (cartOverlay) cartOverlay.classList.add('active');
            // Actualizar contenido del carrito al abrir
            if (typeof updateCartContent === 'function') {
                updateCartContent();
            }
        });
    }
    
    if (closeCart) {
        closeCart.addEventListener('click', () => {
            if (cartSidebar) cartSidebar.classList.remove('open');
            if (cartOverlay) cartOverlay.classList.remove('active');
        });
    }
    
    if (cartOverlay) {
        cartOverlay.addEventListener('click', () => {
            if (cartSidebar) cartSidebar.classList.remove('open');
            cartOverlay.classList.remove('active');
        });
    }
    
    // Botón "Ir al carro" - navegar a la página de carrito completa
    if (cartGoToBtn) {
        cartGoToBtn.addEventListener('click', () => {
            window.location.href = 'cart.html';
        });
    }
    
    // Botón "Pagar" - iniciar proceso de pago con Square
    if (cartPayBtn) {
        cartPayBtn.addEventListener('click', () => {
            // Obtener carrito desde localStorage
            let shoppingCart = JSON.parse(localStorage.getItem('tropiplus_cart')) || [];
            
            console.log('🛒 Botón "Pagar" presionado');
            console.log('📦 Carrito actual:', shoppingCart.length, 'items');
            console.log('🔍 Contenido del carrito:', JSON.stringify(shoppingCart, null, 2));
            
            if (!shoppingCart || shoppingCart.length === 0) {
                alert('Tu carrito está vacío');
                return;
            }
            
            // Asegurar que el carrito esté guardado en localStorage
            localStorage.setItem('tropiplus_cart', JSON.stringify(shoppingCart));
            console.log('💾 Carrito guardado en localStorage antes de navegar');
            
            // Verificar que se guardó correctamente
            const verifyCart = localStorage.getItem('tropiplus_cart');
            console.log('✅ Verificación - Carrito en localStorage:', verifyCart ? JSON.parse(verifyCart).length + ' items' : 'vacío');
            
            // Pequeño delay para asegurar que se guarde
            setTimeout(() => {
                console.log('🚀 Navegando a checkout.html...');
                window.location.href = 'checkout.html';
            }, 100);
        });
    }
}

function initSearch() {
    const searchInput = document.getElementById('main-search');
    const searchBtn = document.querySelector('.main-search-btn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput?.value || '');
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
    }
}

function performSearch(query) {
    console.log('Buscando:', query);
    // Implementar búsqueda con Square API
}

function initCarousels() {
    // Carousel de más vendidos
    const bestSellersCarousel = document.getElementById('best-sellers-carousel');
    const bestSellersPrev = document.querySelector('#best-sellers-carousel')?.closest('.best-sellers-section')?.querySelector('.prev-btn');
    const bestSellersNext = document.querySelector('#best-sellers-carousel')?.closest('.best-sellers-section')?.querySelector('.next-btn');
    
    if (bestSellersCarousel && bestSellersPrev && bestSellersNext) {
        let scrollAmount = 0;
        const scrollStep = 240;
        
        bestSellersNext.addEventListener('click', () => {
            scrollAmount += scrollStep;
            bestSellersCarousel.scrollTo({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
        
        bestSellersPrev.addEventListener('click', () => {
            scrollAmount = Math.max(0, scrollAmount - scrollStep);
            bestSellersCarousel.scrollTo({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
    }
    
    // Carousel de recomendaciones
    const recommendationsCarousel = document.getElementById('recommendations-carousel');
    const recommendationsPrev = document.querySelector('#recommendations-carousel')?.closest('.recommendations-section')?.querySelector('.prev-btn');
    const recommendationsNext = document.querySelector('#recommendations-carousel')?.closest('.recommendations-section')?.querySelector('.next-btn');
    
    if (recommendationsCarousel && recommendationsPrev && recommendationsNext) {
        let scrollAmount = 0;
        const scrollStep = 240;
        
        recommendationsNext.addEventListener('click', () => {
            scrollAmount += scrollStep;
            recommendationsCarousel.scrollTo({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
        
        recommendationsPrev.addEventListener('click', () => {
            scrollAmount = Math.max(0, scrollAmount - scrollStep);
            recommendationsCarousel.scrollTo({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
    }
}

function initCategoriesScroll() {
    const categoriesScroll = document.getElementById('categories-scroll');
    if (!categoriesScroll) return;
    
    let isDown = false;
    let startX;
    let scrollLeft;
    
    categoriesScroll.addEventListener('mousedown', (e) => {
        isDown = true;
        categoriesScroll.style.cursor = 'grabbing';
        startX = e.pageX - categoriesScroll.offsetLeft;
        scrollLeft = categoriesScroll.scrollLeft;
    });
    
    categoriesScroll.addEventListener('mouseleave', () => {
        isDown = false;
        categoriesScroll.style.cursor = 'grab';
    });
    
    categoriesScroll.addEventListener('mouseup', () => {
        isDown = false;
        categoriesScroll.style.cursor = 'grab';
    });
    
    categoriesScroll.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - categoriesScroll.offsetLeft;
        const walk = (x - startX) * 2;
        categoriesScroll.scrollLeft = scrollLeft - walk;
    });
    
    categoriesScroll.style.cursor = 'grab';
}

function initMainMenu() {
    const hamburgerBtn = document.querySelector('.menu-hamburger');
    const mainMenuSidebar = document.getElementById('main-menu-sidebar');
    const mainMenuOverlay = document.getElementById('main-menu-overlay');
    const closeMainMenu = document.getElementById('close-main-menu');
    const openCategoriesFromMenu = document.getElementById('open-categories-from-menu');
    
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            if (mainMenuSidebar) mainMenuSidebar.classList.add('open');
            if (mainMenuOverlay) mainMenuOverlay.classList.add('active');
        });
    }
    
    if (closeMainMenu) {
        closeMainMenu.addEventListener('click', () => {
            if (mainMenuSidebar) mainMenuSidebar.classList.remove('open');
            if (mainMenuOverlay) mainMenuOverlay.classList.remove('active');
        });
    }
    
    if (mainMenuOverlay) {
        mainMenuOverlay.addEventListener('click', () => {
            if (mainMenuSidebar) mainMenuSidebar.classList.remove('open');
            mainMenuOverlay.classList.remove('active');
        });
    }
    
    // Abrir categorías desde el menú principal
    if (openCategoriesFromMenu) {
        openCategoriesFromMenu.addEventListener('click', (e) => {
            e.preventDefault();
            // Cerrar el menú principal
            if (mainMenuSidebar) mainMenuSidebar.classList.remove('open');
            if (mainMenuOverlay) mainMenuOverlay.classList.remove('active');
            // Abrir el sidebar de categorías
            setTimeout(() => {
                const categoriesSidebar = document.getElementById('categories-sidebar-panel');
                const categoriesOverlay = document.getElementById('categories-overlay');
                if (categoriesSidebar) categoriesSidebar.classList.add('open');
                if (categoriesOverlay) categoriesOverlay.classList.add('active');
            }, 300);
        });
    }
}

function initCategoriesSidebar() {
    const categoriesBtn = document.querySelector('.categories-main-btn');
    const categoriesSidebar = document.getElementById('categories-sidebar-panel');
    const categoriesOverlay = document.getElementById('categories-overlay');
    const closeCategories = document.getElementById('close-categories');
    const categoriesBack = document.getElementById('categories-back');
    
    if (categoriesBtn) {
        categoriesBtn.addEventListener('click', () => {
            console.log('📂 Abriendo categorías');
            if (categoriesSidebar) categoriesSidebar.classList.add('open');
            if (categoriesOverlay) categoriesOverlay.classList.add('active');
        });
    }
    
    if (closeCategories) {
        closeCategories.addEventListener('click', () => {
            console.log('❌ Cerrando categorías');
            if (categoriesSidebar) categoriesSidebar.classList.remove('open');
            if (categoriesOverlay) categoriesOverlay.classList.remove('active');
        });
    }
    
    if (categoriesOverlay) {
        categoriesOverlay.addEventListener('click', () => {
            console.log('🖱️ Click en overlay categorías');
            if (categoriesSidebar) categoriesSidebar.classList.remove('open');
            categoriesOverlay.classList.remove('active');
        });
    }
    
    if (categoriesBack) {
        categoriesBack.addEventListener('click', () => {
            // Volver a la vista de categorías principales
            const categoriesList = document.getElementById('categories-list');
            const subcategoriesList = document.getElementById('subcategories-list');
            const title = document.querySelector('.categories-panel-title');
            const sidebar = document.getElementById('categories-sidebar-panel');
            
            if (categoriesList) categoriesList.classList.remove('hidden');
            if (subcategoriesList) {
                subcategoriesList.classList.remove('visible');
                subcategoriesList.innerHTML = '';
            }
            if (title) title.textContent = 'Categorías';
            if (sidebar) sidebar.classList.remove('has-subcategories');
            categoriesBack.classList.remove('visible');
        });
    }
}

// Manejar cantidad de productos
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('qty-button')) {
        const qtyInput = e.target.parentElement.querySelector('.qty-number');
        if (!qtyInput) return;
        
        let currentValue = parseInt(qtyInput.value) || 1;
        
        if (e.target.textContent === '+') {
            currentValue++;
        } else if (e.target.textContent === '-') {
            currentValue = Math.max(1, currentValue - 1);
        }
        
        qtyInput.value = currentValue;
    }
});
