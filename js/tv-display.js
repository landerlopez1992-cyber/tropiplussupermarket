const TV_STORAGE_KEY = 'tropiplus_tv_configs';
const PROMO_STORAGE_KEY = 'tropiplus_promo_config';
const TV_SELECTED_KEY = 'tropiplus_tv_selected';

let currentTvConfig = null;
let allTvProducts = [];
let tvSlideIndex = 0;
let tvSlideTimer = null;
const imageCache = {};

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
    if (!raw) return { text: '' };
    const parsed = JSON.parse(raw);
    return {
      text: String(parsed.text || '').trim(),
      speed: ['slow', 'normal', 'fast'].includes(parsed.speed) ? parsed.speed : 'normal'
    };
  } catch (_error) {
    return { text: '' };
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

  configureTicker(selected);
  await loadProductsForTv(selected);
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
  const promo = getPromoConfig();
  const ticker = document.getElementById('tv-ticker-track');
  const textA = document.getElementById('tv-ticker-text');
  const textB = document.getElementById('tv-ticker-text-2');

  const mode = tvConfig.mode || 'mixed';
  const customText = (tvConfig.promoText || '').trim();
  const text = customText || promo.text || 'Ofertas en Tropiplus Supermarket';
  
  // Solo DOS copias del texto para que pase completo y luego se repita suavemente
  const separator = '   •   ';
  const finalTicker = `${text}${separator}${text}${separator}`;

  textA.textContent = finalTicker;
  textB.textContent = finalTicker;

  // Calcular duración basada en la velocidad y longitud del texto
  const baseDuration = {
    slow: 30,    // 30 segundos por 100 caracteres
    normal: 20,  // 20 segundos por 100 caracteres
    fast: 12     // 12 segundos por 100 caracteres
  };
  
  const textLength = text.length;
  const speed = promo.speed || 'normal';
  const baseSpeed = baseDuration[speed] || baseDuration.normal;
  const calculatedDuration = Math.max(8, Math.round((textLength / 100) * baseSpeed));
  const duration = `${calculatedDuration}s`;
  
  console.log('⚡ [TV] Velocidad configurada:', speed);
  console.log('⚡ [TV] Longitud del texto:', textLength, 'caracteres');
  console.log('⚡ [TV] Duración calculada:', duration);
  
  ticker.style.setProperty('--tv-ticker-duration', duration);

  if (mode === 'products') {
    // En modo solo productos, mantenemos el ticker pero con texto corto.
    const productsText = customText || 'Productos y ofertas del día en Tropiplus';
    const productsTicker = `${productsText}${separator}${productsText}${separator}`;
    textA.textContent = productsTicker;
    textB.textContent = productsTicker;
  }
}

async function loadProductsForTv(tvConfig) {
  try {
    const data = await getSquareProducts();
    const items = Array.isArray(data) ? data : [];

    const filtered = items.filter(item => {
      const itemData = item?.item_data;
      if (!itemData?.name) return false;
      const lower = itemData.name.toLowerCase();
      if (lower.includes('remesa') || lower.includes('recarga tarjeta')) return false;

      if (!tvConfig.categoryId) return true;
      const categoryId = itemData.category_id || itemData.categories?.[0]?.id || '';
      return categoryId === tvConfig.categoryId;
    });

    const maxCount = Math.max(1, parseInt(tvConfig.productCount || 8, 10));
    allTvProducts = filtered.slice(0, maxCount);
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

async function renderCurrentSlide() {
  const nameEl = document.getElementById('tv-product-name');
  const imageEl = document.getElementById('tv-product-image');
  const priceEl = document.getElementById('tv-price');
  const oldPriceEl = document.getElementById('tv-old-price');
  const badgeEl = document.getElementById('tv-badge');
  const priceRow = document.getElementById('tv-price-row');

  if (!currentTvConfig) return;

  if (currentTvConfig.mode === 'promo') {
    nameEl.textContent = (currentTvConfig.promoText || getPromoConfig().text || 'Promoción del día');
    imageEl.src = 'images/Barnner1.png';
    priceRow.style.display = 'none';
    badgeEl.style.display = 'none';
    return;
  }

  if (!allTvProducts.length) {
    nameEl.textContent = 'Sin productos para mostrar en esta configuración';
    imageEl.src = 'images/placeholder.svg';
    priceRow.style.display = 'none';
    badgeEl.style.display = 'none';
    return;
  }

  const product = allTvProducts[tvSlideIndex % allTvProducts.length];
  const itemData = product.item_data || {};
  const variation = itemData.variations?.[0];
  const currentPrice = formatMoneyFromVariation(variation);

  nameEl.textContent = itemData.name || 'Producto';
  imageEl.src = await getProductImage(product);

  if (currentTvConfig.showPrice === false) {
    priceRow.style.display = 'none';
  } else {
    priceRow.style.display = 'flex';
    priceEl.textContent = currentPrice;

    if (currentTvConfig.showOffer === false || currentPrice === '--') {
      oldPriceEl.textContent = '';
      badgeEl.style.display = 'none';
    } else {
      const amount = variation?.item_variation_data?.price_money?.amount;
      const previous = typeof amount === 'number' ? ((amount * 1.12) / 100).toFixed(2) : '';
      oldPriceEl.textContent = previous ? `${previous} US$` : '';
      badgeEl.style.display = 'inline-flex';
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
