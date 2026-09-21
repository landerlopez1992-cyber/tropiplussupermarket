// Funcionalidad principal TropiParts

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
    initPromotionalBanners();
    initFeaturedCards();
});

function getPromotionConfig() {
    const fallback = {
        enabled: false,
        text: '',
        speed: 'normal',
        fontSize: '14px',
        textColor: '#ffffff',
        bgColor: '#1f318a',
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
            fontSize: String(parsed.fontSize || '14px'),
            textColor: String(parsed.textColor || '#ffffff'),
            bgColor: String(parsed.bgColor || '#1f318a'),
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
    // NO mostrar ticker en admin.html
    if (window.location.pathname.includes('admin.html') || window.location.pathname.includes('/admin')) {
        console.log('⚠️ [Tropiplus] Ticker promocional deshabilitado en admin');
        return;
    }
    
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

    // Verificar si está habilitado y si hay texto
    if (!config.enabled || !config.text || config.text.trim() === '') {
        console.log('⚠️ [Tropiplus] Promoción deshabilitada o sin texto. Config:', config);
        console.log('💡 [Tropiplus] Para mostrar la promoción, ve a Admin > Promocion y configura el texto');
        return;
    }
    
    console.log('✅ [Tropiplus] Creando barra promocional con texto:', config.text.substring(0, 50) + '...');

    // Calcular duración basada en la velocidad configurada
    // Usar los mismos valores que en admin.js para consistencia
    const durationBySpeed = {
        slow: '30s',    // Lento: 30 segundos
        normal: '20s',  // Normal: 20 segundos
        fast: '12s'     // Rápido: 12 segundos
    };
    
    const duration = durationBySpeed[config.speed] || durationBySpeed.normal;
    
    console.log('⚡ [Tropiplus] Velocidad configurada:', config.speed);
    console.log('⚡ [Tropiplus] Duración aplicada:', duration);

    const bar = document.createElement('div');
    bar.id = 'promo-ticker-bar';
    bar.className = 'promo-ticker-bar';
    bar.style.setProperty('--promo-duration', duration);
    bar.style.backgroundColor = config.bgColor || '#1f318a';
    bar.style.display = 'block';
    bar.style.visibility = 'visible';
    bar.style.opacity = '1';

    const track = document.createElement('div');
    track.className = 'promo-ticker-track';

    // Usar solo el texto original, sin duplicar
    const textContent = config.text;

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
        span.style.color = config.textColor || '#ffffff';
        span.style.fontSize = config.fontSize || '14px';
        return span;
    };

    // Crear solo UNA copia del texto
    track.appendChild(createItem());
    bar.appendChild(track);
    
    // Asegurar que el track tenga el ancho correcto para la animación
    // Esperar a que se inserte en el DOM para calcular el ancho
    setTimeout(() => {
        const trackWidth = track.scrollWidth;
        if (trackWidth > 0) {
            track.style.width = `${trackWidth}px`;
            console.log('📏 [Tropiplus] Ancho del track calculado:', trackWidth, 'px');
        }
    }, 100);

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
    const buildHeaderUserName = (user) => {
        if (!user) return 'Usuario';
        const givenName = String(user.given_name || '').trim();
        const familyName = String(user.family_name || '').trim();
        if (givenName && familyName) {
            return `${givenName} ${familyName.charAt(0)}.`;
        }
        if (givenName) return givenName;
        if (user.email) {
            return String(user.email).split('@')[0];
        }
        return 'Usuario';
    };
    
    if (userAccountLink && userAccountText) {
        // Verificar si el usuario está logueado
        if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
            const user = getCurrentUser();
            if (user) {
                const userName = buildHeaderUserName(user);
                userAccountText.textContent = userName;
                userAccountLink.href = 'account.html';
                userAccountLink.classList.add('user-logged-in');
                console.log('✅ Usuario logueado, enlace configurado a account.html');
            } else {
                console.warn('⚠️ Usuario logueado pero no se encontraron datos');
                userAccountLink.href = 'login.html';
                userAccountLink.classList.remove('user-logged-in');
            }
        } else {
            console.log('👤 Usuario no logueado, enlace a login.html');
            userAccountLink.href = 'login.html';
            userAccountText.textContent = 'Entrar Registrar';
            userAccountLink.classList.remove('user-logged-in');
        }
    } else {
        console.error('❌ No se encontraron elementos user-account-link o user-account-text');
    }
    
    // Botón Servicio (solo empleados)
    initServiceButton();
    // Agregar pestaña "Administrar" si el usuario es admin
    initAdminTab();
}

