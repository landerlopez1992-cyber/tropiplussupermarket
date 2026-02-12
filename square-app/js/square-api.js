// Square API Client simplificado
// Usa el access token de OAuth para hacer llamadas a Square API

let squareApiClient = {
    accessToken: null,
    locationId: null,
    baseUrl: 'https://connect.squareup.com'
};

// Inicializar cliente con tokens
function initSquareApi(accessToken, locationId) {
    squareApiClient.accessToken = accessToken;
    squareApiClient.locationId = locationId;
}

// Función genérica para llamar a Square API
async function squareApiRequest(endpoint, method = 'GET', body = null) {
    if (!squareApiClient.accessToken) {
        throw new Error('No hay conexión con Square. Por favor, conéctate primero.');
    }
    
    const url = `${squareApiClient.baseUrl}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Authorization': `Bearer ${squareApiClient.accessToken}`,
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
        console.error('Error en Square API:', error);
        throw error;
    }
}

// ============ INVENTARIO ============

// Obtener inventario de todos los productos
async function getInventory() {
    try {
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
            location_ids: [squareApiClient.locationId]
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
        let finalQuantity = quantity;
        
        if (adjustmentType === 'add' || adjustmentType === 'subtract') {
            // Obtener cantidad actual
            const currentResponse = await squareApiRequest('/v2/inventory/batch-retrieve-counts', 'POST', {
                catalog_object_ids: [variationId],
                location_ids: [squareApiClient.locationId]
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
                    location_id: squareApiClient.locationId,
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
        
        const response = await squareApiRequest('/v2/orders/search', 'POST', query);
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
    getInventory,
    updateInventory,
    getOrders,
    getProducts,
    createProduct,
    getCategories
};
