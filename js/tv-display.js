const TV_STORAGE_KEY = 'tropiplus_tv_configs';
const PROMO_STORAGE_KEY = 'tropiplus_promo_config';
const TV_SELECTED_KEY = 'tropiplus_tv_selected';

let currentTvConfig = null;
let allTvProducts = [];
let allTvOrders = [];
let tvSlideIndex = 0;
let tvSlideTimer = null;
const imageCache = {};

// Verificar horarios de la tienda desde Square API
async function checkStoreHours() {
  try {
    if (typeof window.squareApiCall === 'undefined') {
      console.warn('⚠️ [TV] squareApiCall no disponible, asumiendo tienda abierta');
      return false;
    }
    
    const locationId = window.SQUARE_CONFIG?.locationId || 'L94DY3ZD6WS85';
    const response = await window.squareApiCall(`/v2/locations/${locationId}`, 'GET');
    
    if (!response || !response.location) {
      console.warn('⚠️ [TV] No se pudo obtener información de la ubicación');
      return false;
    }
    
    const location = response.location;
    const businessHours = location.business_hours;
    
    if (!businessHours || !businessHours.periods || businessHours.periods.length === 0) {
      console.log('ℹ️ [TV] No hay horarios configurados, asumiendo tienda abierta');
      return false;
    }
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Domingo, 6 = Sábado
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM formato
    
    // Buscar horario para el día actual
    const todayPeriod = businessHours.periods.find(period => {
      const dayOfWeek = period.day_of_week;
      // Convertir: Square usa 0=Lunes, 6=Domingo, JS usa 0=Domingo, 6=Sábado
      const squareDay = currentDay === 0 ? 6 : currentDay - 1;
      return dayOfWeek === squareDay;
    });
    
    if (!todayPeriod) {
      console.log('ℹ️ [TV] No hay horario para hoy, asumiendo cerrado');
      return true; // Cerrado si no hay horario
    }
    
    const startTime = parseInt(todayPeriod.start_local_time?.replace(':', '') || '0');
    const endTime = parseInt(todayPeriod.end_local_time?.replace(':', '') || '2359');
    
    const isOpen = currentTime >= startTime && currentTime <= endTime;
    console.log(`🕐 [TV] Horario: ${todayPeriod.start_local_time} - ${todayPeriod.end_local_time}, Hora actual: ${now.getHours()}:${now.getMinutes()}, Abierto: ${isOpen}`);
    
    return !isOpen;
  } catch (error) {
    console.error('❌ [TV] Error verificando horarios:', error);
    return false; // En caso de error, asumir abierto
  }
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

function getTvConfigs() {
  try {
    const raw = localStorage.getItem(TV_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function getPromoConfig() {
  try {
    const raw = localStorage.getItem(PROMO_STORAGE_KEY);
    if (!raw) {
      console.log('⚠️ [TV] No hay configuración de promoción global');
      return { text: '', speed: 'normal' };
    }
    const parsed = JSON.parse(raw);
    const config = {
      text: String(parsed.text || '').trim(),
      speed: ['slow', 'normal', 'fast'].includes(parsed.speed) ? parsed.speed : 'normal',
      fontSize: String(parsed.fontSize || '14px'),
      textColor: String(parsed.textColor || '#ffffff'),
      bgColor: String(parsed.bgColor || '#1f318a')
    };
    console.log('📋 [TV] Configuración de promoción global:', config);
    return config;
  } catch (error) {
    console.error('❌ [TV] Error leyendo promoción global:', error);
    return { text: '', speed: 'normal' };
  }
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
  const configs = getTvConfigs();

  if (!tvId) {
    openTvSelector(configs);
    return;
  }

  const selected = configs.find(item => item.id === tvId);
  if (!selected) {
    openTvSelector(configs);
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

  // Verificar horario de la tienda
  const isClosed = await checkStoreHours();
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
  } else {
    await loadProductsForTv(selected);
    console.log('📦 [TV] Productos cargados:', allTvProducts.length);
  }
  
  // Renderizar grid inicial
  await renderProductsGrid();
  startTvRotation(selected);
  startAutoRefresh(selected.id);
}

function openTvSelector(configs) {
  const overlay = document.getElementById('tv-select-overlay');
  const selector = document.getElementById('tv-selector');
  const openBtn = document.getElementById('tv-selector-open');
  const fullscreenBtn = document.getElementById('tv-fullscreen-btn');
  overlay.classList.add('active');

  const activeConfigs = configs.filter(item => item.active !== false);
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

function configureTicker(tvConfig) {
  const tickerContainer = document.querySelector('.tv-footer-ticker');
  const ticker = document.getElementById('tv-ticker-track');
  const textA = document.getElementById('tv-ticker-text');
  const textB = document.getElementById('tv-ticker-text-2');

  // Verificar si el ticker está habilitado
  const tickerEnabled = tvConfig.tickerEnabled !== false;
  
  if (!tickerEnabled || !tickerContainer) {
    if (tickerContainer) {
      tickerContainer.style.display = 'none';
    }
    console.log('⚠️ [TV] Ticker deshabilitado o contenedor no encontrado');
    return;
  }

  // Mostrar el contenedor del ticker
  tickerContainer.style.display = 'flex';

  const promo = getPromoConfig();
  const mode = tvConfig.mode || 'mixed';
  const customText = (tvConfig.promoText || '').trim();
  const text = customText || promo.text || 'Ofertas en Tropiplus Supermarket';
  
  if (!text || text.trim() === '') {
    tickerContainer.style.display = 'none';
    console.log('⚠️ [TV] No hay texto promocional para mostrar');
    return;
  }
  
  // Solo DOS copias del texto para que pase completo y luego se repita suavemente
  const separator = '   •   ';
  const finalTicker = `${text}${separator}${text}${separator}`;

  if (textA) textA.textContent = finalTicker;
  if (textB) textB.textContent = finalTicker;

  // Usar la velocidad del TV si está configurada, sino usar la promoción global
  const speed = tvConfig.tickerSpeed || promo.speed || 'normal';
  
  // Usar los mismos valores de duración que en la web principal
  const durationBySpeed = {
    slow: '30s',    // Lento: 30 segundos
    normal: '20s',  // Normal: 20 segundos
    fast: '12s'     // Rápido: 12 segundos
  };
  
  const duration = durationBySpeed[speed] || durationBySpeed.normal;
  
  console.log('⚡ [TV] Velocidad configurada:', speed, '(TV:', tvConfig.tickerSpeed, '| Global:', promo.speed, ')');
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

  if (mode === 'products') {
    // En modo solo productos, mantenemos el ticker pero con texto corto.
    const productsText = customText || 'Productos y ofertas del día en Tropiplus';
    const productsTicker = `${productsText}${separator}${productsText}${separator}`;
    if (textA) textA.textContent = productsTicker;
    if (textB) textB.textContent = productsTicker;
  }
}

async function loadProductsForTv(tvConfig) {
  try {
    // Intentar obtener productos desde square-integration.js si está disponible
    let items = [];
    
    // Esperar a que squareApiCall esté disponible
    let retries = 0;
    while (typeof window.squareApiCall === 'undefined' && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (typeof window.squareProducts !== 'undefined' && Array.isArray(window.squareProducts) && window.squareProducts.length > 0) {
      console.log('✅ [TV] Usando productos cargados desde square-integration.js:', window.squareProducts.length, 'productos');
      items = window.squareProducts;
    } else if (typeof loadSquareProducts === 'function') {
      console.log('⏳ [TV] Cargando productos desde Square API usando loadSquareProducts...');
      await loadSquareProducts();
      items = window.squareProducts || [];
      console.log('✅ [TV] Productos cargados:', items.length);
    } else if (typeof window.squareApiCall === 'function') {
      // Fallback: cargar directamente desde Square API
      console.log('⏳ [TV] Cargando productos directamente desde Square API...');
      try {
        const response = await window.squareApiCall('/v2/catalog/search', 'POST', {
          object_types: ['ITEM'],
          query: {
            exact_query: {
              attribute_name: 'name',
              attribute_value: ''
            }
          },
          limit: 1000
        });
        items = response?.objects || [];
        // Guardar en window para uso futuro
        window.squareProducts = items;
        console.log('✅ [TV] Productos cargados directamente:', items.length);
      } catch (error) {
        console.error('❌ [TV] Error cargando productos:', error);
        items = [];
      }
    } else {
      console.error('❌ [TV] squareApiCall no está disponible');
      items = [];
    }

    const filtered = items.filter(item => {
      const itemData = item?.item_data;
      if (!itemData?.name) return false;
      const lower = itemData.name.toLowerCase();
      if (lower.includes('remesa') || lower.includes('recarga tarjeta')) return false;

      if (!tvConfig.categoryId || tvConfig.categoryId === '') return true;
      const categoryId = itemData.category_id || itemData.categories?.[0]?.id || '';
      return categoryId === tvConfig.categoryId;
    });

    console.log('🔍 [TV] Productos filtrados:', filtered.length, 'de', items.length, 'total');
    console.log('🔍 [TV] Configuración de categoría:', tvConfig.categoryId || 'Todas');

    const maxCount = Math.max(1, parseInt(tvConfig.productCount || 8, 10));
    allTvProducts = filtered.slice(0, maxCount);
    console.log('✅ [TV] Productos finales para mostrar:', allTvProducts.length);
  } catch (error) {
    console.error('Error cargando productos para TV:', error);
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

async function renderProductsGrid() {
  const gridEl = document.getElementById('tv-products-grid');
  if (!gridEl || !currentTvConfig) return;
  
  // Modo QR
  if (currentTvConfig.mode === 'qr' && currentTvConfig.qrEnabled && currentTvConfig.qrUrl) {
    const qrUrl = currentTvConfig.qrUrl;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`;
    
    gridEl.innerHTML = `
      <div class="tv-product-card" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; min-height: 500px;">
        <div style="text-align: center;">
          <div style="position: relative; display: inline-block;">
            <img src="${qrApiUrl}" alt="QR Code" style="width: 400px; height: 400px; border: 8px solid #ffffff; border-radius: 12px; background: #ffffff;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #ffffff; border-radius: 50%; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
              <img src="images/logo.png" alt="Tropiplus" style="width: 80px; height: 80px; object-fit: contain;">
            </div>
          </div>
          <p style="margin-top: 24px; font-size: 24px; color: #ffffff;">Escanea para más información</p>
        </div>
      </div>
    `;
    return;
  }
  
  // Modo Listado de Pedidos
  if (currentTvConfig.mode === 'orders') {
    if (!allTvOrders.length) {
      gridEl.innerHTML = `
        <div class="tv-product-card" style="grid-column: 1 / -1;">
          <div class="tv-product-info">
            <h1 class="tv-product-name">No hay pedidos pendientes</h1>
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
        <div class="tv-product-card" style="min-height: 200px;">
          <div class="tv-product-info" style="width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
              <div>
                <h2 class="tv-product-name" style="font-size: 28px; margin-bottom: 8px;">${customerName}</h2>
                <p style="font-size: 18px; color: rgba(255,255,255,0.8);">Orden: ${orderId.substring(0, 12)}...</p>
              </div>
              <span style="background: ${stateColor}; color: white; padding: 8px 16px; border-radius: 999px; font-weight: 700; font-size: 16px;">
                ${stateLabel}
              </span>
            </div>
            <div style="display: flex; gap: 16px; margin-top: 16px;">
              <span style="display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.7);">
                <i class="fas fa-shopping-bag"></i>
                ${order.line_items?.length || 0} artículos
              </span>
              <span style="display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.7);">
                <i class="fas fa-dollar-sign"></i>
                ${order.total_money ? ((order.total_money.amount / 100).toFixed(2)) : '0.00'} US$
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
          <h1 class="tv-product-name">${currentTvConfig.promoText || getPromoConfig().text || 'Promoción del día'}</h1>
        </div>
      </div>
    `;
    return;
  }
  
  // Modo Productos (mixed o products)
  if (!allTvProducts.length) {
    gridEl.innerHTML = `
      <div class="tv-product-card" style="grid-column: 1 / -1;">
        <div class="tv-product-info">
          <h1 class="tv-product-name">Sin productos para mostrar en esta configuración</h1>
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
    if (nameEl) nameEl.textContent = (currentTvConfig.promoText || getPromoConfig().text || 'Promoción del día');
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

  // Si hay múltiples productos, renderizar grid y rotar productos
  if (allTvProducts.length > 1 && tvConfig.mode !== 'promo') {
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
    const config = getTvConfigs().find(item => item.id === tvId);
    if (!config || config.active === false) return;

    currentTvConfig = config;
    configureTicker(config);
    await loadProductsForTv(config);
  }, 45000);
}
