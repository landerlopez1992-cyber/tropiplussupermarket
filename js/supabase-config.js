// Configuración de Supabase para TV Configs
// Solo para este proyecto - no afecta otros proyectos en Supabase

const SUPABASE_CONFIG = {
    url: 'https://fbbvfzeyhhopdwzsooew.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiYnZmemV5aGhvcGR3enNvb2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTIyMDAsImV4cCI6MjA3NjI4ODIwMH0.EWjNVwscWi3gbz01RYaUjlCsGJddgbjUoO_qaqGmffg'
};

// Función para obtener la anon key (si está disponible)
// Por ahora, usamos fetch directo a la API REST de Supabase
async function getSupabaseAnonKey() {
    // La anon key se puede obtener del dashboard de Supabase
    // Por seguridad, podemos usar fetch directo sin necesidad de la key para lectura pública
    // Si necesitamos escribir, podemos usar una service role key en el admin (solo en servidor)
    return null;
}

// Función para leer TVs desde Supabase (público, sin autenticación)
async function getTvConfigsFromSupabase() {
    try {
        // Usar la anon key configurada (prioridad: código > localStorage)
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        const headers = {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
        
        if (anonKey && anonKey !== 'null' && anonKey !== 'placeholder') {
            headers['apikey'] = anonKey;
            headers['Authorization'] = `Bearer ${anonKey}`;
        } else {
            console.warn('⚠️ [Supabase] Anon key no configurada. Algunas operaciones pueden fallar.');
        }
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/tv_configs?active=eq.true&select=*`,
            {
                method: 'GET',
                headers: headers,
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [Supabase] Error respuesta:', response.status, errorText);
            
            // Si es 404 o 42P01, la tabla no existe
            if (response.status === 404 || errorText.includes('42P01') || errorText.includes('does not exist')) {
                throw new Error('TABLA_NO_EXISTE: Ejecuta el SQL de migración en Supabase Dashboard');
            }
            
            // Si es 401, falta la anon key
            if (response.status === 401) {
                throw new Error('AUTH_REQUIRED: Configura la anon key en localStorage o en supabase-config.js');
            }
            
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const tvs = await response.json();
        console.log('📡 [Supabase] TVs cargados:', tvs.length);
        
        // Convertir formato de BD a formato esperado por la app
        return tvs.map(tv => ({
            id: tv.id,
            name: tv.name,
            mode: tv.mode,
            categoryId: tv.category_id || '',
            categoryName: tv.category_name || 'Todas',
            productCount: tv.product_count || 8,
            slideSeconds: tv.slide_seconds || 10,
            mixedTransitionSeconds: tv.mixed_transition_seconds || 12,
            showPrice: tv.show_price !== false,
            showOffer: tv.show_offer !== false,
            promoText: tv.promo_text || '',
            active: tv.active !== false,
            tickerEnabled: tv.ticker_enabled !== false,
            tickerSpeed: tv.ticker_speed || 'normal',
            tickerFontSize: tv.ticker_font_size || '28px',
            tickerTextColor: tv.ticker_text_color || '#ffec67',
            tickerBgColor: tv.ticker_bg_color || '#000000',
            qrId: tv.qr_id || null,
            qrUrl: tv.qr_url || null,
            qrSize: tv.qr_size || 400,
            screenOrientation: tv.screen_orientation || 'landscape'
        }));
    } catch (error) {
        console.error('❌ [Supabase] Error cargando TVs:', error);
        throw error;
    }
}

// Función para guardar TVs en Supabase (desde admin)
async function saveTvConfigsToSupabase(tvConfigs) {
    try {
        // Normalizar y filtrar solo TVs activos
        const activeTvs = (Array.isArray(tvConfigs) ? tvConfigs : [])
            .filter(tv => tv && tv.active !== false)
            .map(tv => ({
                id: tv.id,
                name: tv.name || 'TV Sin Nombre',
                mode: tv.mode || 'mixed',
                category_id: tv.categoryId || '',
                category_name: tv.categoryName || 'Todas',
                product_count: tv.productCount || 8,
                slide_seconds: tv.slideSeconds || 10,
                mixed_transition_seconds: tv.mixedTransitionSeconds || 12,
                show_price: tv.showPrice !== false,
                show_offer: tv.showOffer !== false,
                promo_text: tv.promoText || '',
                active: tv.active !== false,
                ticker_enabled: tv.tickerEnabled !== false,
                ticker_speed: tv.tickerSpeed || 'normal',
                ticker_font_size: tv.tickerFontSize || '28px',
                ticker_text_color: tv.tickerTextColor || '#ffec67',
                ticker_bg_color: tv.tickerBgColor || '#000000',
                qr_id: tv.qrId || null,
                qr_url: tv.qrUrl || null,
                qr_size: tv.qrSize || 400,
                screen_orientation: tv.screenOrientation || 'landscape'
            }));

        // Usar la anon key configurada (prioridad: código > localStorage)
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        // Upsert usando POST con resolución de duplicados
        const headers = {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation,resolution=merge-duplicates'
        };
        
        if (anonKey && anonKey !== 'null' && anonKey !== 'placeholder') {
            headers['apikey'] = anonKey;
            headers['Authorization'] = `Bearer ${anonKey}`;
        } else {
            console.warn('⚠️ [Supabase] Anon key no configurada. No se puede guardar en Supabase.');
            throw new Error('AUTH_REQUIRED: Configura la anon key en supabase-config.js');
        }
        
        // Insertar/actualizar todos los TVs
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/tv_configs`,
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(activeTvs)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const saved = await response.json();
        console.log('✅ [Supabase] TVs guardados:', saved.length);
        return saved;
    } catch (error) {
        console.error('❌ [Supabase] Error guardando TVs:', error);
        throw error;
    }
}

// Función para eliminar un TV de Supabase
async function deleteTvConfigFromSupabase(tvId) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            console.warn('⚠️ [Supabase] Anon key no configurada. No se puede eliminar de Supabase.');
            throw new Error('AUTH_REQUIRED: Configura la anon key en supabase-config.js');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
        };
        
        // Eliminar el TV de Supabase
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/tv_configs?id=eq.${encodeURIComponent(tvId)}`,
            {
                method: 'DELETE',
                headers: headers
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [Supabase] Error eliminando TV:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        console.log('✅ [Supabase] TV eliminado:', tvId);
        return true;
    } catch (error) {
        console.error('❌ [Supabase] Error eliminando TV:', error);
        throw error;
    }
}

// ============================================
// FUNCIONES PARA GESTIÓN DE REMESAS
// ============================================

// Generar código de confirmación único (formato: REM-XXXXXX)
function generateConfirmationCode() {
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 dígitos
    return `REM-${randomNum}`;
}

// Guardar remesa en Supabase después del pago exitoso
async function saveRemesaToSupabase(remesaData) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            console.warn('⚠️ [Supabase] Anon key no configurada. No se puede guardar remesa.');
            throw new Error('AUTH_REQUIRED: Configura la anon key en supabase-config.js');
        }
        
        // Generar código de confirmación único
        let confirmationCode = generateConfirmationCode();
        
        // Verificar que el código no exista (reintentar si es necesario)
        let attempts = 0;
        while (attempts < 5) {
            const existing = await checkConfirmationCodeExists(confirmationCode);
            if (!existing) break;
            confirmationCode = generateConfirmationCode();
            attempts++;
        }
        
        // Calcular cantidad en CUP si la moneda es CUP
        let amountCup = null;
        if (remesaData.currency === 'CUP' && remesaData.exchangeRate) {
            amountCup = remesaData.amount * remesaData.exchangeRate;
        }
        
        const remesaPayload = {
            order_id: remesaData.orderId,
            confirmation_code: confirmationCode,
            sender_customer_id: remesaData.senderCustomerId || null,
            sender_name: remesaData.senderName,
            sender_email: remesaData.senderEmail || null,
            recipient_name: remesaData.recipientName,
            recipient_id: remesaData.recipientId || null,
            amount_usd: remesaData.amount,
            amount_cup: amountCup,
            currency: remesaData.currency || 'USD',
            fee: remesaData.fee,
            total_paid: remesaData.total,
            exchange_rate: remesaData.exchangeRate || null,
            status: 'pending'
        };
        
        const headers = {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
        };
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/remesas`,
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(remesaPayload)
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [Supabase] Error guardando remesa:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const saved = await response.json();
        console.log('✅ [Supabase] Remesa guardada:', saved[0]?.confirmation_code);
        return saved[0] || saved; // Retornar el objeto de remesa con el código de confirmación
    } catch (error) {
        console.error('❌ [Supabase] Error guardando remesa:', error);
        throw error;
    }
}