function initServiceButton() {
    const section = document.querySelector('.header-user-section');
    if (!section) return;

    let btn = document.getElementById('service-staff-btn');
    const canSee = typeof isUserEmployee === 'function' && isUserEmployee();

    if (!canSee) {
        if (btn) btn.remove();
        return;
    }

    if (!btn) {
        btn = document.createElement('a');
        btn.id = 'service-staff-btn';
        btn.href = 'servicio.html';
        btn.className = 'service-staff-btn';
        btn.innerHTML = '<i class="fas fa-wrench"></i><span>Servicio</span>';
        const cart = section.querySelector('#cart-trigger') || section.querySelector('.cart-icon-wrapper');
        if (cart && cart.nextSibling) {
            section.insertBefore(btn, cart.nextSibling);
        } else if (cart) {
            cart.after(btn);
        } else {
            section.appendChild(btn);
        }
    }
}

function initAdminTab() {
    // Ya no agregamos el enlace de Admin en el nav
    // El enlace de Admin ahora está en el perfil (account.html)
    // Solo removemos si existe en el nav
    const adminLink = document.querySelector('.nav-link-item[href="admin.html"]');
    if (adminLink) {
        adminLink.remove();
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

// ============================================
// FUNCIONES PARA BANNERS PROMOCIONALES
// ============================================

async function initPromotionalBanners() {
    // Solo cargar banners en index.html
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/' && !window.location.pathname.endsWith('/')) {
        return;
    }
    
    try {
        const banners = await getBannersFromStorage();
        
        if (banners.length === 0) {
            console.log('⚠️ [Banners] No hay banners configurados');
            return;
        }
        
        // Ordenar banners por display_order
        const sortedBanners = [...banners].sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
        
        renderPromotionalBanners(sortedBanners);
        startBannerRotation(sortedBanners);
    } catch (error) {
        console.error('❌ [Banners] Error cargando banners:', error);
    }
}

async function getBannersFromStorage() {
    try {
        if (typeof window.getHomeBannersFromFirebase === 'function' && window.isFirebaseConfigured?.()) {
            const data = await window.getHomeBannersFromFirebase(true);
            console.log('✅ [Banners] Firebase:', data.length);
            return data;
        }
        const localBanners = localStorage.getItem('tropiparts_banners');
        if (localBanners) {
            return JSON.parse(localBanners).filter(b => b.active !== false);
        }
        return [];
    } catch (error) {
        console.warn('⚠️ [Banners] Error, localStorage:', error);
        const localBanners = localStorage.getItem('tropiparts_banners');
        return localBanners ? JSON.parse(localBanners).filter(b => b.active !== false) : [];
    }
}

function renderPromotionalBanners(banners) {
    const bannersRow = document.getElementById('dynamic-banners-row') || document.querySelector('.banners-row');
    if (!bannersRow) {
        console.warn('⚠️ [Banners] No se encontró contenedor de banners');
        return;
    }
    
    if (!banners || banners.length === 0) {
        return;
    }

    bannersRow.style.display = 'flex';
    bannersRow.innerHTML = '';
    
    banners.forEach((banner, index) => {
        const bannerCard = document.createElement('a');
        bannerCard.className = 'az-promo-tile';
        bannerCard.href = banner.redirect_url || 'products.html';
        if (banner.redirect_url) bannerCard.target = '_blank';
        
        if (banner.image_url) {
            const img = document.createElement('img');
            img.src = banner.image_url;
            img.alt = `Banner ${index + 1}`;
            bannerCard.appendChild(img);
        }
        bannersRow.appendChild(bannerCard);
    });
    
    console.log(`✅ [Banners] ${banners.length} banner(es) renderizado(s)`);
}

function startBannerRotation(banners) {
    if (banners.length <= 1) {
        return; // No hay necesidad de rotar si hay 1 o menos banners
    }
    
    // Obtener intervalo de transición
    const savedInterval = localStorage.getItem('tropiparts_banner_transition_interval');
    const intervalSeconds = savedInterval ? parseInt(savedInterval) : 5;
    const intervalMs = intervalSeconds * 1000;
    
    console.log(`✅ [Banners] Rotación configurada (intervalo: ${intervalSeconds}s)`);
}

// ============================================
// FUNCIONES PARA TARJETAS DESTACADAS
// ============================================

async function initFeaturedCards() {
    // Solo cargar tarjetas en index.html
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/' && !window.location.pathname.endsWith('/')) {
        return;
    }
    
    try {
        const cards = await getFeaturedCardsFromHomeStorage();
        
        if (cards.length === 0) {
            console.log('⚠️ [Featured Cards] No hay tarjetas configuradas');
            return;
        }
        
        // Ordenar tarjetas por display_order
        const sortedCards = [...cards].sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
        
        renderFeaturedCards(sortedCards);
    } catch (error) {
        console.error('❌ [Featured Cards] Error cargando tarjetas:', error);
    }
}

