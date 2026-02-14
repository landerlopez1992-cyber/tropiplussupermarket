// Integración de Square con Tropiplus Supermarket
let squareCategories = [];
let squareProducts = [];
let categoryHierarchy = {}; // Estructura: { parentCategoryId: [childCategories] }
let currentParentCategory = null;

// Inicializar carrito global
let shoppingCart = JSON.parse(localStorage.getItem('tropiplus_cart')) || [];

function buildSquareImageUrl(imageId) {
  if (!imageId) return null;
  return `https://square-cdn.com/${imageId}/medium`;
}

async function loadSquareCategories() {
  try {
    console.log('🔄 Cargando categorías de Square...');
    const categories = await getSquareCategories();
    squareCategories = categories;
    
    if (categories.length === 0) {
      console.warn('⚠️ No se encontraron categorías en Square');
      return;
    }
    
    // Log de estructura de categorías para debugging
    if (categories.length > 0) {
      console.log('📋 Estructura de categoría ejemplo:', JSON.stringify(categories[0], null, 2));
    }
    
    // Construir jerarquía de categorías basada en productos
    buildCategoryHierarchy(categories);
    
    renderCategoriesBar(categories);
    
    console.log('✅ Categorías cargadas:', categories.length);
    console.log('📊 Jerarquía de categorías:', categoryHierarchy);
  } catch (error) {
    console.error('❌ Error cargando categorías:', error);
  }
}

// Construir jerarquía de categorías basándose en los productos
function buildCategoryHierarchy(categories) {
  categoryHierarchy = {};
  
  if (squareProducts.length === 0) {
    console.log('⏳ Esperando productos para construir jerarquía...');
    return;
  }
  
  // Analizar productos para encontrar relaciones entre categorías
  const categoryProductMap = {};
  
  squareProducts.forEach(product => {
    const itemData = product.item_data;
    if (!itemData || !itemData.categories) return;
    
    itemData.categories.forEach(cat => {
      if (!categoryProductMap[cat.id]) {
        categoryProductMap[cat.id] = [];
      }
      categoryProductMap[cat.id].push(product);
    });
  });
  
  // Estrategia 1: Buscar categorías que comparten productos
  categories.forEach(category => {
    const categoryId = category.id;
    const products = categoryProductMap[categoryId] || [];
    
    if (products.length > 5) { // Categorías con muchos productos podrían ser padres
      // Buscar categorías que aparecen frecuentemente junto con esta
      const coOccurringCategories = {};
      
      products.forEach(product => {
        const productCategories = product.item_data?.categories || [];
        productCategories.forEach(cat => {
          if (cat.id !== categoryId) {
            coOccurringCategories[cat.id] = (coOccurringCategories[cat.id] || 0) + 1;
          }
        });
      });
      
      // Si hay categorías que aparecen frecuentemente junto con esta, son subcategorías
      const subcategories = categories.filter(cat => {
        const count = coOccurringCategories[cat.id] || 0;
        return count > products.length * 0.3; // Aparece en al menos 30% de los productos
      });
      
      if (subcategories.length > 0) {
        categoryHierarchy[categoryId] = subcategories;
      }
    }
  });
  
  // Estrategia 2: Agrupar por palabras clave en nombres (si no se encontraron relaciones)
  if (Object.keys(categoryHierarchy).length === 0) {
    const nameGroups = {};
    const parentKeywords = ['carnes', 'bebidas', 'lacteos', 'granos', 'enlatados', 'aseo', 'farmacia', 'hogar'];
    
    categories.forEach(cat => {
      const name = cat.category_data?.name?.toLowerCase() || '';
      parentKeywords.forEach(keyword => {
        if (name === keyword || name.startsWith(keyword + ' ')) {
          if (!nameGroups[keyword]) nameGroups[keyword] = { parent: null, children: [] };
          if (name === keyword) {
            nameGroups[keyword].parent = cat;
          } else {
            nameGroups[keyword].children.push(cat);
          }
        }
      });
    });
    
    Object.keys(nameGroups).forEach(keyword => {
      const group = nameGroups[keyword];
      if (group.parent && group.children.length > 0) {
        categoryHierarchy[group.parent.id] = group.children;
      }
    });
  }
  
  console.log('📊 Jerarquía construida:', Object.keys(categoryHierarchy).length, 'categorías padre');
}