// Verificar si un código de confirmación ya existe
async function checkConfirmationCodeExists(code) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
        };
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/remesas?confirmation_code=eq.${encodeURIComponent(code)}&select=id`,
            {
                method: 'GET',
                headers: headers
            }
        );
        
        if (!response.ok) return false;
        
        const results = await response.json();
        return results && results.length > 0;
    } catch (error) {
        console.warn('⚠️ [Supabase] Error verificando código:', error);
        return false;
    }
}

// Obtener todas las remesas (para admin)
async function getAllRemesasFromSupabase(status = null) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
        };
        
        let url = `${SUPABASE_CONFIG.url}/rest/v1/remesas?select=*&order=created_at.desc`;
        if (status) {
            url += `&status=eq.${status}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const remesas = await response.json();
        console.log('📡 [Supabase] Remesas cargadas:', remesas.length);
        return remesas;
    } catch (error) {
        console.error('❌ [Supabase] Error cargando remesas:', error);
        throw error;
    }
}

// Obtener remesas de un usuario específico
async function getUserRemesasFromSupabase(customerId) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
        };
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/remesas?sender_customer_id=eq.${encodeURIComponent(customerId)}&select=*&order=created_at.desc`,
            {
                method: 'GET',
                headers: headers
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const remesas = await response.json();
        return remesas;
    } catch (error) {
        console.error('❌ [Supabase] Error cargando remesas del usuario:', error);
        throw error;
    }
}

// Validar código de confirmación y entregar remesa
async function deliverRemesaFromSupabase(confirmationCode, deliveredBy) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            throw new Error('AUTH_REQUIRED: Configura la anon key en supabase-config.js');
        }
        
        // Primero, obtener la remesa para verificar el código
        const headers = {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
        };
        
        const getResponse = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/remesas?confirmation_code=eq.${encodeURIComponent(confirmationCode)}&select=*`,
            {
                method: 'GET',
                headers: headers
            }
        );
        
        if (!getResponse.ok) {
            throw new Error('Error verificando código de confirmación');
        }
        
        const remesas = await getResponse.json();
        if (!remesas || remesas.length === 0) {
            throw new Error('Código de confirmación no válido');
        }
        
        const remesa = remesas[0];
        
        // Verificar que la remesa esté pendiente
        if (remesa.status !== 'pending') {
            throw new Error(`Esta remesa ya fue ${remesa.status === 'delivered' ? 'entregada' : 'cancelada'}`);
        }
        
        // Actualizar estado a "delivered"
        const updatePayload = {
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            delivered_by: deliveredBy || null
        };
        
        const updateResponse = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/remesas?id=eq.${remesa.id}`,
            {
                method: 'PATCH',
                headers: {
                    ...headers,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updatePayload)
            }
        );
        
        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`HTTP ${updateResponse.status}: ${errorText}`);
        }
        
        const updated = await updateResponse.json();
        console.log('✅ [Supabase] Remesa entregada:', updated[0]?.confirmation_code);
        return updated[0] || updated;
    } catch (error) {
        console.error('❌ [Supabase] Error entregando remesa:', error);
        throw error;
    }
}

// Cancelar remesa
async function cancelRemesaFromSupabase(remesaId, cancelledBy) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            throw new Error('AUTH_REQUIRED: Configura la anon key en supabase-config.js');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Prefer': 'return=representation'
        };
        
        const updatePayload = {
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
        };
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/remesas?id=eq.${remesaId}`,
            {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify(updatePayload)
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const updated = await response.json();
        console.log('✅ [Supabase] Remesa cancelada:', updated[0]?.id);
        return updated[0] || updated;
    } catch (error) {
        console.error('❌ [Supabase] Error cancelando remesa:', error);
        throw error;
    }
}

