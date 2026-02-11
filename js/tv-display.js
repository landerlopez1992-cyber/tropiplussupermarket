const TV_CACHE_KEY = 'tropiplus_tv_configs_cache_v2';
const TV_SELECTED_KEY = 'tropiplus_tv_selected';

let currentTvConfig = null;
let allTvProducts = [];
let allTvOrders = [];
let allQrConfigs = [];
let tvSlideIndex = 0;
let tvMixedModeIndex = 0;
let tvSlideTimer = null;
const imageCache = {};

// Índices para rotación completa de cada sección en modo mixto
let tvProductsRotationIndex = 0; // Para rotar productos aleatoriamente
let tvOrdersRotationIndex = 0; // Para rotar todas las órdenes
let tvQrRotationIndex = 0; // Para rotar todos los QRs
let tvPromoRotationIndex = 0; // Para rotar promociones

function checkStoreHours() {
  // Modo live-only: no dependemos de configuraciones locales para evitar inconsistencias por navegador.
  return false;
}

// Mostrar pantalla de cerrado
function showClosedScreen() {
  const gridEl = document.getElementById('tv-products-grid');
  const tickerContainer = document.querySelector('.tv-footer-ticker');
  
  if (gridEl) {
    gridEl.innerHTML = `
      <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; height: 100%; background: #d32f2f; border-radius: 20px;">
        <div style="text-align: center;">
          <h1 style="font-size: clamp(48px, 8vw, 120px); font-weight: 900; color: #ffffff; margin: 0; text-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            CERRADO
          </h1>
          <p style="font-size: clamp(24px, 3vw, 48px); color: rgba(255,255,255,0.9); margin-top: 20px;">
            Volveremos pronto
          </p>
        </div>
      </div>
    `;
  }
  
  if (tickerContainer) {
    tickerContainer.style.display = 'none';
  }
  
  console.log('🔴 [TV] Mostrando pantalla de cerrado');
}

// Cargar pedidos para mostrar en TV
async function loadOrdersForTv() {
  try {
    if (typeof window.squareApiCall === 'undefined') {
      console.error('❌ [TV] squareApiCall no disponible');
      allTvOrders = [];
      return;
    }
    
    const locationId = window.SQUARE_CONFIG?.locationId || 'L94DY3ZD6WS85';
    const response = await window.squareApiCall('/v2/orders/search', 'POST', {
      location_ids: [locationId],
      query: {
        filter: {
          state_filter: {
            states: ['OPEN', 'DRAFT']
          }
        }
      },
      limit: 50
    });
    
    if (response && response.orders) {
      // Filtrar solo pedidos de pickup que no estén completados
      allTvOrders = response.orders.filter(order => {
        const fulfillments = order.fulfillments || [];
        const hasPickup = fulfillments.some(f => f.type === 'PICKUP');
        const isCompleted = order.state === 'COMPLETED';
        return hasPickup && !isCompleted;
      });
      
      console.log('✅ [TV] Pedidos cargados:', allTvOrders.length);
    } else {
      allTvOrders = [];
    }
  } catch (error) {
    console.error('❌ [TV] Error cargando pedidos:', error);
    allTvOrders = [];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTvScreen().catch((error) => {
    console.error('Error inicializando pantalla TV:', error);
  });
});

async function getTvConfigs() {
  if (typeof window.getTvConfigsFromSupabase !== 'function') {
    throw new Error('Supabase no está disponible en pantalla TV');
  }

  const tvs = await window.getTvConfigsFromSupabase();
  if (Array.isArray(tvs)) {
    localStorage.setItem(TV_CACHE_KEY, JSON.stringify(tvs));
    console.log('✅ [TV] Configuración cargada desde Supabase:', tvs.length);
    return tvs;
  }
  return [];
}

function getPromoConfig() {
  const text = String(currentTvConfig?.promoText || '').trim();
  return {
    enabled: Boolean(text),
    text,
    speed: 'normal',
    fontSize: String(currentTvConfig?.tickerFontSize || '28px'),
    textColor: String(currentTvConfig?.tickerTextColor || '#ffec67'),
    bgColor: String(currentTvConfig?.tickerBgColor || '#000000')
  };
}

function getTvIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('tv') || localStorage.getItem(TV_SELECTED_KEY) || '';
}

function updateClock() {
  const clockEl = document.getElementById('tv-clock');
  const now = new Date();
  const formatted = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
  clockEl.textContent = formatted;
}