async function loadSquareProducts() {
  try {
    console.log('🔄 [Tropiplus] Iniciando carga de productos desde Square API...');
    console.log('🌐 [Tropiplus] Hostname:', window.location.hostname);
    console.log('🌐 [Tropiplus] Entorno:', window.location.hostname === 'localhost' ? 'LOCAL' : 'PRODUCCIÓN');
    
    const products = await getSquareProducts();
    
    console.log('📦 [Tropiplus] Respuesta recibida de getSquareProducts');
    console.log('📦 [Tropiplus] Tipo de respuesta:', typeof products);
    console.log('📦 [Tropiplus] Es array:', Array.isArray(products));
    console.log('📦 [Tropiplus] Longitud:', products ? products.length : 'undefined');
    
    if (!products) {
      console.error('❌ [Tropiplus] getSquareProducts devolvió null o undefined');
      throw new Error('No se recibió respuesta de la API');
    }
    
    if (!Array.isArray(products)) {
      console.error('❌ [Tropiplus] getSquareProducts no devolvió un array:', products);
      throw new Error('La respuesta de la API no es un array');
    }
    
    squareProducts = products;
    
    console.log('📦 [Tropiplus] Productos recibidos de Square:', products.length);
    
    if (products.length > 0) {
      console.log('📦 [Tropiplus] Primeros 3 productos:', products.slice(0, 3).map(p => ({
        id: p.id,
        name: p.item_data?.name,
        type: p.type,
        variations: p.item_data?.variations?.length
      })));
    }
    
    if (products.length === 0) {
      console.warn('⚠️ [Tropiplus] No se encontraron productos en Square');
      // Mostrar mensaje en la página solo si estamos en index.html
      const bestSellersCarousel = document.getElementById('best-sellers-carousel');
      const recommendationsCarousel = document.getElementById('recommendations-carousel');
      if (bestSellersCarousel) {
        bestSellersCarousel.innerHTML = '<div class="no-products-message"><p>No hay productos disponibles en este momento. Por favor, contacte al administrador.</p></div>';
      }
      if (recommendationsCarousel) {
        recommendationsCarousel.innerHTML = '<div class="no-products-message"><p>No hay productos disponibles en este momento. Por favor, contacte al administrador.</p></div>';
      }
      return;
    }
    
    // Reconstruir jerarquía ahora que tenemos productos
    if (squareCategories.length > 0) {
      console.log('🏗️ [Tropiplus] Reconstruyendo jerarquía de categorías...');
      buildCategoryHierarchy(squareCategories);
      // Re-renderizar sidebar con la jerarquía actualizada
      renderCategoriesSidebar(squareCategories);
    }
    
    console.log('🎨 [Tropiplus] Renderizando productos...');
    await renderBestSellers(products);
    await renderRecommendations(products);
    
    console.log('✅ [Tropiplus] Productos cargados y renderizados exitosamente:', products.length);
    
    // Disparar evento personalizado para que products-list.js sepa que los productos están listos
    window.dispatchEvent(new CustomEvent('squareProductsLoaded', { detail: { products: squareProducts } }));
    
  } catch (error) {
    console.error('❌ [Tropiplus] Error CRÍTICO cargando productos:', error);
    console.error('❌ [Tropiplus] Mensaje:', error.message);
    console.error('❌ [Tropiplus] Stack:', error.stack);
    
    // Mostrar mensaje de error en la página
    // Solo intentar cargar carouseles si estamos en index.html
    const bestSellersCarousel = document.getElementById('best-sellers-carousel');
    const recommendationsCarousel = document.getElementById('recommendations-carousel');
    
    // Si no estamos en index.html, no hay carouseles, salir silenciosamente
    if (!bestSellersCarousel && !recommendationsCarousel) {
      console.log('ℹ️ [Tropiplus] No se encontraron carouseles (no estamos en index.html)');
      return;
    }
    const errorHtml = `<div class="no-products-message" style="color: red; padding: 20px; text-align: center;">
      <h3>⚠️ Error cargando productos</h3>
      <p><strong>Mensaje:</strong> ${error.message}</p>
      <p><strong>Por favor, contacte al administrador.</strong></p>
    </div>`;
    
    if (bestSellersCarousel) {
      bestSellersCarousel.innerHTML = errorHtml;
    }
    if (recommendationsCarousel) {
      recommendationsCarousel.innerHTML = errorHtml;
    }
    
    // Re-lanzar el error para que se vea en la consola
    throw error;
  }
}

function renderCategoriesBar(categories) {
  const categoriesScroll = document.getElementById('categories-scroll');
  if (!categoriesScroll) return;
  
  categoriesScroll.innerHTML = '';
  
  const validCategories = categories.filter(cat => {
    const catData = cat.category_data;
    if (!catData || !catData.name || !catData.name.trim()) return false;
    // Ocultar categoría "Remesa" del menú de categorías
    const catName = catData.name.toLowerCase();
    if (catName.includes('remesa')) return false;
    return true;
  });
  
  validCategories.forEach(category => {
    const categoryData = category.category_data;
    const categoryChip = document.createElement('a');
    categoryChip.href = `products.html?category=${category.id}&name=${encodeURIComponent(categoryData.name)}`;
    categoryChip.className = 'category-chip';
    categoryChip.textContent = categoryData.name;
    categoriesScroll.appendChild(categoryChip);
  });
}

function renderCategoriesSidebar(categories) {
  const categoriesList = document.getElementById('categories-list');
  if (!categoriesList) return;
  
  categoriesList.innerHTML = '';
  
  // Filtrar solo categorías principales (que no son subcategorías)
  const parentCategoryIds = Object.keys(categoryHierarchy);
  const allSubcategoryIds = new Set();
  Object.values(categoryHierarchy).forEach(subcats => {
    subcats.forEach(subcat => allSubcategoryIds.add(subcat.id));
  });
  
  const validCategories = categories.filter(cat => {
    const catData = cat.category_data;
    if (!catData || !catData.name || !catData.name.trim()) return false;
    // Ocultar categoría "Remesa" del menú de categorías
    const catName = catData.name.toLowerCase();
    if (catName.includes('remesa')) return false;
    // Mostrar solo categorías principales o categorías que no son subcategorías
    return parentCategoryIds.includes(cat.id) || !allSubcategoryIds.has(cat.id);
  });
  
  if (validCategories.length === 0) {
    categoriesList.innerHTML = '<div class="categories-loading"><p>No hay categorías disponibles</p></div>';
    return;
  }
  
  validCategories.forEach(category => {
    const categoryData = category.category_data;
    const categoryItem = document.createElement('a');
    categoryItem.href = `products.html?category=${category.id}&name=${encodeURIComponent(categoryData.name)}`;
    categoryItem.className = 'category-list-item';
    categoryItem.dataset.categoryId = category.id;
    
    const categoryName = document.createElement('span');
    categoryName.className = 'category-list-name';
    categoryName.textContent = categoryData.name;
    
    const categoryArrow = document.createElement('i');
    categoryArrow.className = 'fas fa-chevron-right category-list-arrow';
    
    categoryItem.appendChild(categoryName);
    
    // Solo mostrar flecha si tiene subcategorías
    if (categoryHierarchy[category.id] && categoryHierarchy[category.id].length > 0) {
      categoryItem.appendChild(categoryArrow);
      
      // Al hacer clic, mostrar subcategorías
      categoryItem.addEventListener('click', (e) => {
        e.preventDefault();
        showSubcategories(category);
      });
    } else {
      // Si no tiene subcategorías, filtrar productos directamente
      categoryItem.addEventListener('click', (e) => {
        e.preventDefault();
        filterProductsByCategory(category.id, categoryData.name);
        closeCategoriesSidebar();
      });
    }
    
    categoriesList.appendChild(categoryItem);
  });
}

