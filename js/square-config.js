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
// Usa el proxy local para evitar problemas de CORS
async function squareApiCall(endpoint, method = 'GET', body = null) {
  // Usar proxy local en lugar de llamar directamente a Square
  const proxyUrl = `/api/square${endpoint}`;
  
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
    const response = await fetch(proxyUrl, options);
    
    console.log('📥 Respuesta de Square API:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      console.error('❌ Error de Square API:', errorData);
      console.error('❌ Status:', response.status, response.statusText);
      console.error('❌ URL:', proxyUrl);
      console.error('❌ Body enviado:', body ? JSON.stringify(JSON.parse(body), null, 2) : 'N/A');
      
      // Si es un 404, proporcionar más información
      if (response.status === 404) {
        throw new Error(`Endpoint no encontrado (404). Verifica que el endpoint ${proxyUrl} existe en Square API. Detalles: ${errorData.errors?.[0]?.detail || errorData.message || 'Resource not found'}`);
      }
      
      throw new Error(errorData.message || errorData.errors?.[0]?.detail || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Datos recibidos de Square:', data);
    return data;
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
