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
            qrSize: tv.qr_size || 400
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
                qr_size: tv.qrSize || 400
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

// Exportar funciones globalmente
window.getTvConfigsFromSupabase = getTvConfigsFromSupabase;
window.saveTvConfigsToSupabase = saveTvConfigsToSupabase;