function showSubcategories(parentCategory) {
  currentParentCategory = parentCategory;
  const subcategories = categoryHierarchy[parentCategory.id] || [];
  
  // Expandir el sidebar
  const sidebar = document.getElementById('categories-sidebar-panel');
  if (sidebar) {
    sidebar.classList.add('has-subcategories');
  }
  
  // Mostrar botón de volver
  const backBtn = document.getElementById('categories-back');
  if (backBtn) {
    backBtn.classList.add('visible');
  }
  
  // Actualizar título
  const title = document.querySelector('.categories-panel-title');
  if (title) {
    title.textContent = parentCategory.category_data?.name || 'Categorías';
  }
  
  // Ocultar panel de categorías principales
  const categoriesList = document.getElementById('categories-list');
  if (categoriesList) {
    categoriesList.classList.add('hidden');
  }
  
  // Mostrar panel de subcategorías
  const subcategoriesList = document.getElementById('subcategories-list');
  if (!subcategoriesList) return;
  
  subcategoriesList.innerHTML = '';
  subcategoriesList.classList.add('visible');
  
  if (subcategories.length === 0) {
    // Si no hay subcategorías definidas, mostrar todos los productos de esta categoría
    subcategoriesList.innerHTML = '<div class="categories-loading"><p>No hay subcategorías. Mostrando todos los productos...</p></div>';
    setTimeout(() => {
      filterProductsByCategory(parentCategory.id, parentCategory.category_data?.name);
      closeCategoriesSidebar();
    }, 500);
    return;
  }
  
  // Agrupar subcategorías por nombre (para mostrar grupos como "CERDO", "POLLO", etc.)
  const groupedSubcategories = {};
  subcategories.forEach(subcat => {
    const name = subcat.category_data?.name?.toUpperCase() || '';
    // Extraer la primera palabra como grupo
    const groupKey = name.split(' ')[0];
    if (!groupedSubcategories[groupKey]) {
      groupedSubcategories[groupKey] = [];
    }
    groupedSubcategories[groupKey].push(subcat);
  });
  
  // Renderizar grupos de subcategorías
  Object.keys(groupedSubcategories).sort().forEach(groupKey => {
    const group = groupedSubcategories[groupKey];
    
    const groupTitle = document.createElement('div');
    groupTitle.className = 'subcategory-group-title';
    groupTitle.textContent = groupKey;
    subcategoriesList.appendChild(groupTitle);
    
    group.forEach(subcategory => {
      const subcategoryData = subcategory.category_data;
      const subcategoryItem = document.createElement('a');
      subcategoryItem.href = `#subcategory-${subcategory.id}`;
      subcategoryItem.className = 'subcategory-item';
      
      const subcategoryName = document.createElement('span');
      subcategoryName.className = 'subcategory-item-name';
      subcategoryName.textContent = subcategoryData.name;
      
      const subcategoryArrow = document.createElement('i');
      subcategoryArrow.className = 'fas fa-chevron-right subcategory-item-arrow';
      
      subcategoryItem.appendChild(subcategoryName);
      subcategoryItem.appendChild(subcategoryArrow);
      
      subcategoryItem.addEventListener('click', (e) => {
        e.preventDefault();
        filterProductsByCategory(subcategory.id, subcategoryData.name);
        closeCategoriesSidebar();
      });
      
      subcategoriesList.appendChild(subcategoryItem);
    });
  });
}

function closeCategoriesSidebar() {
  const categoriesSidebar = document.getElementById('categories-sidebar-panel');
  const categoriesOverlay = document.getElementById('categories-overlay');
  if (categoriesSidebar) {
    categoriesSidebar.classList.remove('open');
    categoriesSidebar.classList.remove('has-subcategories');
  }
  if (categoriesOverlay) categoriesOverlay.classList.remove('active');
  
  // Resetear estado
  setTimeout(() => {
    const categoriesList = document.getElementById('categories-list');
    const subcategoriesList = document.getElementById('subcategories-list');
    const backBtn = document.getElementById('categories-back');
    const title = document.querySelector('.categories-panel-title');
    
    if (categoriesList) categoriesList.classList.remove('hidden');
    if (subcategoriesList) {
      subcategoriesList.classList.remove('visible');
      subcategoriesList.innerHTML = '';
    }
    if (backBtn) backBtn.classList.remove('visible');
    if (title) title.textContent = 'Categorías';
    currentParentCategory = null;
  }, 300);
}

function filterProductsByCategory(categoryId, categoryName) {
  console.log('Filtrando productos por categoría:', categoryName, categoryId);
  // Redirigir a la página de productos con el filtro de categoría
  window.location.href = `products.html?category=${categoryId}&name=${encodeURIComponent(categoryName)}`;
}

