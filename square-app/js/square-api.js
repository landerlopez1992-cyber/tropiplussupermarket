// Square API Client simplificado
// Soporta dos modos:
// 1. OAuth (App Marketplace) - cada merchant autoriza su cuenta
// 2. Proxy directo (fallback) - usa squareApiCall del proyecto principal

let SQUARE_CONFIG = null;
let squareApiCall = null;
let oauthMode = false; // true si usa OAuth, false si usa proxy directo

// Inicializar con OAuth (App Marketplace)
function initSquareApiWithOAuth(accessToken, locationId) {
    oauthMode = true;
    SQUARE_CONFIG = {
        accessToken: accessToken,
        locationId: locationId,
        apiBaseUrl: 'https://connect.squareup.com'
    };
    console.log('✅ Usando OAuth (App Marketplace)');
    return true;
}

// Inicializar usando el proxy existente (fallback)
function initSquareApi() {
    // Si ya está inicializado con OAuth, no cambiar
    if (oauthMode && SQUARE_CONFIG) {
        return true;
    }
    
    // Intentar cargar desde el script principal si está disponible
    if (typeof window !== 'undefined') {
        if (window.squareApiCall && window.SQUARE_CONFIG) {
            squareApiCall = window.squareApiCall;
            SQUARE_CONFIG = window.SQUARE_CONFIG;
            oauthMode = false;
            console.log('✅ Usando squareApiCall del proyecto principal');
            return true;
        }
    }
    
    // Si no está disponible, cargar dinámicamente
    return loadSquareConfig();
}

// Cargar configuración de Square dinámicamente
async function loadSquareConfig() {
    try {
        // Cargar el script de configuración de Square
        const script = document.createElement('script');
        script.src = '../js/square-config.js';
        document.head.appendChild(script);
        
        return new Promise((resolve) => {
            script.onload = () => {
                if (window.squareApiCall && window.SQUARE_CONFIG) {
                    squareApiCall = window.squareApiCall;
                    SQUARE_CONFIG = window.SQUARE_CONFIG;
                    console.log('✅ Configuración de Square cargada');
                    resolve(true);
                } else {
                    console.error('❌ No se pudo cargar la configuración de Square');
                    resolve(false);
                }
            };
            script.onerror = () => {
                console.error('❌ Error cargando square-config.js');
                resolve(false);
            };
        });
    } catch (error) {
        console.error('Error cargando configuración:', error);
        return false;
    }
}

// Función genérica para llamar a Square API
async function squareApiRequest(endpoint, method = 'GET', body = null) {
    // Si está en modo OAuth, hacer llamada directa
    if (oauthMode && SQUARE_CONFIG && SQUARE_CONFIG.accessToken) {
        const url = `${SQUARE_CONFIG.apiBaseUrl}${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${SQUARE_CONFIG.accessToken}`,
                'Content-Type': 'application/json',
                'Square-Version': '2024-01-18'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.errors?.[0]?.detail || `Error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en Square API (OAuth):', error);
            throw error;
        }
    }
    
    // Si no está en modo OAuth, usar proxy
    if (!squareApiCall) {
        const loaded = await initSquareApi();
        if (!loaded) {
            throw new Error('No se pudo cargar la configuración de Square API');
        }
    }
    
    return squareApiCall(endpoint, method, body);
}

// ============ INVENTARIO ============

// Obtener inventario de todos los productos
async function getInventory() {
    try {
        if (!SQUARE_CONFIG) {
            await initSquareApi();
        }
        
        // Primero obtener todos los items
        const catalogResponse = await squareApiRequest('/v2/catalog/search', 'POST', {
            object_types: ['ITEM'],
            limit: 1000
        });
        
        const items = catalogResponse.objects || [];
        const variationIds = [];
        
        // Extraer IDs de variaciones
        items.forEach(item => {
            if (item.item_data?.variations) {
                item.item_data.variations.forEach(variation => {
                    variationIds.push(variation.id);
                });
            }
        });
        
        if (variationIds.length === 0) {
            return [];
        }
        
        // Obtener inventario en lotes
        const inventoryResponse = await squareApiRequest('/v2/inventory/batch-retrieve-counts', 'POST', {
            catalog_object_ids: variationIds,
            location_ids: [SQUARE_CONFIG.locationId]
        });
        
        const inventoryCounts = inventoryResponse.counts || [];
        
        // Combinar items con inventario
        const inventory = [];
        items.forEach(item => {
            if (item.item_data?.variations) {
                item.item_data.variations.forEach(variation => {
                    const inventoryCount = inventoryCounts.find(
                        count => count.catalog_object_id === variation.id
                    );
                    
                    inventory.push({
                        itemId: item.id,
                        variationId: variation.id,
                        name: item.item_data.name,
                        variationName: variation.item_variation_data?.name || 'Default',
                        categoryId: item.item_data.category_id,
                        categoryName: item.item_data.categories?.[0]?.name || 'Sin categoría',
                        price: variation.item_variation_data?.price_money?.amount || 0,
                        quantity: inventoryCount ? parseInt(inventoryCount.quantity) : 0,
                        state: inventoryCount?.state || 'NONE',
                        sku: variation.item_variation_data?.sku || ''
                    });
                });
            }
        });
        
        return inventory;
    } catch (error) {
        console.error('Error obteniendo inventario:', error);
        throw error;
    }
}

// Actualizar inventario
async function updateInventory(variationId, quantity, adjustmentType = 'set') {
    try {
        if (!SQUARE_CONFIG) {
            await initSquareApi();
        }
        
        let finalQuantity = quantity;
        
        if (adjustmentType === 'add' || adjustmentType === 'subtract') {
            // Obtener cantidad actual
            const currentResponse = await squareApiRequest('/v2/inventory/batch-retrieve-counts', 'POST', {
                catalog_object_ids: [variationId],
                location_ids: [SQUARE_CONFIG.locationId]
            });
            
            const currentCount = currentResponse.counts?.[0];
            const currentQuantity = currentCount ? parseInt(currentCount.quantity) : 0;
            
            if (adjustmentType === 'add') {
                finalQuantity = currentQuantity + quantity;
            } else {
                finalQuantity = Math.max(0, currentQuantity - quantity);
            }
        }
        
        // Crear ajuste de inventario
        const response = await squareApiRequest('/v2/inventory/batch-change', 'POST', {
            idempotency_key: `inventory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            changes: [{
                type: 'ADJUSTMENT',
                adjustment: {
                    catalog_object_id: variationId,
                    catalog_object_type: 'ITEM_VARIATION',
                    from_state: 'NONE',
                    to_state: 'NONE',
                    location_id: SQUARE_CONFIG.locationId,
                    quantity: finalQuantity.toString(),
                    occurred_at: new Date().toISOString()
                }
            }]
        });
        
        return response;
    } catch (error) {
        console.error('Error actualizando inventario:', error);
        throw error;
    }
}