async function initTvScreen() {
  updateClock();
  setInterval(updateClock, 15000);

  const tvId = getTvIdFromUrl();
  const configs = await getTvConfigs(); // Ahora es async

  if (!tvId) {
    await openTvSelector(configs);
    return;
  }

  const selected = configs.find(item => item.id === tvId);
  if (!selected) {
    await openTvSelector(configs);
    return;
  }

  currentTvConfig = selected;
  localStorage.setItem(TV_SELECTED_KEY, selected.id);
  document.getElementById('tv-title').textContent = `Tropiplus TV - ${selected.name}`;

  console.log('📺 [TV] Configuración del TV cargada:', selected);
  console.log('📺 [TV] Ticker config:', {
    enabled: selected.tickerEnabled,
    speed: selected.tickerSpeed,
    fontSize: selected.tickerFontSize,
    textColor: selected.tickerTextColor,
    bgColor: selected.tickerBgColor
  });

  // Aplicar orientación de pantalla
  applyScreenOrientation(selected.screenOrientation || 'landscape');

  // Verificar horario de la tienda
  const isClosed = checkStoreHours();
  if (isClosed) {
    showClosedScreen();
    return;
  }

  configureTicker(selected);
  
  // Cargar contenido según el modo
  if (selected.mode === 'orders') {
    await loadOrdersForTv();
  } else if (selected.mode === 'qr') {
    // No necesita cargar productos
  } else if (selected.mode === 'mixed') {
    // Modo mixed: cargar todo para rotación automática
    await loadProductsForTv(selected);
    await loadOrdersForTv();
    allQrConfigs = loadQrConfigs();
    console.log('📦 [TV] Modo mixed - Productos:', allTvProducts.length, 'Pedidos:', allTvOrders.length, 'QRs:', allQrConfigs.length);
  } else {
    await loadProductsForTv(selected);
    console.log('📦 [TV] Productos cargados:', allTvProducts.length);
  }
  
  // Renderizar grid inicial (en mixed no avanzar modo en primer render)
  await renderProductsGrid(selected.mode !== 'mixed');
  startTvRotation(selected);
  startAutoRefresh(selected.id);
}

async function openTvSelector(configs) {
  const overlay = document.getElementById('tv-select-overlay');
  const selector = document.getElementById('tv-selector');
  const openBtn = document.getElementById('tv-selector-open');
  const fullscreenBtn = document.getElementById('tv-fullscreen-btn');
  overlay.classList.add('active');

  const activeConfigs = configs ? configs.filter(item => item.active !== false) : [];
  
  selector.innerHTML = activeConfigs.length
    ? activeConfigs.map(tv => `<option value="${tv.id}">${tv.name}</option>`).join('')
    : '<option value="">No hay TVs activos</option>';

  openBtn.onclick = () => {
    const selectedId = selector.value;
    if (!selectedId) return;
    localStorage.setItem(TV_SELECTED_KEY, selectedId);
    window.location.href = `tv.html?tv=${encodeURIComponent(selectedId)}`;
  };

  fullscreenBtn.onclick = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (_error) {
      // Ignore fullscreen errors
    }
  };
}

function applyScreenOrientation(orientation) {
  const root = document.documentElement;
  const body = document.body;
  const tvRoot = document.querySelector('.tv-root');
  
  // Remover atributo anterior
  body.removeAttribute('data-orientation');
  
  if (orientation === 'portrait') {
    // Modo vertical: usar viewport completo y rotar
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Si el viewport es más ancho que alto, rotamos 90 grados
    if (viewportWidth > viewportHeight) {
      // Rotar el body completo usando transform
      body.style.transform = 'rotate(90deg)';
      body.style.transformOrigin = 'center center';
      body.style.width = `${viewportHeight}px`;
      body.style.height = `${viewportWidth}px`;
      body.style.position = 'fixed';
      body.style.top = '50%';
      body.style.left = '50%';
      body.style.marginTop = `-${viewportWidth / 2}px`;
      body.style.marginLeft = `-${viewportHeight / 2}px`;
      body.style.overflow = 'hidden';
      body.setAttribute('data-orientation', 'portrait');
      
      // Asegurar que el root use todo el espacio disponible
      root.style.width = '100%';
      root.style.height = '100%';
      root.style.overflow = 'hidden';
      
      // Ajustar el contenedor principal para aprovechar todo el espacio
      if (tvRoot) {
        tvRoot.style.width = '100vw';
        tvRoot.style.height = '100vh';
        tvRoot.style.maxWidth = 'none';
        tvRoot.style.maxHeight = 'none';
      }
      
      console.log('📱 [TV] Orientación aplicada: vertical (portrait)', {
        viewportWidth,
        viewportHeight,
        rotatedWidth: viewportHeight,
        rotatedHeight: viewportWidth
      });
    } else {
      // Ya está en vertical, solo ajustar layout
      body.setAttribute('data-orientation', 'portrait');
      if (tvRoot) {
        tvRoot.style.width = '100vw';
        tvRoot.style.height = '100vh';
      }
      console.log('📱 [TV] Ya está en modo vertical, ajustando layout');
    }
  } else {
    // Modo horizontal: normal - remover todas las transformaciones
    body.style.transform = '';
    body.style.transformOrigin = '';
    body.style.width = '';
    body.style.height = '';
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.marginTop = '';
    body.style.marginLeft = '';
    body.style.overflow = '';
    body.setAttribute('data-orientation', 'landscape');
    
    root.style.width = '';
    root.style.height = '';
    root.style.overflow = '';
    
    if (tvRoot) {
      tvRoot.style.width = '';
      tvRoot.style.height = '';
      tvRoot.style.maxWidth = '';
      tvRoot.style.maxHeight = '';
    }
    
    console.log('📺 [TV] Orientación aplicada: horizontal (landscape)');
  }
  
  // Forzar re-renderizado del contenido después de un breve delay
  setTimeout(() => {
    if (typeof renderProductsGrid === 'function') {
      renderProductsGrid();
    }
    // Ajustar viewport si es necesario
    window.dispatchEvent(new Event('resize'));
  }, 150);
}