// Exportar funciones globalmente
window.getTvConfigsFromSupabase = getTvConfigsFromSupabase;
window.saveTvConfigsToSupabase = saveTvConfigsToSupabase;
window.deleteTvConfigFromSupabase = deleteTvConfigFromSupabase;
window.saveRemesaToSupabase = saveRemesaToSupabase;

// Función para guardar orden de delivery en Supabase
async function saveDeliveryOrderToSupabase(deliveryData) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        const headers = {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
        
        if (anonKey && anonKey !== 'null' && anonKey !== 'placeholder') {
            headers['apikey'] = anonKey;
            headers['Authorization'] = `Bearer ${anonKey}`;
        }
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/delivery_orders`,
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(deliveryData)
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error guardando orden de delivery:', response.status, errorText);
            throw new Error(`Error guardando orden de delivery: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Orden de delivery guardada en Supabase:', result);
        return Array.isArray(result) ? result[0] : result;
        
    } catch (error) {
        console.error('❌ Error guardando orden de delivery en Supabase:', error);
        throw error;
    }
}

// Función para obtener órdenes de delivery desde Supabase
async function getDeliveryOrdersFromSupabase(filterStatus = null) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (anonKey && anonKey !== 'null' && anonKey !== 'placeholder') {
            headers['apikey'] = anonKey;
            headers['Authorization'] = `Bearer ${anonKey}`;
        }
        
        let url = `${SUPABASE_CONFIG.url}/rest/v1/delivery_orders?select=*&order=created_at.desc`;
        if (filterStatus) {
            url += `&status=eq.${filterStatus}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error obteniendo órdenes de delivery:', response.status, errorText);
            return [];
        }
        
        const orders = await response.json();
        console.log('✅ Órdenes de delivery cargadas:', orders.length);
        return orders;
        
    } catch (error) {
        console.error('❌ Error obteniendo órdenes de delivery:', error);
        return [];
    }
}

// Función para actualizar estado de orden de delivery
async function updateDeliveryOrderStatus(orderId, newStatus) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        const headers = {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
        
        if (anonKey && anonKey !== 'null' && anonKey !== 'placeholder') {
            headers['apikey'] = anonKey;
            headers['Authorization'] = `Bearer ${anonKey}`;
        }
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/delivery_orders?order_id=eq.${orderId}`,
            {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error actualizando orden de delivery:', response.status, errorText);
            throw new Error(`Error actualizando orden: ${response.status}`);
        }
        
        const result = await response.json();
        return Array.isArray(result) ? result[0] : result;
        
    } catch (error) {
        console.error('❌ Error actualizando orden de delivery:', error);
        throw error;
    }
}