async function getCategoryImage(category) {
  const categoryData = category.category_data;
  
  console.log('🔍 Buscando imagen para categoría:', categoryData?.name, category);
  
  // 1. Intentar obtener imagen de la categoría directamente desde Square API
  // Las categorías pueden tener image_ids en diferentes lugares según la estructura de Square
  let imageId = null;
  
  // Verificar si la categoría tiene image_id en el nivel superior
  if (category.image_id) {
    imageId = category.image_id;
    console.log('✅ Encontrado image_id en categoría:', imageId);
  }
  // Verificar en category_data
  else if (categoryData?.image_id) {
    imageId = categoryData.image_id;
    console.log('✅ Encontrado image_id en category_data:', imageId);
  }
  // Verificar si hay un objeto image asociado
  else if (category.related_objects && category.related_objects.images) {
    const images = category.related_objects.images;
    if (images.length > 0) {
      imageId = images[0].id;
      console.log('✅ Encontrado image_id en related_objects:', imageId);
    }
  }
  
  // Si encontramos un image_id, obtener la URL desde Square API
  if (imageId) {
    const squareImageUrl = await getCachedProductImageUrl(imageId);
    if (squareImageUrl) {
      console.log('✅ URL de imagen obtenida desde Square:', squareImageUrl);
      return squareImageUrl;
    } else {
      console.warn('⚠️ No se pudo obtener URL para image_id:', imageId);
    }
  }
  
  // 2. Si no hay imagen propia de la categoría, buscar el primer producto de la categoría con imagen
  if (squareProducts.length > 0) {
    const categoryProducts = squareProducts.filter(product => {
      const itemData = product.item_data;
      if (!itemData || !itemData.categories) return false;
      return itemData.categories.some(cat => cat.id === category.id);
    });
    
    console.log(`📦 Encontrados ${categoryProducts.length} productos en categoría ${categoryData?.name}`);
    
    // Buscar el primer producto que tenga imagen
    for (const product of categoryProducts) {
      const itemData = product.item_data;
      if (itemData.image_ids && itemData.image_ids.length > 0) {
        const productImageId = itemData.image_ids[0];
        const squareImageUrl = await getCachedProductImageUrl(productImageId);
        if (squareImageUrl) {
          console.log('✅ Usando imagen del primer producto:', squareImageUrl);
          return squareImageUrl;
        }
      }
    }
  }
  
  // 3. Si no hay ninguna imagen disponible, retornar null para usar placeholder estático
  console.warn('⚠️ No se encontró imagen para categoría:', categoryData?.name);
  return null;
}

async function renderInterestCategories(categories) {
  const interestGrid = document.getElementById('interest-categories-grid');
  if (!interestGrid) return;
  
  interestGrid.innerHTML = '';
  
  const validCategories = categories.slice(0, 4);
  
  for (const category of validCategories) {
    const categoryData = category.category_data;
    if (!categoryData) continue;
    
    const categoryCard = document.createElement('div');
    categoryCard.className = 'category-card-item';
    
    // Obtener imagen de la categoría desde Square API
    const categoryImageUrl = await getCategoryImage(category);
    
    // Solo usar placeholder si realmente no hay imagen disponible
    const finalImageUrl = categoryImageUrl || 'images/placeholder.svg';
    
    categoryCard.innerHTML = `
      <img src="${finalImageUrl}" 
           alt="${categoryData.name}" 
           class="category-card-image" 
           width="280"
           height="220"
           loading="lazy"
           style="opacity: 0; transition: opacity 0.3s ease;"
           onload="this.style.opacity='1';"
           onerror="if(this.src !== 'images/placeholder.svg') { this.src='images/placeholder.svg'; this.style.opacity='1'; } this.onerror=null;">
      <div class="category-card-title">${categoryData.name}</div>
    `;
    
    // Hacer clickeable para navegar a productos de la categoría
    categoryCard.addEventListener('click', () => {
      window.location.href = `products.html?category=${category.id}&name=${encodeURIComponent(categoryData.name)}`;
    });
    categoryCard.style.cursor = 'pointer';
    
    interestGrid.appendChild(categoryCard);
  }
}

async function renderBestSellers(products) {
  const carousel = document.getElementById('best-sellers-carousel');
  if (!carousel) {
    // No mostrar warning si no estamos en index.html
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
      console.warn('⚠️ No se encontró el elemento #best-sellers-carousel');
    }
    return;
  }
  
  console.log('🎨 Renderizando "Más vendidos"...');
  carousel.innerHTML = '';
  
  const validProducts = products.filter(item => {
    const itemData = item.item_data;
    if (!itemData || !itemData.name) return false;
    const name = itemData.name?.toLowerCase() || '';
    // Filtrar productos que no deben mostrarse en el catálogo
    if (name.includes('remesa')) return false; // Ocultar Remesa del catálogo
    // NO filtrar "Renta Car" - puede ser un producto válido
    // if (name.includes('renta') || name.includes('car rental')) return false;
    return true;
  });
  
  console.log('📦 Productos válidos para "Más vendidos":', validProducts.length);
  
  const productsToShow = validProducts.slice(0, 5);
  console.log('📦 Productos a mostrar en "Más vendidos":', productsToShow.length);
  
  for (const item of productsToShow) {
    try {
      const productCard = await createProductCard(item);
      carousel.appendChild(productCard);
    } catch (error) {
      console.error('❌ Error creando tarjeta de producto:', error, item);
    }
  }
  
  console.log('✅ "Más vendidos" renderizado:', carousel.children.length, 'productos');
}