function configureTicker(tvConfig) {
  const tickerContainer = document.querySelector('.tv-footer-ticker');
  const ticker = document.getElementById('tv-ticker-track');
  const textA = document.getElementById('tv-ticker-text');
  const textB = document.getElementById('tv-ticker-text-2');

  // Verificar si el ticker está habilitado explícitamente
  const tickerEnabled = tvConfig.tickerEnabled !== false;
  
  if (!tickerEnabled || !tickerContainer) {
    if (tickerContainer) {
      tickerContainer.style.display = 'none';
    }
    console.log('⚠️ [TV] Ticker deshabilitado en configuración');
    return;
  }

  // Verificar si hay texto promocional (SOLO desde BD, sin fallbacks demo)
  const customText = (tvConfig.promoText || '').trim();
  
  // NO usar fallbacks demo - solo mostrar si hay texto real en BD
  if (!customText || customText.trim() === '') {
    if (tickerContainer) {
      tickerContainer.style.display = 'none';
    }
    console.log('⚠️ [TV] No hay texto promocional configurado - ticker oculto');
    return;
  }

  // Si llegamos aquí, hay texto promocional real y ticker habilitado
  tickerContainer.style.display = 'flex';
  const text = customText;
  
  // Solo DOS copias del texto para que pase completo y luego se repita suavemente
  const separator = '   •   ';
  const finalTicker = `${text}${separator}${text}${separator}`;

  if (textA) textA.textContent = finalTicker;
  if (textB) textB.textContent = finalTicker;

  // Usar la velocidad del TV desde BD (sin fallbacks)
  const speed = tvConfig.tickerSpeed || 'normal';
  
  // Usar los mismos valores de duración que en la web principal
  const durationBySpeed = {
    slow: '30s',    // Lento: 30 segundos
    normal: '20s',  // Normal: 20 segundos
    fast: '12s'     // Rápido: 12 segundos
  };
  
  const duration = durationBySpeed[speed] || durationBySpeed.normal;
  
  console.log('⚡ [TV] Velocidad configurada:', speed, '(desde BD)');
  console.log('⚡ [TV] Duración aplicada:', duration);
  
  if (ticker) {
    ticker.style.setProperty('--tv-ticker-duration', duration);
    
    // Aplicar estilos personalizados
    const fontSize = tvConfig.tickerFontSize || '28px';
    const textColor = tvConfig.tickerTextColor || '#ffec67';
    const bgColor = tvConfig.tickerBgColor || '#000000';
    
    ticker.style.fontSize = fontSize;
    ticker.style.color = textColor;
    if (tickerContainer) {
      tickerContainer.style.backgroundColor = bgColor;
    }
    
    console.log('🎨 [TV] Estilos aplicados - Tamaño:', fontSize, 'Color texto:', textColor, 'Color fondo:', bgColor);
  }

  // Nota: El ticker ya está configurado arriba con el texto de BD
  // No necesitamos lógica especial para modo 'products' - si hay texto, se muestra
}

