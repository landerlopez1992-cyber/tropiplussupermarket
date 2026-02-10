// Configuración de Square API
// IMPORTANTE: Reemplaza estos valores con tus credenciales reales de Square

const SQUARE_CONFIG = {
  // Application ID de tu aplicación en Square Developer Dashboard
  applicationId: 'sq0idp-1soiZa2SKukDWOuzVG9QAA',
  
  // Access Token (Sandbox o Production)
  // Sandbox: Para pruebas
  // Production: Para producción real
  accessToken: 'EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB',
  
  // Location ID de tu tienda Square
  locationId: 'L94DY3ZD6WS85',
  
  // Environment: 'sandbox' o 'production'
  environment: 'production',
  
  // Base URL de la API según el environment
  get apiBaseUrl() {
    return this.environment === 'production' 
      ? 'https://connect.squareup.com' 
      : 'https://connect.squareupsandbox.com';
  }
};

// Función para hacer llamadas a la API de Square
// Usa el proxy local o externo según el entorno
async function squareApiCall(endpoint, method = 'GET', body = null) {
  // Detectar si estamos en producción (GitHub Pages) o desarrollo local
  const isProduction = window.location.hostname.includes('github.io') || 
                       window.location.hostname.includes('vercel.app') ||
                       window.location.hostname !== 'localhost';
  
  // URLs de proxy a intentar (en orden de prioridad)
  let proxyUrls = [];
  
  if (isProduction) {
    // En producción: usar Supabase del proyecto LogiFlow Pro
    const SUPABASE_URL = 'https://fbbvfzeyhhopdwzsooew.supabase.co/functions/v1/square-proxy';
    
    proxyUrls = [
      SUPABASE_URL,  // Supabase LogiFlow Pro (PRINCIPAL)
      'https://tropiplussupermarket.vercel.app',  // Vercel (fallback)
      'https://corsproxy.io/?',  // Proxy público 1
      'https://api.allorigins.win/raw?url=',  // Proxy público 2
    ];
  } else {
    // En desarrollo: usar proxy local
    proxyUrls = ['http://localhost:8080'];
  }
  
  // Intentar cada proxy hasta que uno funcione
  let lastError = null;
  
  for (const baseUrl of proxyUrls) {
    try {
      let proxyUrl;
      let options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      if (baseUrl.includes('allorigins.win')) {
        // Proxy público que requiere URL completa
        const squareUrl = `https://connect.squareup.com${endpoint}`;
        proxyUrl = `${baseUrl}${encodeURIComponent(squareUrl)}`;
        // Headers especiales para este proxy
        options.headers['Square-Version'] = '2024-01-18';
        options.headers['Authorization'] = `Bearer ${SQUARE_CONFIG.accessToken}`;
      } else if (baseUrl.includes('corsproxy.io')) {
        // Proxy público que requiere URL completa
        const squareUrl = `https://connect.squareup.com${endpoint}`;
        proxyUrl = `${baseUrl}${encodeURIComponent(squareUrl)}`;
        options.headers['Square-Version'] = '2024-01-18';
        options.headers['Authorization'] = `Bearer ${SQUARE_CONFIG.accessToken}`;
      } else if (baseUrl.includes('supabase.co')) {
        // Proxy de Supabase - construir la URL correctamente
        // baseUrl es: https://fbbvfzeyhhopdwzsooew.supabase.co/functions/v1/square-proxy
        // endpoint es: /v2/catalog/search
        // Resultado: https://fbbvfzeyhhopdwzsooew.supabase.co/functions/v1/square-proxy/v2/catalog/search
        proxyUrl = `${baseUrl}${endpoint}`;
      } else {
        // Proxy normal (Vercel o local)
        proxyUrl = `${baseUrl}/api/square${endpoint}`;
      }
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      console.log(`📡 Intentando proxy: ${baseUrl}`);
      console.log(`🔗 URL completa: ${proxyUrl}`);
      
      const response = await fetch(proxyUrl, options);
      
      // Si el proxy es allorigins, necesitamos parsear la respuesta de manera especial
      if (baseUrl.includes('allorigins.win') || baseUrl.includes('corsproxy.io')) {
        const responseText = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = JSON.parse(responseText);
        console.log(`✅ Éxito con proxy: ${baseUrl}`);
        return data;
      }
      
      const responseText = await response.text();
      
      if (!response.ok) {
        // Si es 404 o 502, probar siguiente proxy
        if (response.status === 404 || response.status === 502) {
          console.warn(`⚠️ Proxy ${baseUrl} no disponible (${response.status}), intentando siguiente...`);
          lastError = new Error(`Proxy no disponible: ${response.status}`);
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      let data;
      try {
        if (!responseText || responseText.trim() === '') {
          data = {};
        } else {
          data = JSON.parse(responseText);
        }
      } catch (parseError) {
        throw new Error(`Error parseando respuesta: ${parseError.message}`);
      }
      
      console.log(`✅ Éxito con proxy: ${baseUrl}`);
      return data;
      
    } catch (error) {
      console.warn(`❌ Error con proxy ${baseUrl}:`, error.message);
      lastError = error;
      // Continuar con el siguiente proxy
      continue;
    }
  }
  
  // Si todos los proxies fallaron
  console.error('❌ Todos los proxies fallaron');
  throw new Error(`No se pudo conectar con Square API. Último error: ${lastError?.message || 'Desconocido'}. Por favor, despliega el proxy en Vercel siguiendo las instrucciones en DEPLOY_VERCEL.md`);
}
  
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    console.log('📡 Llamando a Square API vía proxy:', proxyUrl);
    if (body) {
      console.log('📤 Body enviado:', JSON.stringify(body, null, 2));
    }
    
    const response = await fetch(proxyUrl, options);
    
    console.log('📥 Respuesta de Square API:', response.status, response.statusText);
    
    // Leer el texto de la respuesta primero
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        // Si no es JSON, crear un objeto de error con el texto
        errorData = { 
          message: responseText || `HTTP error! status: ${response.status}`,
          raw: responseText.substring(0, 500) // Primeros 500 caracteres para debugging
        };
      }
      
      console.error('❌ Error de Square API:', errorData);
      console.error('❌ Status:', response.status, response.statusText);
      console.error('❌ URL:', proxyUrl);
      if (body) {
        console.error('❌ Body enviado:', JSON.stringify(body, null, 2));
      }
      
      // Si es un 404, proporcionar más información
      if (response.status === 404) {
        throw new Error(`Endpoint no encontrado (404). Verifica que el endpoint ${proxyUrl} existe en Square API. Detalles: ${errorData.errors?.[0]?.detail || errorData.message || 'Resource not found'}`);
      }
      
      // Construir mensaje de error más detallado
      let errorMessage = errorData.message || errorData.errors?.[0]?.detail || `HTTP error! status: ${response.status}`;
      if (errorData.errors && errorData.errors.length > 0) {
        const firstError = errorData.errors[0];
        errorMessage = firstError.detail || firstError.code || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
    // Intentar parsear JSON de forma segura
    let data;
    try {
      if (!responseText || responseText.trim() === '') {
        // Respuesta vacía, retornar objeto vacío
        console.log('⚠️ Respuesta vacía de Square API');
        return {};
      }
      data = JSON.parse(responseText);
      console.log('✅ Datos recibidos de Square:', data);
      return data;
    } catch (parseError) {
      console.error('❌ Error parseando respuesta JSON:', parseError);
      console.error('❌ Texto recibido (primeros 500 chars):', responseText.substring(0, 500));
      throw new Error(`Error parseando respuesta de Square API: ${parseError.message}. Respuesta recibida: ${responseText.substring(0, 200)}`);
    }
  } catch (error) {
    console.error('❌ Error en Square API:', error);
    throw error;
  }
}