async function getFeaturedCardsFromHomeStorage() {
    try {
        if (typeof window.getFeaturedCardsFromFirebase === 'function' && window.isFirebaseConfigured?.()) {
            const data = await window.getFeaturedCardsFromFirebase(true);
            console.log('✅ [Featured Cards] Firebase:', data.length);
            return data;
        }
        const localCards = localStorage.getItem('tropiparts_featured_cards');
        if (localCards) {
            return JSON.parse(localCards).filter(c => c.active !== false);
        }
        return [];
    } catch (error) {
        console.warn('⚠️ [Featured Cards] Error, localStorage:', error);
        const localCards = localStorage.getItem('tropiparts_featured_cards');
        return localCards ? JSON.parse(localCards).filter(c => c.active !== false) : [];
    }
}

function renderFeaturedCards(cards) {
    const carouselTrack = document.getElementById('best-sellers-carousel');
    if (!carouselTrack) {
        console.warn('⚠️ [Featured Cards] No se encontró #best-sellers-carousel');
        return;
    }
    
    // Limpiar contenido existente
    carouselTrack.innerHTML = '';
    
    if (cards.length === 0) {
        return;
    }
    
    // Crear tarjetas dinámicamente
    cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'product-card-item';
        cardElement.style.cursor = card.redirect_url ? 'pointer' : 'default';
        
        if (card.redirect_url) {
            cardElement.addEventListener('click', () => {
                window.open(card.redirect_url, '_blank');
            });
        }
        
        cardElement.innerHTML = `
            <div class="product-image-container">
                <img src="${card.image_url}" alt="Producto destacado ${index + 1}" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\'%3E%3Crect fill=\\'%23e0e0e0\\' width=\\'200\\' height=\\'200\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\' font-size=\\'14\\'%3EImagen no disponible%3C/text%3E%3C/svg%3E'"
                     style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div class="product-info">
                <div class="product-price-container">
                    <span class="product-price-main">Producto Destacado</span>
                </div>
                <div class="product-actions-row">
                    <div class="quantity-selector">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="1" min="1" readonly>
                        <button class="qty-btn plus">+</button>
                    </div>
                    <button class="add-to-cart-btn" style="opacity: 0.5; cursor: not-allowed;" disabled>
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                    <button class="favorite-btn">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
            </div>
        `;
        
        carouselTrack.appendChild(cardElement);
    });
    
    console.log(`✅ [Featured Cards] ${cards.length} tarjeta(s) renderizada(s)`);
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


// TropiParts hero carousel controls
document.addEventListener('DOMContentLoaded', function() {
    const slides = document.querySelectorAll('#hero-banner-carousel .hero-banner-slide');
    const dots = document.querySelectorAll('.hero-az-carousel .carousel-dot');
    if (!slides.length) return;
    let idx = 0;
    function show(i) {
        idx = (i + slides.length) % slides.length;
        slides.forEach((s, n) => s.classList.toggle('active', n === idx));
        dots.forEach((d, n) => d.classList.toggle('active', n === idx));
    }
    document.getElementById('az-hero-prev')?.addEventListener('click', () => show(idx - 1));
    document.getElementById('az-hero-next')?.addEventListener('click', () => show(idx + 1));
    dots.forEach((d, n) => d.addEventListener('click', () => show(n)));
    setInterval(() => show(idx + 1), 5500);
});
