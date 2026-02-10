// Configuración de Supabase para TV Configs
// Solo para este proyecto - no afecta otros proyectos en Supabase

const SUPABASE_CONFIG = {
    url: 'https://fbbvfzeyhhopdwzsooew.supabase.co',
    anonKey: null // Se obtendrá desde el dashboard o se usará fetch directo
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
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/tv_configs?active=eq.true&select=*`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_CONFIG.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiYnZmemV5aGhvcGR3enNvb2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NDU2MDAsImV4cCI6MjA1MjEyMTYwMH0.placeholder', // Se actualizará con la key real
                    'Prefer': 'return=representation'
                },
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

        // Upsert (insertar o actualizar) todos los TVs
        // Primero eliminar todos los existentes y luego insertar los nuevos
        // (más simple que hacer upsert individual)
        try {
            // Eliminar todos los existentes
            await fetch(
                `${SUPABASE_CONFIG.url}/rest/v1/tv_configs`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_CONFIG.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiYnZmemV5aGhvcGR3enNvb2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NDU2MDAsImV4cCI6MjA1MjEyMTYwMH0.placeholder',
                        'Prefer': 'return=representation'
                    }
                }
            );
        } catch (deleteError) {
            console.warn('⚠️ [Supabase] Error eliminando TVs existentes (continuando):', deleteError);
        }
        
        // Insertar los nuevos
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/tv_configs`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_CONFIG.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiYnZmemV5aGhvcGR3enNvb2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NDU2MDAsImV4cCI6MjA1MjEyMTYwMH0.placeholder',
                    'Prefer': 'return=representation'
                },
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