// ============ PEDIDOS ============

// Obtener pedidos
async function getOrders(statusFilter = null) {
    try {
        const query = {
            location_ids: [squareApiClient.locationId],
            query: {
                filter: {}
            },
            limit: 100
        };
        
        if (statusFilter) {
            query.query.filter.state_filter = {
                states: [statusFilter]
            };
        }
        
        const response = await squareApiRequest('/v2/orders/search', 'POST', {
            location_ids: [SQUARE_CONFIG.locationId],
            query: {
                filter: statusFilter ? {
                    state_filter: {
                        states: [statusFilter]
                    }
                } : {}
            },
            limit: 100
        });
        return response.orders || [];
    } catch (error) {
        console.error('Error obteniendo pedidos:', error);
        throw error;
    }
}

// ============ PRODUCTOS ============

// Obtener productos
async function getProducts() {
    try {
        const response = await squareApiRequest('/v2/catalog/search', 'POST', {
            object_types: ['ITEM'],
            limit: 1000
        });
        
        return response.objects || [];
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        throw error;
    }
}

// Crear producto
async function createProduct(productData) {
    try {
        const catalogObject = {
            type: 'ITEM',
            id: `#${Date.now()}`,
            item_data: {
                name: productData.name,
                category_id: productData.categoryId || null,
                variations: [{
                    type: 'ITEM_VARIATION',
                    id: `#${Date.now()}_var`,
                    item_variation_data: {
                        name: 'Default',
                        pricing_type: 'FIXED_PRICING',
                        price_money: {
                            amount: Math.round(productData.price * 100), // Convertir a centavos
                            currency: 'USD'
                        },
                        sku: productData.sku || null,
                        track_inventory: productData.inventory > 0
                    }
                }]
            }
        };
        
        const response = await squareApiRequest('/v2/catalog/object', 'POST', {
            idempotency_key: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            object: catalogObject
        });
        
        // Si hay inventario inicial, agregarlo
        if (productData.inventory > 0 && response.catalog_object?.item_data?.variations?.[0]?.id) {
            await updateInventory(
                response.catalog_object.item_data.variations[0].id,
                productData.inventory,
                'set'
            );
        }
        
        return response;
    } catch (error) {
        console.error('Error creando producto:', error);
        throw error;
    }
}

// Obtener categorías
async function getCategories() {
    try {
        const response = await squareApiRequest('/v2/catalog/search', 'POST', {
            object_types: ['CATEGORY'],
            limit: 1000
        });
        
        return (response.objects || []).map(cat => ({
            id: cat.id,
            name: cat.category_data.name
        }));
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        throw error;
    }
}

// Exportar funciones
window.squareApi = {
    init: initSquareApi,
    initWithOAuth: initSquareApiWithOAuth, // Para App Marketplace
    getInventory,
    updateInventory,
    getOrders,
    getProducts,
    createProduct,
    getCategories,
    getLocationId: () => SQUARE_CONFIG?.locationId || (oauthMode ? SQUARE_CONFIG?.locationId : null)
};