async function renderRecommendations(products) {
  const carousel = document.getElementById('recommendations-carousel');
  if (!carousel) {
    // No mostrar warning si no estamos en index.html
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
      console.warn('⚠️ No se encontró el elemento #recommendations-carousel');
    }
    return;
  }
  
  console.log('🎨 Renderizando "Recomendaciones"...');
  carousel.innerHTML = '';
  
  const validProducts = products.filter(item => {
    const itemData = item.item_data;
    if (!itemData || !itemData.name) return false;
    const name = itemData.name?.toLowerCase() || '';
    // Filtrar Remesa del catálogo
    if (name.includes('remesa')) return false;
    if (name.includes('renta') || name.includes('car rental')) return false;
    return true;
  });
  
  console.log('📦 Productos válidos para "Recomendaciones":', validProducts.length);
  
  const productsToShow = validProducts.slice(5, 11);
  console.log('📦 Productos a mostrar en "Recomendaciones":', productsToShow.length);
  
  for (const item of productsToShow) {
    try {
      const productCard = await createProductCard(item);
      carousel.appendChild(productCard);
    } catch (error) {
      console.error('❌ Error creando tarjeta de producto:', error, item);
    }
  }
  
  console.log('✅ "Recomendaciones" renderizado:', carousel.children.length, 'productos');
}

async function createProductCard(item) {
  const itemData = item.item_data;
  if (!itemData) {
    console.warn('⚠️ Producto sin item_data:', item);
    return document.createElement('div');
  }
  
  const productCard = document.createElement('div');
  productCard.className = 'product-card-item';
  productCard.setAttribute('data-product-id', item.id);
  
  const variation = itemData.variations && itemData.variations[0];
  const price = variation?.item_variation_data?.price_money;
  
  // Verificar disponibilidad del producto y obtener cantidad (con timeout para no bloquear)
  let availability = { available: true, quantity: null };
  try {
    if (typeof isProductAvailable === 'function') {
      // Usar Promise.race para evitar que se quede colgado
      const availabilityPromise = isProductAvailable(item);
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ available: true, quantity: null }), 2000));
      availability = await Promise.race([availabilityPromise, timeoutPromise]);
    }
  } catch (error) {
    console.warn('⚠️ Error verificando disponibilidad, asumiendo disponible:', error);
    availability = { available: true, quantity: null };
  }
  const isAvailable = availability.available;
  const stockQuantity = availability.quantity;
  
  // Obtener imagen del producto correctamente desde Square API (con timeout)
  let imageUrl = 'images/placeholder.svg';
  
  try {
    if (itemData.image_ids && itemData.image_ids.length > 0) {
      const imageId = itemData.image_ids[0];
      // Obtener la URL real de la imagen desde la API de Square
      if (typeof getCachedProductImageUrl === 'function') {
        const imagePromise = getCachedProductImageUrl(imageId);
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
        const squareImageUrl = await Promise.race([imagePromise, timeoutPromise]);
        if (squareImageUrl) {
          imageUrl = squareImageUrl;
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Error obteniendo imagen, usando placeholder:', error);
    imageUrl = 'images/placeholder.svg';
  }
  
  const priceFormatted = price ? formatSquarePrice(price) : 'Precio no disponible';
  
  // Calcular precio en CUP si está habilitado
  let cupPriceHtml = '';
  if (price && typeof window.getCurrencyConfig === 'function' && typeof window.convertUsdToCup === 'function') {
    const currencyConfig = window.getCurrencyConfig();
    if (currencyConfig.enabled && currencyConfig.exchangeRate) {
      const usdAmount = price.amount / 100; // Convertir centavos a dólares
      const cupAmount = window.convertUsdToCup(usdAmount);
      if (cupAmount !== null) {
        const cupFormatted = cupAmount.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        cupPriceHtml = `<div class="product-price-cup">${cupFormatted} CUP</div>`;
      }
    }
  }
  
  productCard.innerHTML = `
    ${!isAvailable ? '<span class="product-out-of-stock-badge">AGOTADO</span>' : ''}
    <div class="product-image-container ${!isAvailable ? 'out-of-stock-overlay' : ''}">
      <img src="${imageUrl}" 
           alt="${itemData.name}" 
           class="product-image ${!isAvailable ? 'out-of-stock-image' : ''}" 
           loading="lazy"
           width="200"
           height="180"
           style="opacity: 0; transition: opacity 0.3s ease;"
           onerror="this.src='images/placeholder.svg'; this.style.opacity='1'; this.onerror=null;"
           onload="this.style.opacity='1';">
    </div>
    <div class="product-brand-label">${itemData.name?.split(' ')[0] || 'Producto'}</div>
    <div class="product-name-text">${itemData.name || 'Sin nombre'}</div>
    ${!isAvailable ? '<div class="product-out-of-stock-message">Próximamente estará en existencia</div>' : ''}
    ${isAvailable && stockQuantity !== null ? `<div class="product-stock-info">En existencia: ${stockQuantity} unidades</div>` : ''}
    <div class="product-price-container">
      <span class="product-price-main">${priceFormatted}</span>
      ${cupPriceHtml}
    </div>
    <div class="product-actions-row">
      <div class="quantity-control ${!isAvailable ? 'disabled' : ''}">
        <button class="qty-button" type="button" ${!isAvailable ? 'disabled' : ''}>
          <i class="fas fa-minus"></i>
        </button>
        <input type="number" class="qty-number" value="1" min="1" readonly ${!isAvailable ? 'disabled' : ''}>
        <button class="qty-button" type="button" ${!isAvailable ? 'disabled' : ''}>
          <i class="fas fa-plus"></i>
        </button>
      </div>
      <button class="action-button-icon add-to-cart ${!isAvailable ? 'disabled' : ''}" data-product-id="${item.id}" title="${!isAvailable ? 'Producto agotado' : 'Añadir al carrito'}" type="button" ${!isAvailable ? 'disabled' : ''}>
        <i class="fas fa-shopping-cart"></i>
      </button>
      <button class="action-button-icon add-to-wishlist" data-product-id="${item.id}" title="Añadir a favoritos" type="button">
        <i class="far fa-heart"></i>
      </button>
    </div>
  `;
  
  // Event listener para agregar al carrito
  const addToCartBtn = productCard.querySelector('.add-to-cart');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Verificar inventario antes de agregar
      const currentAvailability = typeof isProductAvailable === 'function' ? await isProductAvailable(item) : { available: true, quantity: null };
      if (!currentAvailability.available) {
        alert('Este producto ya no está disponible. Se ha agotado.');
        // Actualizar la tarjeta
        productCard.querySelector('.product-out-of-stock-badge')?.remove();
        const badge = document.createElement('span');
        badge.className = 'product-out-of-stock-badge';
        badge.textContent = 'AGOTADO';
        productCard.querySelector('.product-image-container')?.parentElement.insertBefore(badge, productCard.querySelector('.product-image-container'));
        return;
      }
      
      const qtyInput = productCard.querySelector('.qty-number');
      const quantity = parseInt(qtyInput?.value || 1);
      
      // Verificar que la cantidad no exceda el stock disponible
      if (currentAvailability.quantity !== null && quantity > currentAvailability.quantity) {
        alert(`Solo hay ${currentAvailability.quantity} unidades disponibles.`);
        return;
      }
      
      addToCart(item, quantity);
    });
  }
  
  // Event listener para favoritos
  const wishlistBtn = productCard.querySelector('.add-to-wishlist');
  if (wishlistBtn) {
    // Verificar si ya está en favoritos
    const wishlist = JSON.parse(localStorage.getItem('tropiplus_wishlist')) || [];
    if (wishlist.includes(item.id)) {
      const heartIcon = wishlistBtn.querySelector('i');
      if (heartIcon) {
        heartIcon.classList.remove('far', 'fa-heart');
        heartIcon.classList.add('fas', 'fa-heart');
        wishlistBtn.style.color = 'var(--red-badge)';
        wishlistBtn.classList.add('active');
      }
    }
    
    wishlistBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleWishlist(item, wishlistBtn);
    });
  }
  
  // Event listeners para cantidad
  const qtyButtons = productCard.querySelectorAll('.qty-button');
  qtyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const qtyInput = productCard.querySelector('.qty-number');
      if (!qtyInput) return;
      
      let currentValue = parseInt(qtyInput.value) || 1;
      const icon = btn.querySelector('i');
      if (icon && icon.classList.contains('fa-plus')) {
        currentValue++;
      } else if (icon && icon.classList.contains('fa-minus')) {
        currentValue = Math.max(1, currentValue - 1);
      }
      qtyInput.value = currentValue;
    });
  });
  
  // Hacer la tarjeta clickeable para ver detalles (excepto en botones)
  productCard.addEventListener('click', (e) => {
    if (!e.target.closest('.qty-button') && 
        !e.target.closest('.action-button-icon') && 
        !e.target.closest('.quantity-control')) {
      window.location.href = `product.html?id=${item.id}`;
    }
  });
  
  productCard.style.cursor = 'pointer';
  
  return productCard;
}