async function loadProductsForTv(tvConfig) {
  try {
    // Modo live-only: consultar API en vivo en cada recarga (tiempo real)
    let items = [];
    
    // Esperar a que squareApiCall esté disponible
    let retries = 0;
    while (typeof window.squareApiCall === 'undefined' && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (typeof window.squareApiCall === 'function') {
      // Cargar directamente desde Square API (tiempo real)
      console.log('⏳ [TV] Cargando productos desde Square API (tiempo real)...');
      try {
        // Usar query más amplia para obtener todos los productos
        const response = await window.squareApiCall('/v2/catalog/search', 'POST', {
          object_types: ['ITEM'],
          limit: 1000
        });
        items = response?.objects || [];
        console.log('✅ [TV] Productos cargados desde API:', items.length, 'productos totales');
      } catch (error) {
        console.error('❌ [TV] Error cargando productos desde API:', error);
        console.error('❌ [TV] Detalles del error:', error.message || error);
        items = [];
      }
    } else {
      console.warn('⚠️ [TV] squareApiCall no está disponible - requiere iniciar sesión en admin');
      items = [];
    }

    // Filtrar productos válidos
    const filtered = items.filter(item => {
      const itemData = item?.item_data;
      if (!itemData?.name) return false;
      const lower = itemData.name.toLowerCase();
      // Excluir remesas y recargas
      if (lower.includes('remesa') || lower.includes('recarga tarjeta')) return false;

      // Filtrar por categoría si está configurada
      if (!tvConfig.categoryId || tvConfig.categoryId === '') return true;
      const categoryId = itemData.category_id || itemData.categories?.[0]?.id || '';
      return categoryId === tvConfig.categoryId;
    });

    console.log('🔍 [TV] Productos filtrados:', filtered.length, 'de', items.length, 'total');
    console.log('🔍 [TV] Categoría configurada:', tvConfig.categoryId || 'Todas');

    // Limitar cantidad según configuración
    const maxCount = Math.max(1, parseInt(tvConfig.productCount || 8, 10));
    allTvProducts = filtered.slice(0, maxCount);
    console.log('✅ [TV] Productos finales para mostrar:', allTvProducts.length, 'de', maxCount, 'máximo');
    
    if (allTvProducts.length === 0 && items.length > 0) {
      console.warn('⚠️ [TV] Hay productos en API pero ninguno pasó el filtro');
    }
  } catch (error) {
    console.error('❌ [TV] Error cargando productos para TV:', error);
    allTvProducts = [];
  }
}

function formatMoneyFromVariation(variation) {
  const amount = variation?.item_variation_data?.price_money?.amount;
  if (typeof amount !== 'number') return '--';
  return `${(amount / 100).toFixed(2)} US$`;
}

async function getProductImage(product) {
  const imageId = product?.item_data?.image_ids?.[0] || product?.item_data?.image_id;
  if (!imageId) return 'images/placeholder.svg';
  if (imageCache[imageId]) return imageCache[imageId];

  try {
    const response = await squareApiCall(`/v2/catalog/object/${imageId}`, 'GET');
    const url = response?.object?.image_data?.url || 'images/placeholder.svg';
    imageCache[imageId] = url;
    return url;
  } catch (_error) {
    return 'images/placeholder.svg';
  }
}

// Cargar QRs configurados
function loadQrConfigs() {
  // Modo live-only: usar únicamente el QR definido en la configuración pública del TV actual.
  if (!currentTvConfig?.qrUrl) return [];
  return [{
    id: currentTvConfig.qrId || `qr_${currentTvConfig.id || 'tv'}`,
    name: currentTvConfig.name || 'QR',
    url: currentTvConfig.qrUrl,
    size: currentTvConfig.qrSize || 400,
    active: true
  }];
}

async function renderProductsGrid(advanceMode = true) {
  const gridEl = document.getElementById('tv-products-grid');
  if (!gridEl || !currentTvConfig) return;
  
  // Verificar si hay acceso a la API (requiere login)
  const hasApiAccess = typeof window.squareApiCall !== 'undefined';
  
  // Modo Mixed: Rotar entre productos, promos, pedidos y QRs (solo los activos)
  if (currentTvConfig.mode === 'mixed') {
    // Asegurar que el ticker se muestre en modo mixto (si está configurado)
    // Solo ocultar en modo QR específico, pero en mixed debe mostrarse en todas las demás categorías
    if (currentTvConfig.tickerEnabled !== false && currentTvConfig.promoText && currentTvConfig.promoText.trim()) {
      const tickerContainer = document.querySelector('.tv-footer-ticker');
      if (tickerContainer) {
        tickerContainer.style.display = 'flex';
        configureTicker(currentTvConfig);
      }
    }
    
    // Construir lista de modos activos
    const activeModes = [];
    if (allTvProducts.length > 0) activeModes.push('products');
    
    const promoConfig = getPromoConfig();
    if (promoConfig.enabled && promoConfig.text && promoConfig.text.trim()) {
      activeModes.push('promo');
    }
    
    if (allTvOrders.length > 0) activeModes.push('orders');
    
    allQrConfigs = loadQrConfigs();
    if (allQrConfigs.length > 0) activeModes.push('qr');
    
    // Si no hay modos activos, mostrar mensaje
    if (activeModes.length === 0) {
      const message = hasApiAccess 
        ? 'No hay contenido configurado para mostrar'
        : 'Cargando contenido... (Requiere iniciar sesión en el admin)';
      gridEl.innerHTML = `
        <div class="tv-product-card" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
          <div class="tv-product-info">
            <h1 class="tv-product-name" style="font-size: 48px; margin-bottom: 20px;">${message}</h1>
            ${!hasApiAccess ? '<p style="font-size: 24px; opacity: 0.8;">Los productos y pedidos se cargan desde el administrador</p>' : ''}
          </div>
        </div>
      `;
      return;
    }
    
    const currentMode = activeModes[tvMixedModeIndex % activeModes.length];
    
    if (currentMode === 'products' && allTvProducts.length > 0) {
      // Mostrar productos ALEATORIAMENTE (diferentes cada vez)
      // Mezclar productos para mostrar diferentes cada vez
      const shuffled = [...allTvProducts].sort(() => Math.random() - 0.5);
      const productsToShow = shuffled.slice(0, Math.min(8, shuffled.length));
      
      const productsHtml = await Promise.all(
        productsToShow.map(async (product) => {
          const itemData = product.item_data || {};
          const variation = itemData.variations?.[0];
          const currentPrice = formatMoneyFromVariation(variation);
          const imageUrl = await getProductImage(product);
          
          const amount = variation?.item_variation_data?.price_money?.amount;
          const showOffer = currentTvConfig.showOffer !== false && currentPrice !== '--';
          const previousPrice = showOffer && typeof amount === 'number' 
            ? `${((amount * 1.12) / 100).toFixed(2)} US$` 
            : '';
          
          const priceHtml = currentTvConfig.showPrice !== false
            ? `
              <div class="tv-product-price-container">
                <span class="tv-product-price">${currentPrice}</span>
                ${previousPrice ? `<span class="tv-product-old-price">${previousPrice}</span>` : ''}
              </div>
            `
            : '';
          
          const badgeHtml = showOffer
            ? '<span class="tv-product-badge">OFERTA</span>'
            : '';
          
          return `
            <div class="tv-product-card">
              <div class="tv-product-image-container">
                <img src="${imageUrl}" alt="${itemData.name || 'Producto'}" loading="lazy">
              </div>
              <div class="tv-product-info">
                ${badgeHtml}
                <h2 class="tv-product-name">${itemData.name || 'Producto'}</h2>
                ${priceHtml}
              </div>
            </div>
          `;
        })
      );
      gridEl.innerHTML = productsHtml.join('');
      // Avanzar al siguiente modo solo en ciclo de rotación, no en auto-refresh.
      if (advanceMode) {
        tvMixedModeIndex++;
      }
      return;
    } else if (currentMode === 'promo') {
      // Mostrar promoción
      const promoText = currentTvConfig.promoText || getPromoConfig().text || '';
      if (!promoText.trim()) {
        if (advanceMode) {
          tvMixedModeIndex++;
        }
        return;
      }
      gridEl.innerHTML = `
        <div class="tv-product-card" style="grid-column: 1 / -1;">
          <div class="tv-product-image-container">
            <img src="images/Barnner1.png" alt="Promoción">
          </div>
          <div class="tv-product-info">
            <h1 class="tv-product-name">${promoText}</h1>
          </div>
        </div>
      `;
      if (advanceMode) {
        tvMixedModeIndex++;
      }
      return;
    } else if (currentMode === 'orders' && allTvOrders.length > 0) {
      // Mostrar pedidos - ROTAR TODAS (no solo las primeras 6)
      // Calcular qué pedidos mostrar basado en el índice de rotación
      const ordersPerPage = 6;
      const startIndex = (tvOrdersRotationIndex * ordersPerPage) % allTvOrders.length;
      const endIndex = Math.min(startIndex + ordersPerPage, allTvOrders.length);
      let ordersToShow = allTvOrders.slice(startIndex, endIndex);
      
      // Si no hay suficientes, tomar del inicio para completar
      if (ordersToShow.length < ordersPerPage && allTvOrders.length > ordersPerPage) {
        const remaining = ordersPerPage - ordersToShow.length;
        ordersToShow = [...ordersToShow, ...allTvOrders.slice(0, remaining)];
      }
      
      const ordersHtml = ordersToShow.map(order => {
        const customerName = order.recipient_name || 'Cliente';
        const orderId = order.id || 'N/A';
        const fulfillments = order.fulfillments || [];
        const pickupFulfillment = fulfillments.find(f => f.type === 'PICKUP');
        const state = pickupFulfillment?.state || 'PROPOSED';
        
        const stateLabels = {
          'PROPOSED': 'Pendiente',
          'RESERVED': 'Procesando',
          'PREPARED': 'Listo',
          'COMPLETED': 'Recogido'
        };
        
        const stateColors = {
          'PROPOSED': '#ff9800',
          'RESERVED': '#2196f3',
          'PREPARED': '#4caf50',
          'COMPLETED': '#9e9e9e'
        };
        
        const stateLabel = stateLabels[state] || 'Pendiente';
        const stateColor = stateColors[state] || '#ff9800';
        
        return `
          <div class="tv-product-card" style="min-height: 180px;">
            <div class="tv-product-info" style="width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div style="flex: 1;">
                  <h2 class="tv-product-name" style="font-size: clamp(20px, 2vw, 28px); margin-bottom: 6px; line-height: 1.2;">${customerName}</h2>
                </div>
                <span style="background: ${stateColor}; color: white; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 14px; white-space: nowrap; margin-left: 12px;">
                  ${stateLabel}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
                <span style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.85); font-size: 16px;">
                  <i class="fas fa-shopping-bag"></i>
                  <strong>${order.line_items?.length || 0}</strong> artículos
                </span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      gridEl.innerHTML = ordersHtml;
      if (advanceMode) {
        tvOrdersRotationIndex++;
        // Si ya mostramos todas las órdenes, resetear índice y avanzar al siguiente modo
        if (tvOrdersRotationIndex * ordersPerPage >= allTvOrders.length) {
          tvOrdersRotationIndex = 0;
          tvMixedModeIndex++;
        }
      }
      return;
    } else if (currentMode === 'qr') {
      // Mostrar QR - ROTAR TODOS los QRs
      allQrConfigs = loadQrConfigs();
      if (allQrConfigs.length > 0) {
        const qrIndex = tvQrRotationIndex % allQrConfigs.length;
        const qr = allQrConfigs[qrIndex];
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qr.size || 400}x${qr.size || 400}&data=${encodeURIComponent(qr.url)}`;
        gridEl.innerHTML = `
          <div class="tv-product-card" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; min-height: 500px;">
            <div style="text-align: center; position: relative;">
              <div style="position: relative; display: inline-block;">
                <img src="${qrApiUrl}" alt="QR Code" style="width: ${qr.size || 400}px; height: ${qr.size || 400}px; border: 8px solid #ffffff; border-radius: 12px; background: #ffffff;">
                <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(255,255,255,0.95); border-radius: 8px; padding: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                  <img src="images/logo.png" alt="Tropiplus" style="width: 36px; height: 36px; object-fit: contain;">
                </div>
              </div>
              <p style="margin-top: 24px; font-size: 24px; color: #ffffff;">${qr.name || 'Escanea para más información'}</p>
              <p style="margin-top: 8px; font-size: 16px; color: rgba(255,255,255,0.7); word-break: break-all; max-width: 600px; margin-left: auto; margin-right: auto;">${qr.url || ''}</p>
            </div>
          </div>
        `;
        if (advanceMode) {
          tvQrRotationIndex++;
          // Si ya mostramos todos los QRs, resetear índice y avanzar al siguiente modo
          if (tvQrRotationIndex >= allQrConfigs.length) {
            tvQrRotationIndex = 0;
            tvMixedModeIndex++;
            configureTicker(currentTvConfig);
          }
        }
        return;
      }
    }
    
    // Si no hay contenido para el modo actual, avanzar al siguiente
    if (advanceMode) {
      tvMixedModeIndex++;
    }
    return;
  }
  
  // Modo QR
  if (currentTvConfig.mode === 'qr') {
    let qr = null;
    
    // Si hay qrId, buscar el QR configurado
    if (currentTvConfig.qrId) {
      const qrs = loadQrConfigs();
      qr = qrs.find(q => q.id === currentTvConfig.qrId && q.active);
    }
    
    // Si no hay qrId pero hay qrUrl (legacy), usar qrUrl
    if (!qr && currentTvConfig.qrUrl) {
      qr = {
        url: currentTvConfig.qrUrl,
        size: currentTvConfig.qrSize || 400,
        name: 'QR Code'
      };
    }
    
    if (qr) {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qr.size || 400}x${qr.size || 400}&data=${encodeURIComponent(qr.url)}`;
      gridEl.innerHTML = `
        <div class="tv-product-card" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; min-height: 500px;">
          <div style="text-align: center; position: relative;">
            <div style="position: relative; display: inline-block;">
              <img src="${qrApiUrl}" alt="QR Code" style="width: ${qr.size || 400}px; height: ${qr.size || 400}px; border: 8px solid #ffffff; border-radius: 12px; background: #ffffff;">
              <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(255,255,255,0.95); border-radius: 8px; padding: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                <img src="images/logo.png" alt="Tropiplus" style="width: 36px; height: 36px; object-fit: contain;">
              </div>
            </div>
            <p style="margin-top: 24px; font-size: 24px; color: #ffffff;">${qr.name || 'Escanea para más información'}</p>
            <p style="margin-top: 8px; font-size: 16px; color: rgba(255,255,255,0.7); word-break: break-all; max-width: 600px; margin-left: auto; margin-right: auto;">${qr.url || ''}</p>
          </div>
        </div>
      `;
      return;
    } else {
      gridEl.innerHTML = `
        <div class="tv-product-card" style="grid-column: 1 / -1;">
          <div class="tv-product-info">
            <h1 class="tv-product-name">No hay QR configurado</h1>
          </div>
        </div>
      `;
      return;
    }
  }
  
  // Modo Listado de Pedidos
  if (currentTvConfig.mode === 'orders') {
    const hasApiAccess = typeof window.squareApiCall !== 'undefined';
    if (!allTvOrders.length) {
      const message = hasApiAccess 
        ? 'No hay pedidos pendientes'
        : 'Cargando pedidos... (Requiere iniciar sesión en el admin)';
      gridEl.innerHTML = `
        <div class="tv-product-card" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
          <div class="tv-product-info">
            <h1 class="tv-product-name" style="font-size: 48px; margin-bottom: 20px;">${message}</h1>
            ${!hasApiAccess ? '<p style="font-size: 24px; opacity: 0.8;">Los pedidos se cargan desde el administrador</p>' : ''}
          </div>
        </div>
      `;
      return;
    }
    
    const ordersHtml = allTvOrders.map(order => {
      const customerName = order.recipient_name || 'Cliente';
      const orderId = order.id || 'N/A';
      const fulfillments = order.fulfillments || [];
      const pickupFulfillment = fulfillments.find(f => f.type === 'PICKUP');
      const state = pickupFulfillment?.state || 'PROPOSED';
      
      const stateLabels = {
        'PROPOSED': 'Pendiente',
        'RESERVED': 'Procesando',
        'PREPARED': 'Listo',
        'COMPLETED': 'Recogido'
      };
      
      const stateColors = {
        'PROPOSED': '#ff9800',
        'RESERVED': '#2196f3',
        'PREPARED': '#4caf50',
        'COMPLETED': '#9e9e9e'
      };
      
      const stateLabel = stateLabels[state] || 'Pendiente';
      const stateColor = stateColors[state] || '#ff9800';
      
      return `
        <div class="tv-product-card" style="min-height: 180px;">
          <div class="tv-product-info" style="width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
              <div style="flex: 1;">
                <h2 class="tv-product-name" style="font-size: clamp(20px, 2vw, 28px); margin-bottom: 6px; line-height: 1.2;">${customerName}</h2>
              </div>
              <span style="background: ${stateColor}; color: white; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 14px; white-space: nowrap; margin-left: 12px;">
                ${stateLabel}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
              <span style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.85); font-size: 16px;">
                <i class="fas fa-shopping-bag"></i>
                <strong>${order.line_items?.length || 0}</strong> artículos
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    gridEl.innerHTML = ordersHtml;
    return;
  }
  
  // Modo Promoción
  if (currentTvConfig.mode === 'promo') {
    gridEl.innerHTML = `
      <div class="tv-product-card" style="grid-column: 1 / -1;">
        <div class="tv-product-image-container">
          <img src="images/Barnner1.png" alt="Promoción">
        </div>
        <div class="tv-product-info">
          <h1 class="tv-product-name">${currentTvConfig.promoText || getPromoConfig().text || ''}</h1>
        </div>
      </div>
    `;
    return;
  }
  
  // Modo Productos (mixed o products)
  if (!allTvProducts.length) {
    const hasApiAccess = typeof window.squareApiCall !== 'undefined';
    const message = hasApiAccess 
      ? 'Sin productos para mostrar en esta configuración'
      : 'Cargando productos... (Requiere iniciar sesión en el admin)';
    gridEl.innerHTML = `
      <div class="tv-product-card" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
        <div class="tv-product-info">
          <h1 class="tv-product-name" style="font-size: 48px; margin-bottom: 20px;">${message}</h1>
          ${!hasApiAccess ? '<p style="font-size: 24px; opacity: 0.8;">Los productos se cargan desde el administrador</p>' : ''}
        </div>
      </div>
    `;
    return;
  }
  
  // Renderizar todos los productos en grid
  const productsHtml = await Promise.all(
    allTvProducts.map(async (product) => {
      const itemData = product.item_data || {};
      const variation = itemData.variations?.[0];
      const currentPrice = formatMoneyFromVariation(variation);
      const imageUrl = await getProductImage(product);
      
      const amount = variation?.item_variation_data?.price_money?.amount;
      const showOffer = currentTvConfig.showOffer !== false && currentPrice !== '--';
      const previousPrice = showOffer && typeof amount === 'number' 
        ? `${((amount * 1.12) / 100).toFixed(2)} US$` 
        : '';
      
      const priceHtml = currentTvConfig.showPrice !== false
        ? `
          <div class="tv-product-price-container">
            <span class="tv-product-price">${currentPrice}</span>
            ${previousPrice ? `<span class="tv-product-old-price">${previousPrice}</span>` : ''}
          </div>
        `
        : '';
      
      const badgeHtml = showOffer
        ? '<span class="tv-product-badge">OFERTA</span>'
        : '';
      
      return `
        <div class="tv-product-card">
          <div class="tv-product-image-container">
            <img src="${imageUrl}" alt="${itemData.name || 'Producto'}" loading="lazy">
          </div>
          <div class="tv-product-info">
            ${badgeHtml}
            <h2 class="tv-product-name">${itemData.name || 'Producto'}</h2>
            ${priceHtml}
          </div>
        </div>
      `;
    })
  );
  
  gridEl.innerHTML = productsHtml.join('');
}

async function renderCurrentSlide() {
  // Usar el nuevo método de grid para múltiples productos
  await renderProductsGrid();
  
  // Mantener el método legacy para compatibilidad
  const nameEl = document.getElementById('tv-product-name');
  const imageEl = document.getElementById('tv-product-image');
  const priceEl = document.getElementById('tv-price');
  const oldPriceEl = document.getElementById('tv-old-price');
  const badgeEl = document.getElementById('tv-badge');
  const priceRow = document.getElementById('tv-price-row');

  if (!currentTvConfig) return;

  if (currentTvConfig.mode === 'promo') {
    if (nameEl) nameEl.textContent = (currentTvConfig.promoText || getPromoConfig().text || '');
    if (imageEl) imageEl.src = 'images/Barnner1.png';
    if (priceRow) priceRow.style.display = 'none';
    if (badgeEl) badgeEl.style.display = 'none';
    return;
  }

  if (!allTvProducts.length) {
    if (nameEl) nameEl.textContent = 'Sin productos para mostrar en esta configuración';
    if (imageEl) imageEl.src = 'images/placeholder.svg';
    if (priceRow) priceRow.style.display = 'none';
    if (badgeEl) badgeEl.style.display = 'none';
    return;
  }

  const product = allTvProducts[tvSlideIndex % allTvProducts.length];
  const itemData = product.item_data || {};
  const variation = itemData.variations?.[0];
  const currentPrice = formatMoneyFromVariation(variation);

  if (nameEl) nameEl.textContent = itemData.name || 'Producto';
  if (imageEl) imageEl.src = await getProductImage(product);

  if (currentTvConfig.showPrice === false) {
    if (priceRow) priceRow.style.display = 'none';
  } else {
    if (priceRow) priceRow.style.display = 'flex';
    if (priceEl) priceEl.textContent = currentPrice;

    if (currentTvConfig.showOffer === false || currentPrice === '--') {
      if (oldPriceEl) oldPriceEl.textContent = '';
      if (badgeEl) badgeEl.style.display = 'none';
    } else {
      const amount = variation?.item_variation_data?.price_money?.amount;
      const previous = typeof amount === 'number' ? ((amount * 1.12) / 100).toFixed(2) : '';
      if (oldPriceEl) oldPriceEl.textContent = previous ? `${previous} US$` : '';
      if (badgeEl) badgeEl.style.display = 'inline-flex';
    }
  }
}

function startTvRotation(tvConfig) {
  const seconds = Math.max(3, parseInt(tvConfig.slideSeconds || 10, 10));
  if (tvSlideTimer) clearInterval(tvSlideTimer);

  // Modos que no necesitan rotación
  if (tvConfig.mode === 'qr' || tvConfig.mode === 'promo') {
    renderProductsGrid();
    return;
  }
  
  // Modo mixed: rotar entre modos activos
  // Usa el selector de transición configurado en admin (slideSeconds para mixed).
  const mixedModeSeconds = Math.max(6, seconds);
  if (tvConfig.mode === 'mixed') {
    renderProductsGrid(false);
    tvSlideTimer = setInterval(async () => {
      await renderProductsGrid(true);
    }, mixedModeSeconds * 1000);
    return;
  }
  
  // Modo orders: recargar pedidos periódicamente
  if (tvConfig.mode === 'orders') {
    renderProductsGrid();
    tvSlideTimer = setInterval(async () => {
      await loadOrdersForTv();
      await renderProductsGrid();
    }, seconds * 1000);
    return;
  }

  // Modo productos: rotar productos
  if (allTvProducts.length > 1) {
    renderProductsGrid();
    tvSlideTimer = setInterval(async () => {
      // Rotar el array de productos para mostrar diferentes combinaciones
      const first = allTvProducts.shift();
      allTvProducts.push(first);
      await renderProductsGrid();
    }, seconds * 1000);
  } else {
    // Modo legacy: un producto a la vez
    renderCurrentSlide();
    tvSlideTimer = setInterval(async () => {
      tvSlideIndex += 1;
      await renderCurrentSlide();
    }, seconds * 1000);
  }
}

function startAutoRefresh(tvId) {
  setInterval(async () => {
    // Verificar horario cada vez
    const isClosed = checkStoreHours();
    if (isClosed) {
      showClosedScreen();
      return;
    }
    
    const configs = await getTvConfigs();
    const config = configs.find(item => item.id === tvId);
    if (!config || config.active === false) return;

    currentTvConfig = config;
    configureTicker(config);
    
    // Recargar SIEMPRE en vivo para evitar datos viejos (cada 2 segundos)
    if (config.mode === 'orders') {
      await loadOrdersForTv();
    } else if (config.mode === 'mixed') {
      await loadProductsForTv(config);
      await loadOrdersForTv();
      allQrConfigs = loadQrConfigs();
    } else if (config.mode === 'products') {
      // Modo productos: recargar productos desde API en tiempo real
      await loadProductsForTv(config);
    } else if (config.mode !== 'qr' && config.mode !== 'promo') {
      await loadProductsForTv(config);
    }
    await renderProductsGrid(false);
  }, 2000); // Actualizar cada 2 segundos (tiempo real)
}
