// Funcionalidad principal Tropiplus Supermarket

document.addEventListener('DOMContentLoaded', function() {
    initCartSidebar();
    initSearch();
    initCarousels();
    initHeroBannerCarousel();
    initCategoriesScroll();
    initCategoriesSidebar();
    initMainMenu();
    initUserAccount();
    initPromotionTicker();
});

function getPromotionConfig() {
    const fallback = {
        enabled: false,
        text: '',
        speed: 'normal',
        linkEnabled: false,
        url: ''
    };
    try {
        const raw = localStorage.getItem('tropiplus_promo_config');
        console.log('📋 [Tropiplus] Raw promotion config from localStorage:', raw);
        if (!raw) {
            console.log('⚠️ [Tropiplus] No hay configuración de promoción en localStorage');
            return fallback;
        }
        const parsed = JSON.parse(raw);
        console.log('📋 [Tropiplus] Parsed promotion config:', parsed);
        const parsedText = String(parsed.text || '').trim();
        const config = {
            // Compatibilidad: si hay texto guardado, la barra se considera activa.
            enabled: Boolean(parsed.enabled) || Boolean(parsedText),
            text: parsedText,
            speed: ['slow', 'normal', 'fast'].includes(parsed.speed) ? parsed.speed : 'normal',
            linkEnabled: Boolean(parsed.linkEnabled),
            url: String(parsed.url || '')
        };
        console.log('📋 [Tropiplus] Final promotion config:', config);
        return config;
    } catch (error) {
        console.error('❌ [Tropiplus] Error leyendo configuración de promoción:', error);
        return fallback;
    }
}

function initPromotionTicker() {
    console.log('🎯 Inicializando barra promocional...');
    
    // Esperar a que el DOM esté completamente cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(createPromotionBar, 200);
        });
    } else {
        setTimeout(createPromotionBar, 200);
    }
}

function createPromotionBar() {
    const config = getPromotionConfig();
    console.log('📋 Configuración de promoción:', config);
    console.log('📋 localStorage raw:', localStorage.getItem('tropiplus_promo_config'));
    
    const existing = document.getElementById('promo-ticker-bar');
    if (existing) {
        console.log('🗑️ Eliminando barra promocional existente');
        existing.remove();
    }

    if (!config.text || config.text.trim() === '') {
        console.log('⚠️ [Tropiplus] No hay texto de promoción configurado. Config:', config);
        console.log('💡 [Tropiplus] Para mostrar la promoción, ve a Admin > Promocion y configura el texto');
        return;
    }
    
    console.log('✅ [Tropiplus] Creando barra promocional con texto:', config.text.substring(0, 50) + '...');

    // Calcular duración basada en la velocidad configurada
    // La duración debe ser proporcional a la longitud del texto
    const baseDuration = {
        slow: 30,    // 30 segundos por 100 caracteres
        normal: 20,  // 20 segundos por 100 caracteres
        fast: 12     // 12 segundos por 100 caracteres
    };
    
    const textLength = config.text.length;
    const baseSpeed = baseDuration[config.speed] || baseDuration.normal;
    // Calcular duración: baseSpeed segundos por cada 100 caracteres, mínimo 8 segundos
    const calculatedDuration = Math.max(8, Math.round((textLength / 100) * baseSpeed));
    const duration = `${calculatedDuration}s`;
    
    console.log('⚡ [Tropiplus] Velocidad configurada:', config.speed);
    console.log('⚡ [Tropiplus] Longitud del texto:', textLength, 'caracteres');
    console.log('⚡ [Tropiplus] Duración calculada:', duration);

    const bar = document.createElement('div');
    bar.id = 'promo-ticker-bar';
    bar.className = 'promo-ticker-bar';
    bar.style.setProperty('--promo-duration', duration);
    bar.style.display = 'block';
    bar.style.visibility = 'visible';
    bar.style.opacity = '1';

    const track = document.createElement('div');
    track.className = 'promo-ticker-track';

    // Crear solo DOS copias del texto para que se repita suavemente
    // Separador entre repeticiones
    const separator = '   •   ';
    const textContent = `${config.text}${separator}${config.text}${separator}`;

    const createItem = () => {
        if (config.linkEnabled && config.url) {
            const link = document.createElement('a');
            link.className = 'promo-ticker-item promo-ticker-link';
            link.href = config.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = textContent;
            console.log('🔗 [Tropiplus] Creando enlace promocional:', config.url);
            return link;
        }
        const span = document.createElement('span');
        span.className = 'promo-ticker-item';
        span.textContent = textContent;
        return span;
    };

    // Solo crear UNA copia del item para que pase completo y luego se repita
    track.appendChild(createItem());
    bar.appendChild(track);

    // Intentar insertar después de la barra de navegación oscura
    const navBar = document.querySelector('.nav-bar-dark-blue');
    const categoriesBar = document.querySelector('.categories-yellow-bar');

    let inserted = false;
    if (navBar && navBar.parentNode) {
        // Insertar después de la barra de navegación, antes de la barra de categorías
        if (categoriesBar && categoriesBar.parentNode === navBar.parentNode) {
            navBar.parentNode.insertBefore(bar, categoriesBar);
            console.log('✅ Barra promocional insertada después de nav-bar, antes de categories-bar');
            inserted = true;
        } else {
            navBar.parentNode.insertBefore(bar, navBar.nextSibling);
            console.log('✅ Barra promocional insertada después de nav-bar');
            inserted = true;
        }
    } else if (categoriesBar && categoriesBar.parentNode) {
        categoriesBar.parentNode.insertBefore(bar, categoriesBar);
        console.log('✅ Barra promocional insertada antes de categories-bar');
        inserted = true;
    }
    
    if (!inserted) {
        // Fallback: insertar después del header
        const header = document.querySelector('header.main-header-section');
        if (header && header.parentNode) {
            if (header.nextSibling) {
                header.parentNode.insertBefore(bar, header.nextSibling);
            } else {
                header.parentNode.appendChild(bar);
            }
            console.log('✅ Barra promocional insertada después del header (fallback)');
        } else {
            const body = document.body;
            if (body.firstChild) {
                body.insertBefore(bar, body.firstChild);
            } else {
                body.appendChild(bar);
            }
            console.log('✅ Barra promocional insertada al inicio del body (fallback final)');
        }
    }
    
    // Verificar que se insertó correctamente
    const insertedElement = document.getElementById('promo-ticker-bar');
    if (insertedElement) {
        console.log('🎉 Barra promocional inicializada correctamente');
        console.log('📍 Elemento insertado:', insertedElement);
        console.log('📍 Estilos aplicados:', window.getComputedStyle(insertedElement).display);
        console.log('📍 Visibilidad:', window.getComputedStyle(insertedElement).visibility);
        console.log('📍 Opacidad:', window.getComputedStyle(insertedElement).opacity);
    } else {
        console.error('❌ ERROR: La barra promocional no se insertó correctamente');
    }
}

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
    
    // Agregar pestaña "Administrar" si el usuario es admin
    initAdminTab();
}