function formatSquarePrice(price) {
  if (!price) return '$0.00';
  const amount = price.amount || price;
  return `$${(amount / 100).toFixed(2)}`;
}

// Funciones globales para configuración de divisas
// Estas funciones deben estar disponibles en todas las páginas
function getCurrencyConfig() {
  try {
    const raw = localStorage.getItem('tropiplus_currency_config');
    if (!raw) return { exchangeRate: 500, enabled: true };
    return JSON.parse(raw);
  } catch (error) {
    console.warn('No se pudo leer configuración de divisas:', error);
    return { exchangeRate: 500, enabled: true };
  }
}

function convertUsdToCup(usdAmount) {
  const config = getCurrencyConfig();
  if (!config.enabled || !config.exchangeRate) return null;
  return usdAmount * config.exchangeRate;
}

// Exportar funciones globalmente
window.getCurrencyConfig = getCurrencyConfig;
window.convertUsdToCup = convertUsdToCup;

// Función global para agregar al carrito
function addToCart(product, quantity = 1) {
  console.log('🛒 Añadiendo al carrito:', product, 'Cantidad:', quantity);
  
  // Asegurar que shoppingCart esté inicializado
  if (!shoppingCart || !Array.isArray(shoppingCart)) {
    shoppingCart = JSON.parse(localStorage.getItem('tropiplus_cart')) || [];
    console.log('🔄 Carrito reinicializado:', shoppingCart.length, 'items');
  }
  
  // Si es una remesa, usar los datos directamente
  if (product.type === 'remesa' && product.remesaData) {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      type: 'remesa',
      remesaData: product.remesaData
    };
    
    shoppingCart.push(cartItem);
    localStorage.setItem('tropiplus_cart', JSON.stringify(shoppingCart));
    updateCartCount();
    updateCartContent();
    showCartNotification();
    return;
  }
  
  // Si es una recarga de tarjeta de regalo, usar los datos directamente
  if (product.type === 'giftcard_reload') {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      type: 'giftcard_reload',
      giftCardData: {
        giftCardId: product.giftCardId,
        giftCardGan: product.giftCardGan,
        currentBalance: product.currentBalance,
        reloadAmount: product.reloadAmount,
        newBalance: product.newBalance
      }
    };
    
    shoppingCart.push(cartItem);
    localStorage.setItem('tropiplus_cart', JSON.stringify(shoppingCart));
    updateCartCount();
    updateCartContent();
    showCartNotification();
    return;
  }
  
  const itemData = product.item_data;
  const variation = itemData?.variations?.[0];
  const price = variation?.item_variation_data?.price_money;
  
  const cartItem = {
    id: product.id,
    itemId: product.id,
    variationId: variation?.id || null,
    name: itemData?.name || 'Producto sin nombre',
    price: price ? price.amount / 100 : 0,
    quantity: quantity,
    image: itemData?.image_ids?.[0] || null
  };
  
  console.log('📦 Item a agregar:', cartItem);
  
  // Verificar si el producto ya está en el carrito
  const existingItemIndex = shoppingCart.findIndex(item => item.id === product.id);
  
  if (existingItemIndex >= 0) {
    // Actualizar cantidad si ya existe
    shoppingCart[existingItemIndex].quantity += quantity;
    console.log('✅ Cantidad actualizada para item existente');
  } else {
    // Agregar nuevo item
    shoppingCart.push(cartItem);
    console.log('✅ Nuevo item agregado al carrito');
  }
  
  // Guardar en localStorage
  try {
    localStorage.setItem('tropiplus_cart', JSON.stringify(shoppingCart));
    console.log('💾 Carrito guardado en localStorage:', shoppingCart.length, 'items');
    console.log('📦 Contenido completo del carrito:', JSON.stringify(shoppingCart, null, 2));
    
    // Verificar que se guardó correctamente
    const verifyCart = localStorage.getItem('tropiplus_cart');
    if (verifyCart) {
      const parsedCart = JSON.parse(verifyCart);
      console.log('✅ Verificación: Carrito guardado con', parsedCart.length, 'items');
    } else {
      console.error('❌ ERROR: El carrito NO se guardó en localStorage');
    }
  } catch (error) {
    console.error('❌ Error guardando carrito en localStorage:', error);
  }
  
  // Actualizar contador del carrito
  updateCartCount();
  
  // Mostrar notificación
  showCartNotification(cartItem.name, quantity);
  
  // Crear celebración (fuegos artificiales, confetti)
  if (typeof createCelebration === 'function') {
    createCelebration();
  }
  
  // Mostrar carrito
  const cartSidebar = document.getElementById('cart-sidebar');
  const cartOverlay = document.getElementById('cart-overlay');
  if (cartSidebar) cartSidebar.classList.add('open');
  if (cartOverlay) cartOverlay.classList.add('active');
  
  // Actualizar contenido del carrito
  updateCartContent();
}