// ============================================
// FUNCIONES PARA GESTIÓN DE PROVEEDORES
// ============================================

// Obtener todos los proveedores desde Supabase
async function getSuppliersFromSupabase() {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (anonKey && anonKey !== 'null' && anonKey !== 'placeholder') {
            headers['apikey'] = anonKey;
            headers['Authorization'] = `Bearer ${anonKey}`;
        }
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/suppliers?select=*&order=created_at.desc`,
            {
                method: 'GET',
                headers: headers
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [Supabase] Error cargando proveedores:', response.status, errorText);
            
            // Si la tabla no existe, retornar array vacío
            if (response.status === 404 || errorText.includes('42P01') || errorText.includes('does not exist')) {
                console.warn('⚠️ [Supabase] Tabla suppliers no existe. Ejecuta el SQL de migración.');
                return [];
            }
            
            return [];
        }
        
        const suppliers = await response.json();
        console.log('📡 [Supabase] Proveedores cargados:', suppliers.length);
        
        // Convertir formato de BD a formato esperado por la app
        return suppliers.map(supplier => ({
            id: supplier.id,
            name: supplier.name,
            address: supplier.address || '',
            url: supplier.url || '',
            notes: supplier.notes || '',
            createdAt: supplier.created_at,
            updatedAt: supplier.updated_at
        }));
    } catch (error) {
        console.error('❌ [Supabase] Error cargando proveedores:', error);
        return [];
    }
}

// Guardar proveedor en Supabase
async function saveSupplierToSupabase(supplierData) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            console.warn('⚠️ [Supabase] Anon key no configurada. No se puede guardar proveedor.');
            throw new Error('AUTH_REQUIRED: Configura la anon key en supabase-config.js');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
        };
        
        const payload = {
            name: supplierData.name,
            address: supplierData.address || null,
            url: supplierData.url || null,
            notes: supplierData.notes || null
        };
        
        let response;
        if (supplierData.id) {
            // Actualizar proveedor existente
            response = await fetch(
                `${SUPABASE_CONFIG.url}/rest/v1/suppliers?id=eq.${supplierData.id}`,
                {
                    method: 'PATCH',
                    headers: headers,
                    body: JSON.stringify(payload)
                }
            );
        } else {
            // Crear nuevo proveedor
            response = await fetch(
                `${SUPABASE_CONFIG.url}/rest/v1/suppliers`,
                {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                }
            );
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [Supabase] Error guardando proveedor:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const saved = await response.json();
        const result = Array.isArray(saved) ? saved[0] : saved;
        console.log('✅ [Supabase] Proveedor guardado:', result.id);
        return result;
    } catch (error) {
        console.error('❌ [Supabase] Error guardando proveedor:', error);
        throw error;
    }
}

// Eliminar proveedor de Supabase
async function deleteSupplierFromSupabase(supplierId) {
    try {
        const anonKey = SUPABASE_CONFIG.anonKey || localStorage.getItem('supabase_anon_key');
        
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            console.warn('⚠️ [Supabase] Anon key no configurada. No se puede eliminar proveedor.');
            throw new Error('AUTH_REQUIRED: Configura la anon key en supabase-config.js');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
        };
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/suppliers?id=eq.${supplierId}`,
            {
                method: 'DELETE',
                headers: headers
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [Supabase] Error eliminando proveedor:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        console.log('✅ [Supabase] Proveedor eliminado:', supplierId);
        return true;
    } catch (error) {
        console.error('❌ [Supabase] Error eliminando proveedor:', error);
        throw error;
    }
}

window.saveDeliveryOrderToSupabase = saveDeliveryOrderToSupabase;
window.getDeliveryOrdersFromSupabase = getDeliveryOrdersFromSupabase;
window.updateDeliveryOrderStatus = updateDeliveryOrderStatus;
window.getAllRemesasFromSupabase = getAllRemesasFromSupabase;
window.getUserRemesasFromSupabase = getUserRemesasFromSupabase;
window.deliverRemesaFromSupabase = deliverRemesaFromSupabase;
window.cancelRemesaFromSupabase = cancelRemesaFromSupabase;
window.generateConfirmationCode = generateConfirmationCode;
window.getSuppliersFromSupabase = getSuppliersFromSupabase;
window.saveSupplierToSupabase = saveSupplierToSupabase;
window.deleteSupplierFromSupabase = deleteSupplierFromSupabase;