function initAdminTab() {
    // Verificar si el usuario es administrador
    if (typeof isUserAdmin === 'function' && isUserAdmin()) {
        const navLinksMain = document.querySelector('.nav-links-main');
        if (navLinksMain) {
            // Verificar si ya existe el enlace de administrar
            const existingAdminLink = navLinksMain.querySelector('.nav-link-item[href="admin.html"]');
            if (!existingAdminLink) {
                // Crear enlace de administrar
                const adminLink = document.createElement('a');
                adminLink.href = 'admin.html';
                adminLink.className = 'nav-link-item';
                adminLink.innerHTML = '<i class="fas fa-cog"></i> Admin';
                
                // Insertar después de "Todos los productos"
                const allProductsLink = navLinksMain.querySelector('a[href="products.html"]');
                if (allProductsLink) {
                    allProductsLink.insertAdjacentElement('afterend', adminLink);
                } else {
                    // Si no existe, insertar al principio
                    navLinksMain.insertBefore(adminLink, navLinksMain.firstChild);
                }
            }
        }
    } else {
        // Remover enlace de administrar si el usuario no es admin
        const adminLink = document.querySelector('.nav-link-item[href="admin.html"]');
        if (adminLink) {
            adminLink.remove();
        }
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
    if (!query || query.trim() === '') return;
    
    // Filtrar productos que contengan el término de búsqueda
    const searchTerm = query.toLowerCase().trim();
    
    // Si la búsqueda es "remesa", redirigir al botón de remesa
    if (searchTerm.includes('remesa')) {
        const remesaBtn = document.getElementById('remesa-btn');
        if (remesaBtn) {
            remesaBtn.click();
            return;
        }
    }
    
    // Filtrar productos de Square (excluyendo Remesa)
    const filteredProducts = squareProducts.filter(product => {
        const itemData = product.item_data;
        if (!itemData) return false;
        const name = itemData.name?.toLowerCase() || '';
        // Excluir Remesa de las búsquedas
        if (name.includes('remesa')) return false;
        // Buscar coincidencias
        return name.includes(searchTerm);
    });
    
    // Guardar resultados en localStorage y navegar a products.html
    localStorage.setItem('tropiplus_search_results', JSON.stringify(filteredProducts));
    localStorage.setItem('tropiplus_search_query', query);
    window.location.href = `products.html?search=${encodeURIComponent(query)}`;
}

function initHeroBannerCarousel() {
    const carousel = document.getElementById('hero-banner-carousel');
    const slides = carousel?.querySelectorAll('.hero-banner-slide');
    const dots = document.querySelectorAll('.hero-carousel-dots .carousel-dot');
    
    if (!carousel || !slides || slides.length === 0) return;
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    
    // Función para cambiar de slide
    function showSlide(index) {
        // Remover active de todos los slides
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === index) {
                setTimeout(() => {
                    slide.classList.add('active');
                }, 50);
            }
        });
        
        // Actualizar dots
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }
    
    // Función para siguiente slide
    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        showSlide(currentSlide);
    }
    
    // Event listeners para los dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
        });
    });
    
    // Auto-play cada 5 segundos
    setInterval(nextSlide, 5000);
    
    // Inicializar primer slide
    showSlide(0);
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