// Función global para actualizar contador del carrito
function updateCartCount() {
  // Siempre recargar desde localStorage para evitar desincronización
  shoppingCart = JSON.parse(localStorage.getItem('tropiplus_cart')) || [];
  const totalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Actualizar todos los badges del carrito
  const cartBadges = document.querySelectorAll('.cart-badge-number, .cart-badge');
  cartBadges.forEach(badge => {
    badge.textContent = totalItems;
  });
  
  console.log('📊 Carrito actualizado:', totalItems, 'items');
}

// Función global para toggle de favoritos
async function toggleWishlist(product, button) {
  let wishlist = JSON.parse(localStorage.getItem('tropiplus_wishlist')) || [];
  const productId = product.id;
  const heartIcon = button.querySelector('i');
  
  const index = wishlist.indexOf(productId);
  
  if (index >= 0) {
    // Remover de favoritos
    wishlist.splice(index, 1);
    heartIcon.classList.remove('fas', 'fa-heart');
    heartIcon.classList.add('far', 'fa-heart');
    button.style.color = 'var(--gray-text)';
    console.log('💔 Removido de favoritos:', product.item_data?.name);
  } else {
    // Agregar a favoritos
    wishlist.push(productId);
    heartIcon.classList.remove('far', 'fa-heart');
    heartIcon.classList.add('fas', 'fa-heart');
    button.style.color = 'var(--red-badge)';
    console.log('❤️ Agregado a favoritos:', product.item_data?.name);
  }
  
  // Guardar en localStorage
  localStorage.setItem('tropiplus_wishlist', JSON.stringify(wishlist));
  
  // Guardar en Square API si el usuario está logueado
  if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
    const user = getCurrentUser();
    if (user && user.id) {
      try {
        if (typeof saveWishlistToSquare === 'function') {
          await saveWishlistToSquare(user.id, wishlist);
        }
      } catch (error) {
        console.error('Error guardando wishlist en Square:', error);
      }
    }
  }
}