// Función para obtener todas las categorías con sus imágenes
async function getSquareCategories() {
  try {
    const response = await squareApiCall(
      `/v2/catalog/search`,
      'POST',
      {
        object_types: ['CATEGORY'],
        include_related_objects: true  // Incluir objetos relacionados como imágenes
      }
    );
    
    console.log('📋 Respuesta de categorías de Square:', response);
    
    if (response.objects) {
      // Log de la estructura de cada categoría para debugging
      response.objects.forEach((cat, index) => {
        if (index < 2) { // Solo log de las primeras 2 para no saturar
          console.log(`📦 Categoría ${index + 1}:`, {
            id: cat.id,
            type: cat.type,
            image_id: cat.image_id,
            category_data: cat.category_data,
            related_objects: cat.related_objects ? Object.keys(cat.related_objects) : null
          });
        }
      });
    }
    
    return response.objects || [];
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    return [];
  }
}

// Función para obtener todos los productos
async function getSquareProducts() {
  try {
    const response = await squareApiCall(
      `/v2/catalog/search`,
      'POST',
      {
        object_types: ['ITEM']
      }
    );
    
    return response.objects || [];
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    return [];
  }
}

// Función para obtener el inventario de una variación de producto
async function getProductInventory(variationId) {
  try {
    if (!variationId) return null;
    
    // Usar la API de búsqueda de inventario de Square
    const response = await squareApiCall(
      `/v2/inventory/batch-retrieve-counts`,
      'POST',
      {
        catalog_object_ids: [variationId],
        location_ids: [SQUARE_CONFIG.locationId]
      }
    );
    
    if (response && response.counts && response.counts.length > 0) {
      const count = response.counts[0];
      return {
        quantity: parseInt(count.quantity) || 0,
        state: count.state || 'NONE'
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Error obteniendo inventario para', variationId, error);
    return null;
  }
}

// Cache de inventario para evitar múltiples llamadas
const inventoryCache = {};

// Función para verificar si un producto está disponible y obtener cantidad
async function isProductAvailable(product) {
  const itemData = product.item_data;
  if (!itemData || !itemData.variations || itemData.variations.length === 0) {
    return { available: true, quantity: null }; // Si no hay variación, asumir disponible
  }
  
  const variation = itemData.variations[0];
  const variationId = variation.id;
  
  // Verificar cache
  if (inventoryCache[variationId] !== undefined) {
    return inventoryCache[variationId];
  }
  
  // Obtener inventario
  const inventory = await getProductInventory(variationId);
  
  if (inventory === null) {
    // Si no se puede obtener inventario, asumir disponible
    const result = { available: true, quantity: null };
    inventoryCache[variationId] = result;
    return result;
  }
  
  // Producto disponible si quantity > 0 y state no es 'NONE'
  const isAvailable = inventory.quantity > 0 && inventory.state !== 'NONE';
  const result = { 
    available: isAvailable, 
    quantity: inventory.quantity || 0 
  };
  inventoryCache[variationId] = result;
  
  return result;
}

// Función para obtener cantidad disponible de un producto
async function getProductStock(product) {
  const availability = await isProductAvailable(product);
  return availability.quantity;
}

// Función de compatibilidad que retorna solo booleano (para código legacy)
async function isProductAvailableBoolean(product) {
  const result = await isProductAvailable(product);
  return result.available;
}

// Hacer funciones disponibles globalmente
window.getProductInventory = getProductInventory;
window.isProductAvailable = isProductAvailable;
window.isProductAvailableBoolean = isProductAvailableBoolean;
window.getProductStock = getProductStock;

// Función para obtener productos por categoría
async function getSquareProductsByCategory(categoryId) {
  try {
    const response = await squareApiCall(
      `/v2/catalog/search`,
      'POST',
      {
        object_types: ['ITEM'],
        query: {
          exact_query: {
            attribute_name: 'category_id',
            attribute_value: categoryId
          }
        }
      }
    );
    
    return response.objects || [];
  } catch (error) {
    console.error('Error obteniendo productos por categoría:', error);
    // Si falla, intentar filtrar localmente
    return squareProducts.filter(item => {
      return item.item_data?.category_id === categoryId;
    });
  }
}

// Función para formatear precio de Square (centavos a dólares)
function formatSquarePrice(price) {
  if (!price) return '$0.00';
  const amount = price.amount || price;
  return `$${(amount / 100).toFixed(2)}`;
}

// Función para obtener la URL de la imagen del producto desde Square API
async function getProductImageUrl(imageId) {
  if (!imageId) return null;
  
  try {
    // Obtener el objeto CatalogImage usando el endpoint correcto
    const response = await squareApiCall(`/v2/catalog/object/${imageId}`, 'GET');
    console.log('📷 Respuesta de imagen:', response);
    
    // Según la documentación, la estructura es: response.object.image_data.url
    if (response && response.object && response.object.image_data) {
      const imageUrl = response.object.image_data.url;
      if (imageUrl) {
        console.log('✅ URL de imagen encontrada:', imageUrl);
        return imageUrl;
      }
    }
    
    console.warn('⚠️ No se encontró URL en la respuesta de imagen');
  } catch (error) {
    console.warn('⚠️ Error obteniendo imagen:', imageId, error);
  }
  
  return null;
}

// Cache de URLs de imágenes para evitar llamadas repetidas
const imageUrlCache = new Map();

// Función optimizada para obtener URL de imagen con cache
async function getCachedProductImageUrl(imageId) {
  if (!imageId) return null;
  
  // Verificar si ya está en cache
  if (imageUrlCache.has(imageId)) {
    return imageUrlCache.get(imageId);
  }
  
  // Obtener la URL de la API
  const url = await getProductImageUrl(imageId);
  
  // Guardar en cache
  if (url) {
    imageUrlCache.set(imageId, url);
  }
  
  return url;
}

// Función para obtener múltiples imágenes (optimizada con Promise.allSettled)
async function getProductImageUrls(imageIds) {
  if (!imageIds || imageIds.length === 0) return [];
  
  const imagePromises = imageIds.map(id => getCachedProductImageUrl(id));
  const results = await Promise.allSettled(imagePromises);
  
  return results
    .filter(result => result.status === 'fulfilled' && result.value !== null)
    .map(result => result.value);
}