// Función global para mostrar notificación del carrito
function showCartNotification(productName, quantity) {
  // Crear notificación temporal
  const notification = document.createElement('div');
  notification.className = 'cart-notification';
  notification.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${quantity}x ${productName} agregado al carrito</span>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

async function updateCartContent() {
  const cartContent = document.getElementById('cart-content');
  if (!cartContent) return;
  
  // Siempre recargar desde localStorage para evitar desincronización
  shoppingCart = JSON.parse(localStorage.getItem('tropiplus_cart')) || [];
  
  let storeSection = cartContent.querySelector('.cart-store-section');
  if (!storeSection) {
    storeSection = document.createElement('div');
    storeSection.className = 'cart-store-section';
    cartContent.appendChild(storeSection);
  }
  
  if (shoppingCart.length === 0) {
    storeSection.innerHTML = `
      <h4 class="cart-store-title">Tienda</h4>
      <p style="padding: 20px; text-align: center; color: var(--gray-text);">Tu carrito está vacío</p>
    `;
    
    // Resetear totales cuando el carrito está vacío
    const cartTotal = document.getElementById('cart-total-price');
    const cartCount = document.getElementById('cart-item-count');
    if (cartTotal) cartTotal.textContent = `0.00 US$`;
    if (cartCount) cartCount.textContent = `0`;
    const subtotalText = cartTotal?.closest('.cart-subtotal')?.querySelector('span:first-child');
    if (subtotalText) {
      subtotalText.innerHTML = `Subtotal (<span id="cart-item-count">0</span> productos)`;
    }
    return;
  }
  
  let html = '<h4 class="cart-store-title">Tienda</h4>';
  
  for (const item of shoppingCart) {
    // Obtener imagen de forma síncrona usando placeholder si no está disponible
    let imageUrl = 'images/placeholder.svg';
    if (item.image && typeof getCachedProductImageUrl === 'function') {
      try {
        imageUrl = await getCachedProductImageUrl(item.image) || 'images/placeholder.svg';
      } catch (e) {
        console.warn('Error obteniendo imagen del producto:', e);
      }
    }
    // Si es una recarga de tarjeta, mostrar icono especial
    if (item.type === 'giftcard_reload') {
        html += `
          <div class="cart-item-row cart-item-giftcard-reload">
            <div class="cart-item-icon-wrapper giftcard-icon-cart">
              <i class="fas fa-gift"></i>
            </div>
            <div class="cart-item-info">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-price-info">$${item.price.toFixed(2)} x ${item.quantity}</div>
              <div class="cart-item-total">Total: $${(item.price * item.quantity).toFixed(2)}</div>
            </div>
            <button class="cart-item-remove-btn" onclick="removeFromCartSidebar('${item.id}')" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
    } else if (item.type === 'remesa') {
        // Si es una remesa, mostrar icono de monedas
        html += `
          <div class="cart-item-row cart-item-remesa">
            <div class="cart-item-icon-wrapper remesa-icon-cart">
              <i class="fas fa-coins"></i>
            </div>
            <div class="cart-item-info">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-price-info">$${item.price.toFixed(2)} x ${item.quantity}</div>
              <div class="cart-item-total">Total: $${(item.price * item.quantity).toFixed(2)}</div>
            </div>
            <button class="cart-item-remove-btn" onclick="removeFromCartSidebar('${item.id}')" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
    } else {
        html += `
          <div class="cart-item-row">
            <img src="${imageUrl}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-price-info">$${item.price.toFixed(2)} x ${item.quantity}</div>
              <div class="cart-item-total">Total: $${(item.price * item.quantity).toFixed(2)}</div>
            </div>
            <button class="cart-item-remove-btn" onclick="removeFromCartSidebar('${item.id}')" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
    }
  }
  
  storeSection.innerHTML = html;
  
  // Actualizar total
  const total = shoppingCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartTotal = document.getElementById('cart-total-price');
  const cartCount = document.getElementById('cart-item-count');
  if (cartTotal) cartTotal.textContent = `${total.toFixed(2)} US$`;
  if (cartCount) {
    const totalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    // Actualizar texto "producto" o "productos"
    const subtotalText = cartTotal.closest('.cart-subtotal')?.querySelector('span:first-child');
    if (subtotalText) {
      const productText = totalItems === 1 ? 'producto' : 'productos';
      subtotalText.innerHTML = `Subtotal (<span id="cart-item-count">${totalItems}</span> ${productText})`;
    }
  }
}

// Inicializar carrito al cargar
function initShoppingCart() {
  shoppingCart = JSON.parse(localStorage.getItem('tropiplus_cart')) || [];
  updateCartCount();
  updateCartContent();
  
  // Verificar favoritos guardados y actualizar iconos después de que se rendericen los productos
  setTimeout(() => {
    const wishlist = JSON.parse(localStorage.getItem('tropiplus_wishlist')) || [];
    document.querySelectorAll('.add-to-wishlist').forEach(btn => {
      const productCard = btn.closest('.product-card-item');
      if (productCard) {
        const productId = productCard.getAttribute('data-product-id');
        if (wishlist.includes(productId)) {
          const heartIcon = btn.querySelector('i');
          if (heartIcon) {
            heartIcon.classList.remove('far', 'fa-heart');
            heartIcon.classList.add('fas', 'fa-heart');
            btn.style.color = 'var(--red-badge)';
            btn.classList.add('active');
          }
        }
      }
    });
  }, 1000);
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Iniciando integración con Square...');
  
  // Inicializar carrito
  initShoppingCart();
  
  if (typeof SQUARE_CONFIG === 'undefined') {
    console.error('❌ SQUARE_CONFIG no está definido. Verifica que square-config.js se cargue antes de square-integration.js');
    return;
  }
  
  if (!SQUARE_CONFIG.accessToken || 
      SQUARE_CONFIG.accessToken === 'YOUR_ACCESS_TOKEN' ||
      SQUARE_CONFIG.accessToken.trim() === '') {
    console.error('❌ Access Token de Square no configurado correctamente');
    return;
  }
  
  if (!SQUARE_CONFIG.locationId || 
      SQUARE_CONFIG.locationId === 'YOUR_LOCATION_ID' ||
      SQUARE_CONFIG.locationId.trim() === '') {
    console.error('❌ Location ID de Square no configurado correctamente');
    return;
  }
  
  console.log('✅ Configuración de Square verificada:', {
    hasAccessToken: !!SQUARE_CONFIG.accessToken,
    hasLocationId: !!SQUARE_CONFIG.locationId,
    environment: SQUARE_CONFIG.environment
  });
  
  console.log('✅ Configuración de Square verificada');
  
  setTimeout(() => {
    loadSquareCategories();
    loadSquareProducts();
  }, 500);
});

// Hacer funciones disponibles globalmente para todas las páginas
// Función para eliminar item del carrito (sidebar)
function removeFromCartSidebar(itemId) {
  console.log('🗑️ Eliminando item del carrito:', itemId);
  const currentCart = JSON.parse(localStorage.getItem('tropiplus_cart')) || [];
  shoppingCart = currentCart.filter(item => item.id !== itemId);
  localStorage.setItem('tropiplus_cart', JSON.stringify(shoppingCart));
  console.log('✅ Item eliminado. Carrito actualizado:', shoppingCart.length, 'items');
  
  // Actualizar UI
  updateCartCount();
  updateCartContent();
}

window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.updateCartContent = updateCartContent;
window.toggleWishlist = toggleWishlist;
window.showCartNotification = showCartNotification;
window.removeFromCartSidebar = removeFromCartSidebar;
