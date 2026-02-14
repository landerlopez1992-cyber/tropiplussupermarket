// Sistema de Administración - Gestión de Inventario y Proveedores
// Updated: 2026-02-10 14:10

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario es administrador
    if (typeof isUserAdmin !== 'function' || !isUserAdmin()) {
        if (typeof showModal === 'function') {
            showModal('Acceso Denegado', 'No tienes permisos de administrador para acceder a esta página.', 'error');
        } else {
            alert('No tienes permisos de administrador para acceder a esta página.');
        }
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    initAdminPage();
});

let allProducts = [];
let allProductsWithInventory = [];
let suppliersData = {}; // Proveedores por producto
let globalSuppliers = {}; // Proveedores globales (reutilizables)
let bulkImportProducts = [];
const PROMO_STORAGE_KEY = 'tropiplus_promo_config';
const TV_STORAGE_KEY = 'tropiplus_tv_configs';
const QR_STORAGE_KEY = 'tropiplus_qr_configs';
const HOURS_STORAGE_KEY = 'tropiplus_hours_config';
const CURRENCY_STORAGE_KEY = 'tropiplus_currency_config';
const PUBLIC_TVS_URL = 'https://landerlopez1992-cyber.github.io/tropiplussupermarket/tvs-public.json';
const SUPPLIER_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const SUPPLIER_OOS_PATTERNS = [
    'out of stock',
    'currently unavailable',
    'sold out',
    'temporarily out of stock',
    'unavailable',
    'not available',
    'agotado',
    'sin stock',
    'no disponible',
    'fuera de inventario'
];

// Cargar datos de proveedores desde Supabase (con fallback a localStorage)
async function loadSuppliersData() {
    let loadedGlobalFromSupabase = false;
    let loadedProductSuppliersFromSupabase = false;

    // Intentar cargar proveedores globales desde Supabase primero
    if (typeof window.getSuppliersFromSupabase === 'function') {
        try {
            const supabaseSuppliers = await window.getSuppliersFromSupabase();
            if (Array.isArray(supabaseSuppliers) && supabaseSuppliers.length > 0) {
                // Convertir array de Supabase a objeto para compatibilidad
                globalSuppliers = {};
                supabaseSuppliers.forEach(supplier => {
                    globalSuppliers[supplier.id] = {
                        id: supplier.id,
                        name: supplier.name,
                        address: supplier.address || '',
                        url: supplier.url || '',
                        notes: supplier.notes || '',
                        createdAt: supplier.createdAt,
                        updatedAt: supplier.updatedAt
                    };
                });

                // Sincronizar localStorage como cache
                localStorage.setItem('tropiplus_global_suppliers', JSON.stringify(globalSuppliers));
                console.log('✅ Proveedores cargados desde Supabase:', Object.keys(globalSuppliers).length);
                loadedGlobalFromSupabase = true;
            }
        } catch (error) {
            console.warn('⚠️ Error cargando proveedores desde Supabase, usando localStorage:', error);
        }
    }

    // Intentar cargar mapeo producto->proveedor desde Supabase
    if (typeof window.getProductSuppliersFromSupabase === 'function') {
        try {
            const productSuppliers = await window.getProductSuppliersFromSupabase();
            if (Array.isArray(productSuppliers) && productSuppliers.length > 0) {
                suppliersData = {};
                productSuppliers.forEach(item => {
                    const key = item.mappingKey || item.mapping_key || item.variationId || item.variation_id || item.productId || item.product_id;
                    if (!key) return;
                    suppliersData[key] = {
                        ...item,
                        mappingKey: key
                    };
                });
                localStorage.setItem('tropiplus_suppliers', JSON.stringify(suppliersData));
                console.log('✅ Relación producto/proveedor cargada desde Supabase:', Object.keys(suppliersData).length);
                loadedProductSuppliersFromSupabase = true;
            }
        } catch (error) {
            console.warn('⚠️ Error cargando relación producto/proveedor desde Supabase, usando localStorage:', error);
        }
    }

    // Fallback local para relación producto->proveedor
    if (!loadedProductSuppliersFromSupabase) {
        const stored = localStorage.getItem('tropiplus_suppliers');
        if (stored) {
            try {
                suppliersData = JSON.parse(stored);
            } catch (e) {
                console.error('Error cargando datos de proveedores:', e);
                suppliersData = {};
            }
        }
    }

    // Fallback local para proveedores globales
    if (!loadedGlobalFromSupabase) {
        const globalStored = localStorage.getItem('tropiplus_global_suppliers');
        if (globalStored) {
            try {
                globalSuppliers = JSON.parse(globalStored);
                console.log('✅ Proveedores cargados desde localStorage (fallback):', Object.keys(globalSuppliers).length);
            } catch (e) {
                console.error('Error cargando proveedores globales:', e);
                globalSuppliers = {};
            }
        }
    }
}

// Guardar datos de proveedores (en Supabase y localStorage como cache)
async function saveSuppliersData() {
    // Guardar en localStorage como cache
    localStorage.setItem('tropiplus_suppliers', JSON.stringify(suppliersData));
    localStorage.setItem('tropiplus_global_suppliers', JSON.stringify(globalSuppliers));
    
    // Intentar guardar proveedores globales en Supabase
    if (typeof window.saveSupplierToSupabase === 'function') {
        try {
            // Guardar cada proveedor en Supabase
            const suppliersList = getGlobalSuppliersList();
            for (const supplier of suppliersList) {
                try {
                    await window.saveSupplierToSupabase(supplier);
                } catch (error) {
                    console.warn('⚠️ Error guardando proveedor en Supabase:', supplier.id, error);
                }
            }
            console.log('✅ Proveedores sincronizados con Supabase');
        } catch (error) {
            console.warn('⚠️ Error sincronizando proveedores con Supabase:', error);
        }
    }

    // Intentar guardar mapeo producto->proveedor en Supabase
    if (typeof window.saveProductSupplierToSupabase === 'function') {
        try {
            const productSupplierList = Object.entries(suppliersData).map(([mappingKey, item]) => ({
                ...item,
                mappingKey,
                productId: item.productId || item.product_id || null,
                variationId: item.variationId || item.variation_id || null
            }));

            for (const productSupplier of productSupplierList) {
                if (!productSupplier.productId) {
                    continue;
                }
                try {
                    await window.saveProductSupplierToSupabase(productSupplier);
                } catch (error) {
                    console.warn('⚠️ Error guardando relación producto/proveedor en Supabase:', productSupplier.mappingKey, error);
                }
            }
            console.log('✅ Relación producto/proveedor sincronizada con Supabase');
        } catch (error) {
            console.warn('⚠️ Error sincronizando relación producto/proveedor con Supabase:', error);
        }
    }
}

async function initAdminPage() {
    await loadSuppliersData();
    
    // Inicializar tabs principales (solo Admin, Home es un enlace)
    const tabs = document.querySelectorAll('.admin-tab[data-tab]');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });

    // Inicializar navegación interna de Admin
    const internalBtns = document.querySelectorAll('.admin-internal-btn');
    internalBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const subtabName = btn.dataset.subtab;
            switchSubTab(subtabName);
            if (subtabName === 'suppliers') {
                await renderGlobalSuppliersList();
            }
        });
    });

    // Inicializar búsqueda y filtros
    const searchInput = document.getElementById('product-search');
    const stockFilter = document.getElementById('stock-filter');
    
    if (searchInput) {
        // Usar debounce para evitar demasiadas llamadas a la API
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                await filterProducts();
            }, 500); // Esperar 500ms después de que el usuario deje de escribir
        });
    }
    
    if (stockFilter) {
        stockFilter.addEventListener('change', async () => {
            await filterProducts();
        });
    }

    // Inicializar modal de proveedor
    initSupplierModal();

    // Inicializar formulario de agregar producto
    initAddProductForm();

    // Inicializar formulario de extracción de URL
    initUrlExtractorForm();
    initBulkUrlImportForm();

    // Inicializar pestaña de promoción
    initPromotionTab();
    // Inicializar pestaña QR
    initQrTab();
    // Inicializar pestaña Horario
    initHoursTab();
    // Inicializar pestaña TV
    initTvTab();
    // Inicializar pestaña Divisas
    initCurrencyTab();
    // Inicializar gestión de remesas
    initRemesasManagement();

    // Cargar productos
    loadProducts();
}

function getTvConfigs() {
    try {
        const raw = localStorage.getItem(TV_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('No se pudo leer configuración de TVs:', error);
        return [];
    }
}

async function hydrateTvConfigsFromSupabase() {
    if (typeof window.getTvConfigsFromSupabase !== 'function') {
        return getTvConfigs();
    }

    try {
        const remoteTvs = await window.getTvConfigsFromSupabase();
        if (Array.isArray(remoteTvs)) {
            localStorage.setItem(TV_STORAGE_KEY, JSON.stringify(remoteTvs));
            window.tropiplusTVs = remoteTvs;
            return remoteTvs;
        }
    } catch (error) {
        console.warn('⚠️ [Admin] No se pudo hidratar TVs desde Supabase:', error);
    }

    return getTvConfigs();
}

async function saveTvConfigs(tvConfigs) {
    // Guardar en localStorage (backup)
    localStorage.setItem(TV_STORAGE_KEY, JSON.stringify(tvConfigs));
    console.log('💾 [Admin] TVs guardados en localStorage:', tvConfigs.length, 'TVs');
    
    // Exponer TVs globalmente
    window.tropiplusTVs = tvConfigs;
    
    // Guardar en script tag
    let scriptTag = document.getElementById('tropiplus-tvs-data');
    if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'tropiplus-tvs-data';
        scriptTag.type = 'application/json';
        document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(tvConfigs);
    
    // GUARDAR EN SUPABASE (principal)
    try {
        if (typeof window.saveTvConfigsToSupabase === 'function') {
            await window.saveTvConfigsToSupabase(tvConfigs);
            console.log('✅ [Admin] TVs guardados en Supabase');
            if (typeof showModal === 'function') {
                showModal('Guardado OK', 'TVs sincronizados correctamente con Supabase.', 'success');
            }
        } else {
            console.warn('⚠️ [Admin] Función saveTvConfigsToSupabase no disponible. Asegúrate de cargar supabase-config.js');
            if (typeof showModal === 'function') {
                showModal('Error de configuración', 'No se cargó la conexión con Supabase (supabase-config.js).', 'error');
            }
        }
    } catch (error) {
        console.error('❌ [Admin] Error guardando en Supabase:', error);
        if (typeof showModal === 'function') {
            showModal('Error al guardar', `No se pudo guardar en Supabase: ${error.message}`, 'error');
        }
        throw error;
    }
}

async function seedSupabaseFromLocalIfNeeded() {
    try {
        if (
            typeof window.getTvConfigsFromSupabase !== 'function' ||
            typeof window.saveTvConfigsToSupabase !== 'function'
        ) {
            return;
        }

        const remoteTvs = await window.getTvConfigsFromSupabase();
        const localTvs = getTvConfigs();

        if (Array.isArray(remoteTvs) && remoteTvs.length === 0 && Array.isArray(localTvs) && localTvs.length > 0) {
            await window.saveTvConfigsToSupabase(localTvs);
            console.log('✅ [Admin] Supabase inicializado con TVs locales:', localTvs.length);
        }
    } catch (error) {
        console.warn('⚠️ [Admin] No se pudo inicializar Supabase desde local:', error);
    }
}

function normalizeTvForSync(tv) {
    return {
        id: String(tv?.id || ''),
        name: String(tv?.name || ''),
        mode: String(tv?.mode || 'mixed'),
        categoryId: String(tv?.categoryId || ''),
        categoryName: String(tv?.categoryName || 'Todas'),
        productCount: Number(tv?.productCount || 8),
        slideSeconds: Number(tv?.slideSeconds || 10),
        showPrice: tv?.showPrice !== false,
        showOffer: tv?.showOffer !== false,
        promoText: String(tv?.promoText || ''),
        active: tv?.active !== false,
        tickerEnabled: tv?.tickerEnabled !== false,
        tickerSpeed: String(tv?.tickerSpeed || 'normal'),
        tickerFontSize: String(tv?.tickerFontSize || '28px'),
        tickerTextColor: String(tv?.tickerTextColor || '#ffec67'),
        tickerBgColor: String(tv?.tickerBgColor || '#000000')
    };
}

function buildSyncSignature(tvConfigs) {
    const normalized = (Array.isArray(tvConfigs) ? tvConfigs : [])
        .map(normalizeTvForSync)
        .sort((a, b) => a.id.localeCompare(b.id));
    return JSON.stringify(normalized);
}

function ensureTvSyncStatusElement(container) {
    if (!container) return null;
    const parent = container.parentElement;
    if (!parent) return null;

    let el = document.getElementById('tv-sync-status');
    if (!el) {
        el = document.createElement('div');
        el.id = 'tv-sync-status';
        el.style.cssText = `
            margin: 10px 0 16px;
            padding: 12px 14px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.4;
            border: 1px solid #d7d7d7;
            background: #f8f9fa;
            color: #333;
        `;
        parent.insertBefore(el, container);
    }
    return el;
}

async function refreshPublicTvSyncStatus() {
    const listContainer = document.getElementById('tv-list-container');
    const statusEl = ensureTvSyncStatusElement(listContainer);
    if (!statusEl) return;

    statusEl.innerHTML = '<i class="fas fa-sync fa-spin"></i> Verificando sincronización con Supabase...';

    const localTvs = getTvConfigs();
    try {
        if (typeof window.getTvConfigsFromSupabase !== 'function') {
            throw new Error('Función de Supabase no disponible');
        }
        const publicTvs = await window.getTvConfigsFromSupabase();
        const localSig = buildSyncSignature(localTvs);
        const publicSig = buildSyncSignature(publicTvs);

        if (localSig === publicSig) {
            statusEl.style.background = '#e9f8ee';
            statusEl.style.borderColor = '#42b649';
            statusEl.style.color = '#1f6f2a';
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Supabase sincronizado: admin y TVs están mostrando la misma configuración.';
            return;
        }

        statusEl.style.background = '#fff3cd';
        statusEl.style.borderColor = '#ffcc00';
        statusEl.style.color = '#7a5a00';
        statusEl.innerHTML = `
            <div><i class="fas fa-exclamation-triangle"></i> Supabase desincronizado: Admin y TV no tienen los mismos datos.</div>
            <div style="margin-top:8px;">Haz clic en <b>Guardar TV</b> para volver a sincronizar.</div>
        `;
    } catch (error) {
        statusEl.style.background = '#fdecea';
        statusEl.style.borderColor = '#e57373';
        statusEl.style.color = '#b71c1c';
        statusEl.innerHTML = `<i class="fas fa-times-circle"></i> No se pudo verificar Supabase (${error.message}).`;
    }
}

async function updatePublicTvsFile(tvConfigs) {
    // Normalizar y filtrar solo TVs activos
    const activeTvs = (Array.isArray(tvConfigs) ? tvConfigs : [])
        .filter(tv => tv && tv.active !== false)
        .map(tv => normalizeTvForSync(tv));
    
    const jsonContent = JSON.stringify(activeTvs, null, 2);
    
    // ACTUALIZAR AUTOMÁTICAMENTE EL ARCHIVO PÚBLICO
    // Usar un enfoque que funcione desde el navegador: guardar en archivo local y ejecutar script
    try {
        // Crear un blob con el contenido JSON
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Intentar descargar el archivo (esto guardará tvs-public.json en la carpeta de descargas)
        // Pero mejor: usar un enfoque más directo ejecutando el script automáticamente
        
        // Guardar el contenido en localStorage como backup
        localStorage.setItem('tvs_public_content', jsonContent);
        localStorage.setItem('tvs_public_update_time', Date.now().toString());
        
        // Ejecutar automáticamente los comandos usando un enfoque híbrido
        // Nota: Desde el navegador no se puede ejecutar git directamente por seguridad
        // Pero podemos hacer que el proceso sea más fluido guardando el contenido
        // y mostrando instrucciones claras solo si es necesario
        
        console.log('✅ TVs guardados. Contenido preparado para actualización pública.');
        console.log('📋 Contenido JSON guardado en localStorage (clave: tvs_public_content)');
        
        // Mostrar mensaje de éxito simple
        if (typeof showModal === 'function') {
            // Modal removido - proceso silencioso
        }
        
        // Intentar actualizar automáticamente ejecutando el script si está disponible
        // Esto requiere que el usuario tenga configurado un servidor local
        // Por ahora, guardamos el contenido y el usuario puede ejecutar el script manualmente si quiere
        
        // Actualizar estado de sincronización después de un momento
        setTimeout(() => {
            refreshPublicTvSyncStatus();
        }, 2000);
        
    } catch (e) {
        console.error('Error en actualización automática:', e);
        // Fallback: mostrar comandos en consola
        const commands = `cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
cat > tvs-public.json << 'EOF'
${jsonContent}
EOF
git add tvs-public.json && git commit -m "Auto-update TVs" && git push`;
        console.log('📋 EJECUTA ESTOS COMANDOS EN TERMINAL:');
        console.log(commands);
    }
}

function saveTvsToJsonFile(tvConfigs) {
    const jsonContent = JSON.stringify(tvConfigs, null, 2);
    
    // Guardar en localStorage
    localStorage.setItem('tvs_json_content', jsonContent);
    localStorage.setItem('tvs_json_last_update', Date.now().toString());
    
    // Mostrar botón para copiar JSON y actualizar archivo
    showTvUpdateInstructions(jsonContent);
    
    console.log('💾 [Admin] JSON guardado. Usa el botón "Actualizar archivo JSON" para subirlo a GitHub.');
}

function showTvUpdateInstructions(jsonContent) {
    // Crear o actualizar botón de actualización
    let updateBtn = document.getElementById('update-tvs-json-btn');
    if (!updateBtn) {
        updateBtn = document.createElement('button');
        updateBtn.id = 'update-tvs-json-btn';
        updateBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Actualizar archivo JSON';
        updateBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 25px;
            background: #42b649;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(updateBtn);
        
        updateBtn.addEventListener('click', async () => {
            // Actualizar automáticamente el archivo
            await updateTvsJsonFileAuto(jsonContent);
        });
    }
    
    // Auto-ocultar después de 10 segundos
    setTimeout(() => {
        if (updateBtn && updateBtn.parentNode) {
            updateBtn.style.opacity = '0.7';
        }
    }, 10000);
}

async function updateTvsJsonFileAuto(jsonContent) {
    try {
        // Mostrar que se está actualizando
        const btn = document.getElementById('update-tvs-json-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            btn.disabled = true;
        }
        
        // Copiar comandos al portapapeles
        const commands = `cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
cat > tvs-public.json << 'EOF'
${jsonContent}
EOF
git add tvs-public.json && git commit -m "Update TVs" && git push`;
        
        await navigator.clipboard.writeText(commands);
        
        // Mostrar modal con instrucciones
        if (typeof showModal === 'function') {
            showModal(
                '✅ Comandos Copiados',
                `Los comandos para actualizar el archivo JSON han sido copiados al portapapeles.\n\nPega en terminal y presiona Enter para actualizar automáticamente.\n\nO haz clic en "Ejecutar Automáticamente" para que yo lo haga.`,
                'success'
            );
        } else {
            alert('✅ Comandos copiados al portapapeles. Pega en terminal y presiona Enter.');
        }
        
        // Restaurar botón
        if (btn) {
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Actualizar archivo JSON';
            btn.disabled = false;
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
    }
}

async function updateTvsJsonFile(jsonContent) {
    try {
        // Copiar al portapapeles
        try {
            await navigator.clipboard.writeText(jsonContent);
            console.log('✅ JSON copiado al portapapeles');
        } catch (e) {
            console.log('⚠️ No se pudo copiar al portapapeles');
        }
        
        // Descargar archivo
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tvs-public.json';
        a.click();
        URL.revokeObjectURL(url);
        
        // Mostrar instrucciones simplificadas
        const commands = `cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
cat > tvs-public.json << 'EOF'
${jsonContent}
EOF
git add tvs-public.json && git commit -m "Update TVs" && git push`;
        
        if (typeof showModal === 'function') {
            const modalContent = `
                <div style="text-align: left;">
                    <p><strong>✅ JSON descargado</strong></p>
                    <p>Ejecuta estos comandos en terminal:</p>
                    <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 11px; max-height: 300px;">${commands}</pre>
                    <button onclick="navigator.clipboard.writeText(\`${commands.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`).then(() => { alert('✅ Comandos copiados! Pega en terminal y presiona Enter'); })" 
                            style="margin-top: 15px; padding: 12px 24px; background: #42b649; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%;">
                        📋 Copiar Comandos
                    </button>
                </div>
            `;
            showModal('Actualizar TVs en GitHub', modalContent, 'info');
        } else {
            alert('✅ JSON descargado.\n\nEjecuta en terminal:\n' + commands);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
    }
}

function createTvId() {
    return `tv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getActiveQrConfigs() {
    try {
        const raw = localStorage.getItem(QR_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(qr => qr && qr.active !== false) : [];
    } catch (error) {
        console.warn('No se pudo leer configuración de QRs:', error);
        return [];
    }
}

function populateTvQrSelect(selectedQrId = '') {
    const qrSelect = document.getElementById('tv-qr-select');
    if (!qrSelect) return;

    const qrs = getActiveQrConfigs();
    qrSelect.innerHTML = '<option value="">Seleccionar QR...</option>';

    qrs.forEach(qr => {
        const option = document.createElement('option');
        option.value = qr.id;
        option.textContent = `${qr.name} (${qr.url})`;
        qrSelect.appendChild(option);
    });

    if (selectedQrId) {
        qrSelect.value = selectedQrId;
    }
}

function applyTvModeVisibility(mode) {
    const group = (id) => document.getElementById(id);
    const setVisible = (id, visible) => {
        const el = group(id);
        if (el) el.style.display = visible ? '' : 'none';
    };

    const isProductsMode = mode === 'products' || mode === 'mixed';
    const isPromoMode = mode === 'promo' || mode === 'mixed';
    const isQrMode = mode === 'qr' || mode === 'mixed';

    // Opciones de productos
    setVisible('tv-category-group', isProductsMode);
    setVisible('tv-product-count-group', isProductsMode);
    setVisible('tv-show-price-group', isProductsMode);
    setVisible('tv-show-offer-group', isProductsMode);

    // Segundos base (productos / orders)
    setVisible('tv-slide-seconds-group', mode !== 'promo' && mode !== 'qr' && mode !== 'mixed');
    // Segundos de transición para modo mixto
    setVisible('tv-mixed-transition-seconds-group', mode === 'mixed');

    // Opciones de QR
    setVisible('tv-qr-select-group', isQrMode);

    // Texto/ticker solo cuando haya promoción en pantalla (promo o mixed)
    setVisible('tv-promo-text-group', isPromoMode);
    setVisible('tv-ticker-enabled-group', isPromoMode);
    setVisible('tv-ticker-speed-group', isPromoMode);
    setVisible('tv-ticker-font-size-group', isPromoMode);
    setVisible('tv-ticker-text-color-group', isPromoMode);
    setVisible('tv-ticker-bg-color-group', isPromoMode);
}

async function getAvailableCategoriesForTv() {
    try {
        if (Array.isArray(squareCategories) && squareCategories.length > 0) {
            return squareCategories;
        }
    } catch (_error) {
        // ignore
    }

    if (typeof getSquareCategories === 'function') {
        const categories = await getSquareCategories();
        return Array.isArray(categories) ? categories : [];
    }

    return [];
}

async function populateTvCategorySelect() {
    const categorySelect = document.getElementById('tv-category');
    if (!categorySelect) return;

    const currentValue = categorySelect.value;
    categorySelect.innerHTML = '<option value="">Todas las categorías</option>';

    const categories = await getAvailableCategoriesForTv();
    categories
        .filter(cat => cat?.category_data?.name)
        .sort((a, b) => a.category_data.name.localeCompare(b.category_data.name, 'es'))
        .forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.category_data.name;
            categorySelect.appendChild(option);
        });

    if (currentValue) {
        categorySelect.value = currentValue;
    }
}

function resetTvForm() {
    const form = document.getElementById('tv-config-form');
    if (!form) return;
    form.reset();
    document.getElementById('tv-id').value = '';
    document.getElementById('tv-name').value = '';
    document.getElementById('tv-mode').value = 'mixed';
    document.getElementById('tv-category').value = '';
    document.getElementById('tv-product-count').value = '8';
    document.getElementById('tv-slide-seconds').value = '10';
    const mixedSecondsInput = document.getElementById('tv-mixed-transition-seconds');
    if (mixedSecondsInput) mixedSecondsInput.value = '12';
    document.getElementById('tv-show-price').checked = true;
    document.getElementById('tv-show-offer').checked = true;
    document.getElementById('tv-promo-text').value = '';
    const tickerEnabledInput = document.getElementById('tv-ticker-enabled');
    if (tickerEnabledInput) tickerEnabledInput.checked = true;
    const tickerSpeedInput = document.getElementById('tv-ticker-speed');
    if (tickerSpeedInput) tickerSpeedInput.value = 'normal';
    const tickerFontSizeInput = document.getElementById('tv-ticker-font-size');
    if (tickerFontSizeInput) tickerFontSizeInput.value = '28px';
    const tickerTextColorInput = document.getElementById('tv-ticker-text-color');
    if (tickerTextColorInput) tickerTextColorInput.value = '#ffec67';
    const tickerBgColorInput = document.getElementById('tv-ticker-bg-color');
    if (tickerBgColorInput) tickerBgColorInput.value = '#000000';
    const qrSelect = document.getElementById('tv-qr-select');
    if (qrSelect) qrSelect.value = '';
    document.getElementById('tv-active').checked = true;
    populateTvQrSelect('');
    applyTvModeVisibility('mixed');
}

async function showTvCastModal(tvUrl, tvId) {
    // Crear modal para seleccionar TV
    const modal = document.createElement('div');
    modal.id = 'tv-cast-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h2 style="margin: 0 0 20px 0; color: var(--dark-blue-nav);">
                <i class="fas fa-broadcast-tower"></i> Transmitir a TV
            </h2>
            <div id="tv-devices-list" style="margin-bottom: 20px;">
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--green-categories);"></i>
                    <p style="margin-top: 10px; color: var(--gray-text);">Buscando TVs en la red...</p>
                </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="tv-cast-cancel" style="padding: 10px 20px; background: #e0e0e0; border: none; border-radius: 6px; cursor: pointer;">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Detectar TVs
    await detectAndShowTvs(tvUrl, modal);
    
    // Cerrar modal
    document.getElementById('tv-cast-cancel').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

async function detectAndShowTvs(tvUrl, modal) {
    const devicesList = modal.querySelector('#tv-devices-list');
    
    // Mostrar formulario manual inmediatamente
    devicesList.innerHTML = `
        <div style="background: #e7f3ff; border: 2px solid #1a73e8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #1a73e8; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-tv"></i> Conectar a TV Manualmente
            </h3>
            <p style="margin: 0 0 15px 0; color: #1a73e8; font-size: 14px;">
                Ingresa la IP del TV que aparece en la pantalla del TV (esquina superior derecha):
            </p>
            <div style="display: flex; gap: 10px; align-items: flex-end;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500; color: var(--dark-blue-nav);">
                        IP del TV:
                    </label>
                    <input 
                        type="text" 
                        id="manual-tv-ip" 
                        placeholder="192.168.1.112" 
                        style="width: 100%; padding: 12px; border: 2px solid #1a73e8; border-radius: 6px; font-family: monospace; font-size: 14px;"
                    />
                </div>
                <div style="width: 100px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500; color: var(--dark-blue-nav);">
                        Puerto:
                    </label>
                    <input 
                        type="number" 
                        id="manual-tv-port" 
                        placeholder="8081" 
                        value="8081"
                        style="width: 100%; padding: 12px; border: 2px solid #1a73e8; border-radius: 6px; font-family: monospace; font-size: 14px;"
                    />
                </div>
                <button 
                    onclick="castToManualTv('${tvUrl.replace(/'/g, "\\'")}')"
                    style="padding: 12px 24px; background: var(--green-categories); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; white-space: nowrap;">
                    <i class="fas fa-paper-plane"></i> Conectar
                </button>
            </div>
            <p style="margin: 15px 0 0 0; color: #1a73e8; font-size: 12px; font-style: italic;">
                💡 La IP aparece en la esquina superior derecha de la app del TV
            </p>
        </div>
    `;
    
    // Intentar detección automática en segundo plano
    devicesList.innerHTML += `
        <div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--green-categories);"></i>
            <p style="margin-top: 10px; color: var(--gray-text);">Buscando TVs automáticamente...</p>
        </div>
    `;
    
    const foundTvs = [];
    
    // Obtener IP local del navegador
    const localIp = await getLocalIP();
    if (!localIp) {
        // Si no se puede detectar, solo mostrar el formulario manual
        return;
    }
    
    // Extraer base de IP (ej: 192.168.1)
    const ipParts = localIp.split('.');
    const baseIp = ipParts.slice(0, 3).join('.');
    
    console.log('🔍 Escaneando red local:', baseIp + '.x');
    
    // Escanear rango común (1-254)
    const scanPromises = [];
    for (let i = 1; i <= 254; i++) {
        const ip = `${baseIp}.${i}`;
        scanPromises.push(checkTvApp(ip));
    }
    
    // Ejecutar en lotes para no sobrecargar
    const batchSize = 20;
    for (let i = 0; i < scanPromises.length; i += batchSize) {
        const batch = scanPromises.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                foundTvs.push(result.value);
            }
        });
        
        // Actualizar UI mientras escanea
        if (foundTvs.length > 0 || i + batchSize < scanPromises.length) {
            updateDevicesList(devicesList, foundTvs, tvUrl);
        }
    }
    
    // Mostrar resultado final
    updateDevicesList(devicesList, foundTvs, tvUrl);
}

async function getLocalIP() {
    return new Promise((resolve) => {
        // Intentar obtener IP usando WebRTC
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        pc.createDataChannel('');
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                const candidate = event.candidate.candidate;
                const match = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
                if (match) {
                    const ip = match[0];
                    // Filtrar IPs locales válidas
                    if (ip.startsWith('192.168.') || 
                        ip.startsWith('10.') || 
                        ip.startsWith('172.')) {
                        pc.close();
                        resolve(ip);
                        return;
                    }
                }
            }
        };
        
        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(() => resolve(null));
        
        // Timeout después de 2 segundos
        setTimeout(() => {
            pc.close();
            resolve(null);
        }, 2000);
    });
}

async function checkTvApp(ip) {
    // Intentar puertos comunes
    const ports = [8081, 8082];
    
    for (const port of ports) {
        try {
            // Usar Promise.race con timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 800);
            
            const response = await fetch(`http://${ip}:${port}/ping`, {
                method: 'GET',
                signal: controller.signal,
                mode: 'cors', // Intentar con CORS
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    ip: ip,
                    port: port,
                    name: data.name || 'TV Sin Nombre',
                    status: data.status || 'online',
                };
            }
        } catch (e) {
            // Timeout, CORS error, o error de conexión - continuar
            // Los errores de CORS son esperados, pero la conexión puede funcionar
            // Intentar método alternativo con imagen
            try {
                const img = new Image();
                const checkPromise = new Promise((resolve) => {
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                    setTimeout(() => resolve(false), 500);
                });
                img.src = `http://${ip}:${port}/ping?img=1`;
                const isOnline = await checkPromise;
                if (isOnline) {
                    return {
                        ip: ip,
                        port: port,
                        name: 'TV Detectado',
                        status: 'online',
                    };
                }
            } catch (e2) {
                // Ignorar
            }
        }
    }
    
    return null;
}

function updateDevicesList(devicesList, foundTvs, tvUrl) {
    if (foundTvs.length === 0) {
        devicesList.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
                <i class="fas fa-info-circle" style="color: #856404;"></i>
                <strong style="color: #856404;">No se encontraron TVs automáticamente</strong>
                <p style="margin: 8px 0 0 0; color: #856404; font-size: 14px;">
                    Puedes ingresar la IP del TV manualmente:
                </p>
                <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 6px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--dark-blue-nav);">
                        IP del TV (ej: 192.168.1.112):
                    </label>
                    <input 
                        type="text" 
                        id="manual-tv-ip" 
                        placeholder="192.168.1.112" 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; font-family: monospace;"
                    />
                    <input 
                        type="number" 
                        id="manual-tv-port" 
                        placeholder="8081" 
                        value="8081"
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; font-family: monospace;"
                    />
                    <button 
                        onclick="castToManualTv('${tvUrl.replace(/'/g, "\\'")}')"
                        style="width: 100%; padding: 10px; background: var(--green-categories); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        <i class="fas fa-paper-plane"></i> Transmitir a esta IP
                    </button>
                </div>
                <p style="margin: 15px 0 0 0; color: #856404; font-size: 12px;">
                    💡 La IP del TV aparece en la esquina superior derecha de la app (toca el ícono de info).
                </p>
            </div>
        `;
        return;
    }
    
    devicesList.innerHTML = foundTvs.map(tv => `
        <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: bold; color: var(--dark-blue-nav); margin-bottom: 5px;">
                    <i class="fas fa-tv"></i> ${tv.name}
                </div>
                <div style="font-size: 12px; color: var(--gray-text);">
                    ${tv.ip}:${tv.port}
                </div>
            </div>
            <button 
                class="tv-cast-btn" 
                data-ip="${tv.ip}" 
                data-port="${tv.port}"
                style="padding: 8px 16px; background: var(--green-categories); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                Transmitir
            </button>
        </div>
    `).join('');
    
    // Agregar event listeners a los botones
    devicesList.querySelectorAll('.tv-cast-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const ip = btn.dataset.ip;
            const port = btn.dataset.port;
            await castToTv(ip, port, tvUrl);
        });
    });
}

async function castToTv(ip, port, url) {
    try {
        const response = await fetch(`http://${ip}:${port}/cast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url }),
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Transmisión enviada exitosamente al TV');
            // Cerrar modal
            const modal = document.getElementById('tv-cast-modal');
            if (modal) modal.remove();
        } else {
            alert('❌ Error: ' + (result.error || 'No se pudo transmitir'));
        }
    } catch (e) {
        alert('❌ Error de conexión: ' + e.message + '\n\nAsegúrate de que:\n- El TV esté en la misma red WiFi\n- La app esté abierta en el TV\n- El firewall no bloquee la conexión');
    }
}

async function castToManualTv(tvUrl) {
    const ipInput = document.getElementById('manual-tv-ip');
    const portInput = document.getElementById('manual-tv-port');
    
    if (!ipInput || !ipInput.value.trim()) {
        alert('⚠️ Por favor ingresa la IP del TV');
        return;
    }
    
    const ip = ipInput.value.trim();
    const port = parseInt(portInput?.value || '8081', 10) || 8081;
    
    // Validar IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        alert('⚠️ IP inválida. Formato: 192.168.1.112');
        return;
    }
    
    await castToTv(ip, port, tvUrl);
}

async function detectAndShowTvs_OLD(tvUrl, modal) {
    const listContainer = document.getElementById('tv-devices-list');
    const devices = [];
    
    // 1. Buscar TVs registrados en localStorage (compartido entre pestañas del mismo dominio)
    try {
        const registeredTvs = await discoverRegisteredTvs();
        devices.push(...registeredTvs);
    } catch (e) {
        console.log('Error buscando TVs registrados:', e);
    }
    
    // 2. Mostrar resultados
    if (devices.length > 0) {
        listContainer.innerHTML = `
            <p style="margin-bottom: 10px; color: var(--gray-text); font-weight: 500;">Selecciona un TV:</p>
            ${devices.map(device => `
                <div style="border: 2px solid var(--gray-border); border-radius: 8px; padding: 15px; margin-bottom: 10px; cursor: pointer; transition: all 0.3s;" 
                     onmouseover="this.style.borderColor='var(--green-categories)'; this.style.background='#f0f7ff';" 
                     onmouseout="this.style.borderColor='var(--gray-border)'; this.style.background='white';"
                     onclick="castToDevice('${device.id}', 'registered', '${tvUrl.replace(/'/g, "\\'")}')">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-tv" style="font-size: 24px; color: var(--green-categories);"></i>
                        <div style="flex: 1;">
                            <strong style="color: var(--dark-blue-nav); display: block;">${device.name || device.id}</strong>
                            <div style="font-size: 12px; color: var(--gray-text);">TV Registrado • ${device.id.substring(0, 20)}...</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: var(--gray-text);"></i>
                    </div>
                </div>
            `).join('')}
            <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #1a73e8;">
                <strong style="color: #1a73e8; display: block; margin-bottom: 5px;">
                    <i class="fas fa-info-circle"></i> ¿No ves tu TV?
                </strong>
                <p style="margin: 0; font-size: 13px; color: #1a73e8;">
                    Abre esta URL en el navegador del TV para registrarlo:<br>
                    <code style="background: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 5px; font-size: 11px;">
                        ${window.location.origin}/tv-register.html
                    </code>
                </p>
            </div>
        `;
    } else {
        listContainer.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #856404;">
                    <i class="fas fa-info-circle"></i> No se encontraron TVs
                </h3>
                <p style="margin: 0 0 15px 0; color: #856404;">
                    Para transmitir a un TV, primero regístralo:
                </p>
                <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                    <strong style="display: block; margin-bottom: 10px;">Paso 1:</strong>
                    <p style="margin: 0 0 10px 0; font-size: 13px;">
                        Abre esta URL en el navegador del TV:
                    </p>
                    <code style="background: #f5f5f5; padding: 8px 12px; border-radius: 4px; display: block; word-break: break-all; font-size: 11px; margin-bottom: 10px;">
                        ${window.location.origin}/tv-register.html
                    </code>
                    <strong style="display: block; margin: 15px 0 10px 0;">Paso 2:</strong>
                    <p style="margin: 0; font-size: 13px;">
                        El TV se registrará automáticamente. Luego recarga esta página y vuelve a intentar.
                    </p>
                </div>
                <button onclick="document.getElementById('tv-devices-list').innerHTML = '<div style=\\'text-align: center; padding: 20px;\\'><i class=\\'fas fa-spinner fa-spin\\' style=\\'font-size: 24px; color: var(--green-categories);\\'></i><p style=\\'margin-top: 10px; color: var(--gray-text);\\'>Buscando TVs...</p></div>'; detectAndShowTvs('${tvUrl}', document.getElementById('tv-cast-modal'));" 
                        style="padding: 10px 20px; background: var(--green-categories); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    <i class="fas fa-sync-alt"></i> Buscar de nuevo
                </button>
            </div>
        `;
    }
}

async function discoverRegisteredTvs() {
    // Buscar TVs registrados en localStorage (compartido entre pestañas del mismo dominio)
    const registeredTvs = JSON.parse(localStorage.getItem('tropiplus_registered_tvs') || '[]');
    
    // Filtrar TVs que estén activos (últimos 5 minutos)
    const now = Date.now();
    const activeTvs = registeredTvs.filter(tv => (now - tv.lastSeen) < 300000);
    
    return activeTvs.map(tv => ({
        id: tv.id,
        name: tv.name || `TV ${tv.id.substring(0, 8)}`,
        type: 'registered',
        url: tv.url
    }));
}

async function castToDevice(deviceId, deviceType, tvUrl) {
    try {
        // Enviar URL al TV registrado usando BroadcastChannel y localStorage
        await sendUrlToRegisteredTv(deviceId, tvUrl);
        
        if (typeof showModal === 'function') {
            showModal('Éxito', `Pantalla transmitida al TV: ${deviceId}`, 'success');
        }
        
        const modal = document.getElementById('tv-cast-modal');
        if (modal) document.body.removeChild(modal);
    } catch (e) {
        if (typeof showModal === 'function') {
            showModal('Error', `No se pudo transmitir: ${e.message}`, 'error');
        }
    }
}

async function sendUrlToRegisteredTv(deviceId, tvUrl) {
    // Enviar URL al TV usando BroadcastChannel (comunicación entre pestañas)
    try {
        const channel = new BroadcastChannel('tropiplus_tv_cast');
        channel.postMessage({
            type: 'open_url',
            deviceId: deviceId,
            url: tvUrl,
            timestamp: Date.now()
        });
    } catch (e) {
        console.log('BroadcastChannel no disponible:', e);
    }
    
    // También guardar en localStorage como backup (el TV lo revisa periódicamente)
    const pendingCasts = JSON.parse(localStorage.getItem('tropiplus_pending_casts') || '[]');
    pendingCasts.push({
        deviceId,
        url: tvUrl,
        timestamp: Date.now()
    });
    // Mantener solo los últimos 10
    const recentCasts = pendingCasts.slice(-10);
    localStorage.setItem('tropiplus_pending_casts', JSON.stringify(recentCasts));
}

// Exponer TVs globalmente para que la app pueda leerlos
function exposeTVsToApp() {
    const tvs = getTvConfigs();
    // Exponer en window para que la app pueda leerlos
    window.tropiplusTVs = tvs;
    // También guardar en un script tag con datos
    let scriptTag = document.getElementById('tropiplus-tvs-data');
    if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'tropiplus-tvs-data';
        scriptTag.type = 'application/json';
        document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(tvs);
}

function renderTvList() {
    const container = document.getElementById('tv-list-container');
    if (!container) return;
    
    // Exponer TVs para la app
    exposeTVsToApp();

    const tvConfigs = getTvConfigs();
    if (tvConfigs.length === 0) {
        container.innerHTML = '<p style="color: var(--gray-text);">No hay TVs configurados.</p>';
        return;
    }

    // Obtener la URL base (para GitHub Pages será diferente)
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
    
    container.innerHTML = tvConfigs.map(tv => {
        const tvUrl = `${baseUrl}tv.html?tv=${encodeURIComponent(tv.id)}&v=20260210v`;
        return `
        <div class="tv-list-item">
            <h4>${tv.name || 'TV sin nombre'} ${tv.active ? '' : '<span style="color:#d93025; font-size:12px;">(Inactivo)</span>'}</h4>
            <div class="tv-meta">
                Modo: <b>${tv.mode || 'mixed'}</b> | Categoría: <b>${tv.categoryName || 'Todas'}</b> |
                Productos: <b>${tv.productCount || 8}</b> | Seg sección: <b>${tv.slideSeconds || 10}</b>
            </div>
            <div style="background: #f0f7ff; border: 1px solid #42b649; border-radius: 6px; padding: 10px; margin: 10px 0; font-size: 12px;">
                <strong style="color: #1f318a; display: block; margin-bottom: 6px;">
                    <i class="fas fa-link"></i> URL para este TV:
                </strong>
                <code style="background: white; padding: 6px 10px; border-radius: 4px; display: block; word-break: break-all; color: #d93025; font-weight: 600;">
                    ${tvUrl}
                </code>
                <button onclick="navigator.clipboard.writeText('${tvUrl}').then(() => { if(typeof showModal === 'function') showModal('Copiado', 'URL copiada al portapapeles', 'success'); })" style="margin-top: 8px; padding: 4px 12px; background: #42b649; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    <i class="fas fa-copy"></i> Copiar URL
                </button>
            </div>
            <div class="tv-actions">
                <a class="tv-btn-open" href="tv.html?tv=${encodeURIComponent(tv.id)}&v=20260210v" target="_blank" rel="noopener noreferrer">Abrir Pantalla TV</a>
                <button class="tv-btn-rotate" data-tv-action="rotate" data-tv-id="${tv.id}" style="background: #9c27b0; color: white; padding: 8px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fas fa-sync-alt"></i> Girar pantalla
                </button>
                <button class="tv-btn-edit" data-tv-action="edit" data-tv-id="${tv.id}">Editar</button>
                <button class="tv-btn-delete" data-tv-action="delete" data-tv-id="${tv.id}">Eliminar</button>
            </div>
        </div>
    `;
    }).join('');

    // Mostrar estado real de sincronización contra tvs-public.json
    refreshPublicTvSyncStatus();
}

function loadTvIntoForm(tvId) {
    const tv = getTvConfigs().find(item => item.id === tvId);
    if (!tv) return;
    
    console.log('📋 [Admin] Cargando TV en formulario:', tv);
    document.getElementById('tv-id').value = tv.id || '';
    document.getElementById('tv-name').value = tv.name || '';
    document.getElementById('tv-mode').value = tv.mode || 'mixed';
    document.getElementById('tv-category').value = tv.categoryId || '';
    document.getElementById('tv-product-count').value = tv.productCount || 8;
    document.getElementById('tv-slide-seconds').value = tv.slideSeconds || 10;
    const mixedSecondsInput = document.getElementById('tv-mixed-transition-seconds');
    if (mixedSecondsInput) mixedSecondsInput.value = tv.mixedTransitionSeconds || tv.slideSeconds || 12;
    // Aplicar visibilidad según el modo cargado
    const mode = tv.mode || 'mixed';
    applyTvModeVisibility(mode);
    document.getElementById('tv-show-price').checked = tv.showPrice !== false;
    document.getElementById('tv-show-offer').checked = tv.showOffer !== false;
    document.getElementById('tv-promo-text').value = tv.promoText || '';
    const tickerEnabledInput = document.getElementById('tv-ticker-enabled');
    if (tickerEnabledInput) tickerEnabledInput.checked = tv.tickerEnabled !== false;
    const tickerSpeedInput = document.getElementById('tv-ticker-speed');
    if (tickerSpeedInput) tickerSpeedInput.value = tv.tickerSpeed || 'normal';
    const tickerFontSizeInput = document.getElementById('tv-ticker-font-size');
    if (tickerFontSizeInput) tickerFontSizeInput.value = tv.tickerFontSize || '28px';
    const tickerTextColorInput = document.getElementById('tv-ticker-text-color');
    if (tickerTextColorInput) tickerTextColorInput.value = tv.tickerTextColor || '#ffec67';
    const tickerBgColorInput = document.getElementById('tv-ticker-bg-color');
    if (tickerBgColorInput) tickerBgColorInput.value = tv.tickerBgColor || '#000000';
    document.getElementById('tv-active').checked = tv.active !== false;
    populateTvQrSelect(tv.qrId || '');
    applyTvModeVisibility(tv.mode || 'mixed');
}

function initQrTab() {
    const form = document.getElementById('qr-config-form');
    if (!form) return;
    
    const resetBtn = document.getElementById('qr-reset-btn');
    const listContainer = document.getElementById('qr-list');
    
    function getQrConfigs() {
        try {
            const raw = localStorage.getItem(QR_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('No se pudo leer configuración de QRs:', error);
            return [];
        }
    }
    
    function saveQrConfigs(configs) {
        localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(configs));
        console.log('💾 [Admin] QRs guardados:', configs.length);
    }
    
    function createQrId() {
        return `qr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    
    function renderQrList() {
        const configs = getQrConfigs();
        if (configs.length === 0) {
            listContainer.innerHTML = '<p style="color: var(--gray-text); text-align: center; padding: 20px;">No hay QRs configurados aún.</p>';
            return;
        }
        
        listContainer.innerHTML = configs.map(qr => `
            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0 0 8px 0; font-size: 16px;">${qr.name || 'QR Sin Nombre'}</h4>
                    <p style="margin: 0; color: var(--gray-text); font-size: 14px; word-break: break-all;">
                        ${qr.url || 'Sin URL'}
                    </p>
                    <p style="margin: 4px 0 0 0; color: var(--gray-text); font-size: 12px;">
                        Tamaño: ${qr.size || 300}px | ${qr.active ? '✅ Activo' : '❌ Inactivo'}
                    </p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-secondary" onclick="editQr('${qr.id}')" style="padding: 6px 12px; font-size: 12px;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-danger" onclick="deleteQr('${qr.id}')" style="padding: 6px 12px; font-size: 12px;">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    function resetQrForm() {
        form.reset();
        document.getElementById('qr-name').value = '';
        document.getElementById('qr-url').value = '';
        document.getElementById('qr-size').value = '300';
        document.getElementById('qr-active').checked = true;
    }
    
    function loadQrIntoForm(qrId) {
        const qr = getQrConfigs().find(item => item.id === qrId);
        if (!qr) return;
        
        document.getElementById('qr-name').value = qr.name || '';
        document.getElementById('qr-url').value = qr.url || '';
        document.getElementById('qr-size').value = qr.size || '300';
        document.getElementById('qr-active').checked = qr.active !== false;
    }
    
    window.editQr = function(qrId) {
        loadQrIntoForm(qrId);
        document.getElementById('qr-content').scrollIntoView({ behavior: 'smooth' });
    };
    
    window.deleteQr = function(qrId) {
        if (confirm('¿Estás seguro de que deseas eliminar este QR?')) {
            const configs = getQrConfigs().filter(item => item.id !== qrId);
            saveQrConfigs(configs);
            renderQrList();
            if (typeof showModal === 'function') {
                showModal('Listo', 'QR eliminado correctamente.', 'success');
            }
        }
    };
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetQrForm();
        });
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('qr-name').value.trim();
        const url = document.getElementById('qr-url').value.trim();
        const size = parseInt(document.getElementById('qr-size').value || '300', 10);
        const active = document.getElementById('qr-active').checked;
        
        if (!name || !url) {
            if (typeof showModal === 'function') {
                showModal('Error', 'Debes completar todos los campos requeridos.', 'error');
            }
            return;
        }
        
        try {
            new URL(url);
        } catch {
            if (typeof showModal === 'function') {
                showModal('Error', 'La URL no es válida.', 'error');
            }
            return;
        }
        
        const qrId = createQrId();
        const qrPayload = {
            id: qrId,
            name,
            url,
            size,
            active,
            updatedAt: Date.now()
        };
        
        const configs = getQrConfigs();
        configs.push(qrPayload);
        saveQrConfigs(configs);
        renderQrList();
        resetQrForm();
        
        if (typeof showModal === 'function') {
            showModal('Éxito', 'QR guardado correctamente.', 'success');
        }
    });
    
    renderQrList();
}

function initHoursTab() {
    const form = document.getElementById('hours-config-form');
    const resetBtn = document.getElementById('hours-reset-btn');
    const container = document.getElementById('hours-days-container');
    if (!form || !container) return;
    
    const days = [
        { id: 0, name: 'Domingo', short: 'Dom' },
        { id: 1, name: 'Lunes', short: 'Lun' },
        { id: 2, name: 'Martes', short: 'Mar' },
        { id: 3, name: 'Miércoles', short: 'Mié' },
        { id: 4, name: 'Jueves', short: 'Jue' },
        { id: 5, name: 'Viernes', short: 'Vie' },
        { id: 6, name: 'Sábado', short: 'Sáb' }
    ];
    
    function getHoursConfig() {
        try {
            const raw = localStorage.getItem(HOURS_STORAGE_KEY);
            if (!raw) return {};
            return JSON.parse(raw);
        } catch (error) {
            console.warn('No se pudo leer configuración de horarios:', error);
            return {};
        }
    }
    
    function saveHoursConfig(config) {
        localStorage.setItem(HOURS_STORAGE_KEY, JSON.stringify(config));
        console.log('💾 [Admin] Horarios guardados');
    }
    
    function renderDays() {
        const config = getHoursConfig();
        container.innerHTML = days.map(day => {
            const dayConfig = config[day.id] || { enabled: false, start: '09:00', end: '18:00' };
            return `
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1;">
                            <input type="checkbox" class="day-enabled" data-day="${day.id}" ${dayConfig.enabled ? 'checked' : ''} style="width: auto; transform: scale(1.2);">
                            <span style="font-weight: 600; font-size: 16px;">${day.name}</span>
                        </label>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;" class="day-times" data-day="${day.id}" ${!dayConfig.enabled ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--gray-text);">Apertura</label>
                            <input type="time" class="day-start" data-day="${day.id}" value="${dayConfig.start}" style="width: 100%; padding: 8px; border: 2px solid var(--gray-border); border-radius: 6px; font-size: 14px;">
                        </div>
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--gray-text);">Cierre</label>
                            <input type="time" class="day-end" data-day="${day.id}" value="${dayConfig.end}" style="width: 100%; padding: 8px; border: 2px solid var(--gray-border); border-radius: 6px; font-size: 14px;">
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Agregar event listeners para checkboxes
        container.querySelectorAll('.day-enabled').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const dayId = parseInt(e.target.dataset.day);
                const timesDiv = container.querySelector(`.day-times[data-day="${dayId}"]`);
                if (timesDiv) {
                    if (e.target.checked) {
                        timesDiv.style.opacity = '1';
                        timesDiv.style.pointerEvents = 'auto';
                    } else {
                        timesDiv.style.opacity = '0.5';
                        timesDiv.style.pointerEvents = 'none';
                    }
                }
            });
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas restablecer todos los horarios?')) {
                localStorage.removeItem(HOURS_STORAGE_KEY);
                renderDays();
                if (typeof showModal === 'function') {
                    showModal('Listo', 'Horarios restablecidos.', 'success');
                }
            }
        });
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const config = {};
        days.forEach(day => {
            const enabled = container.querySelector(`.day-enabled[data-day="${day.id}"]`)?.checked || false;
            const start = container.querySelector(`.day-start[data-day="${day.id}"]`)?.value || '09:00';
            const end = container.querySelector(`.day-end[data-day="${day.id}"]`)?.value || '18:00';
            
            config[day.id] = {
                enabled,
                start,
                end
            };
        });
        
        saveHoursConfig(config);
        
        if (typeof showModal === 'function') {
            showModal('Éxito', 'Horarios guardados correctamente. Los TVs usarán esta configuración.', 'success');
        }
    });
    
    renderDays();
}

function initCurrencyTab() {
    const form = document.getElementById('currency-config-form');
    const resetBtn = document.getElementById('currency-reset-btn');
    if (!form) return;
    
    function saveCurrencyConfig(config) {
        localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(config));
        console.log('💾 [Admin] Configuración de divisas guardada:', config);
    }
    
    // Cargar configuración existente (usar función global si existe, sino leer directamente)
    let config;
    if (typeof window.getCurrencyConfig === 'function') {
        config = window.getCurrencyConfig();
    } else {
        try {
            const raw = localStorage.getItem(CURRENCY_STORAGE_KEY);
            config = raw ? JSON.parse(raw) : { exchangeRate: 500, enabled: true };
        } catch (error) {
            config = { exchangeRate: 500, enabled: true };
        }
    }
    document.getElementById('currency-exchange-rate').value = config.exchangeRate || 500;
    document.getElementById('currency-enabled').checked = config.enabled !== false;
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas restablecer la configuración de divisas?')) {
                const defaults = { exchangeRate: 500, enabled: true };
                document.getElementById('currency-exchange-rate').value = defaults.exchangeRate;
                document.getElementById('currency-enabled').checked = defaults.enabled;
                saveCurrencyConfig(defaults);
                if (typeof showModal === 'function') {
                    showModal('Listo', 'Configuración de divisas restablecida.', 'success');
                }
            }
        });
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const exchangeRate = parseFloat(document.getElementById('currency-exchange-rate').value);
        const enabled = document.getElementById('currency-enabled').checked;
        
        if (!exchangeRate || exchangeRate <= 0) {
            if (typeof showModal === 'function') {
                showModal('Error', 'La tasa de cambio debe ser mayor a 0.', 'error');
            }
            return;
        }
        
        const currencyConfig = {
            exchangeRate: exchangeRate,
            enabled: enabled,
            updatedAt: Date.now()
        };
        
        saveCurrencyConfig(currencyConfig);
        
        if (typeof showModal === 'function') {
            showModal('Éxito', 'Configuración de divisas guardada correctamente. Los productos mostrarán precios en USD y CUP.', 'success');
        }
    });
}

// ============================================
// GESTIÓN DE REMESAS EN ADMIN
// ============================================

function initRemesasManagement() {
    const filterStatus = document.getElementById('remesas-filter-status');
    const refreshBtn = document.getElementById('remesas-refresh-btn');
    
    // Cargar remesas cuando se abre la pestaña de Divisas
    const currencyTabBtn = document.querySelector('.admin-internal-btn[data-subtab="currency"]');
    if (currencyTabBtn) {
        currencyTabBtn.addEventListener('click', () => {
            setTimeout(() => {
                loadRemesas();
            }, 100);
        });
    }
    
    // Filtro por estado
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            loadRemesas(filterStatus.value || null);
        });
    }
    
    // Botón de actualizar
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadRemesas(filterStatus?.value || null);
        });
    }
    
    // Cargar remesas inicialmente si la pestaña está activa
    if (document.getElementById('currency-content')?.classList.contains('active')) {
        loadRemesas();
    }
}

async function loadRemesas(statusFilter = null) {
    const container = document.getElementById('remesas-list-container');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--gray-text);">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 12px;"></i>
            <p>Cargando remesas...</p>
        </div>
    `;
    
    try {
        if (typeof window.getAllRemesasFromSupabase !== 'function') {
            throw new Error('Función getAllRemesasFromSupabase no disponible. Verifica que supabase-config.js esté cargado.');
        }
        
        const remesas = await window.getAllRemesasFromSupabase(statusFilter);
        renderRemesasList(remesas);
    } catch (error) {
        console.error('❌ [Admin] Error cargando remesas:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--red-badge);">
                <i class="fas fa-exclamation-triangle" style="font-size: 32px; margin-bottom: 15px;"></i>
                <p><strong>Error cargando remesas</strong></p>
                <p style="font-size: 14px; margin-top: 8px;">${error.message || 'Error desconocido'}</p>
                <button onclick="loadRemesas()" class="btn-primary" style="margin-top: 16px;">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function renderRemesasList(remesas) {
    const container = document.getElementById('remesas-list-container');
    if (!container) return;
    
    if (!remesas || remesas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--gray-text);">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                <p>No hay remesas para mostrar.</p>
            </div>
        `;
        return;
    }
    
    const remesasHtml = remesas.map(remesa => {
        const statusColors = {
            pending: '#ff9800',
            delivered: '#4caf50',
            cancelled: '#9e9e9e'
        };
        
        const statusLabels = {
            pending: 'Pendiente',
            delivered: 'Entregada',
            cancelled: 'Cancelada'
        };
        
        const statusColor = statusColors[remesa.status] || '#616161';
        const statusLabel = statusLabels[remesa.status] || remesa.status;
        
        const createdDate = new Date(remesa.created_at).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const deliveredDate = remesa.delivered_at 
            ? new Date(remesa.delivered_at).toLocaleString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : null;
        
        return `
            <div style="border: 2px solid var(--gray-border); border-radius: 8px; padding: 20px; margin-bottom: 16px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <h3 style="margin: 0; color: var(--dark-blue-nav); font-size: 18px;">
                                Remesa #${remesa.confirmation_code}
                            </h3>
                            <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 12px;">
                                ${statusLabel}
                            </span>
                        </div>
                        <p style="margin: 0; color: var(--gray-text); font-size: 13px;">
                            <i class="fas fa-calendar"></i> Creada: ${createdDate}
                        </p>
                        ${deliveredDate ? `
                            <p style="margin: 4px 0 0 0; color: var(--gray-text); font-size: 13px;">
                                <i class="fas fa-check-circle"></i> Entregada: ${deliveredDate}
                            </p>
                        ` : ''}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 13px; color: var(--gray-text); text-transform: uppercase;">
                            Remitente
                        </h4>
                        <p style="margin: 0; font-weight: 600; color: var(--dark-blue-nav);">${remesa.sender_name || 'N/A'}</p>
                        ${remesa.sender_email ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: var(--gray-text);">${remesa.sender_email}</p>` : ''}
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 13px; color: var(--gray-text); text-transform: uppercase;">
                            Destinatario
                        </h4>
                        <p style="margin: 0; font-weight: 600; color: var(--dark-blue-nav);">${remesa.recipient_name || 'N/A'}</p>
                        ${remesa.recipient_id ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: var(--gray-text);">CI: ${remesa.recipient_id}</p>` : ''}
                    </div>
                </div>
                
                <div style="background: #f0f7ff; border-left: 4px solid #42b649; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="margin: 0; font-size: 13px; color: var(--gray-text);">Cantidad a entregar:</p>
                            <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 700; color: var(--dark-blue-nav);">
                                ${remesa.currency === 'USD' ? '$' : '₱'}${parseFloat(remesa.amount_usd).toFixed(2)} ${remesa.currency}
                            </p>
                            ${remesa.amount_cup ? `
                                <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #4caf50;">
                                    ${parseFloat(remesa.amount_cup).toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CUP
                                </p>
                            ` : ''}
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-size: 13px; color: var(--gray-text);">Total pagado:</p>
                            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #42b649;">
                                $${parseFloat(remesa.total_paid).toFixed(2)} USD
                            </p>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--gray-text);">
                                (Incluye comisión 10%)
                            </p>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    ${remesa.status === 'pending' ? `
                        <button onclick="openDeliverRemesaModal('${remesa.id}', '${remesa.confirmation_code}')" 
                                class="btn-primary" 
                                style="background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-check-circle"></i> Entregar Remesa
                        </button>
                        <button onclick="cancelRemesa('${remesa.id}')" 
                                class="btn-secondary" 
                                style="background: #d93025; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-times-circle"></i> Cancelar
                        </button>
                    ` : ''}
                    <div style="flex: 1; text-align: right; padding: 10px 0;">
                        <p style="margin: 0; font-size: 12px; color: var(--gray-text);">
                            <strong>Código de confirmación:</strong>
                        </p>
                        <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700; color: #42b649; letter-spacing: 2px;">
                            ${remesa.confirmation_code}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = remesasHtml;
}

function openDeliverRemesaModal(remesaId, confirmationCode) {
    // Crear modal si no existe
    let modal = document.getElementById('deliver-remesa-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deliver-remesa-modal';
        modal.className = 'supplier-modal';
        modal.innerHTML = `
            <div class="supplier-modal-content" style="max-width: 500px;">
                <h2 style="margin-top: 0; margin-bottom: 18px; font-size: 20px;">
                    <i class="fas fa-key"></i> Entregar Remesa
                </h2>
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 13px; color: #856404;">
                        <i class="fas fa-info-circle"></i> 
                        <strong>Importante:</strong> Solicita al destinatario el código de confirmación para validar la entrega.
                    </p>
                </div>
                <form id="deliver-remesa-form">
                    <input type="hidden" id="deliver-remesa-id">
                    <div class="supplier-form-group">
                        <label for="deliver-remesa-code">Código de Confirmación *</label>
                        <input type="text" id="deliver-remesa-code" 
                               placeholder="Ej: REM-123456" 
                               required 
                               style="text-transform: uppercase; letter-spacing: 2px; font-weight: 700; font-size: 18px; text-align: center;"
                               maxlength="10">
                        <small style="color: var(--gray-text); display:block; margin-top:6px; font-size:12px;">
                            El destinatario debe proporcionar este código para recibir la remesa.
                        </small>
                    </div>
                    <div class="supplier-modal-footer">
                        <button type="button" class="btn-cancel" onclick="closeDeliverRemesaModal()">Cancelar</button>
                        <button type="submit" class="btn-save" style="background: #4caf50;">
                            <i class="fas fa-check-circle"></i> Confirmar Entrega
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Event listener para el formulario
        const form = document.getElementById('deliver-remesa-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('deliver-remesa-code').value.trim().toUpperCase();
            const remesaId = document.getElementById('deliver-remesa-id').value;
            
            if (!code) {
                if (typeof showModal === 'function') {
                    showModal('Error', 'Debes ingresar el código de confirmación.', 'error');
                }
                return;
            }
            
            await deliverRemesa(remesaId, code);
        });
        
        // Cerrar al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeDeliverRemesaModal();
            }
        });
    }
    
    // Llenar datos
    document.getElementById('deliver-remesa-id').value = remesaId;
    document.getElementById('deliver-remesa-code').value = '';
    document.getElementById('deliver-remesa-code').placeholder = `Ej: ${confirmationCode}`;
    
    // Mostrar modal
    modal.classList.add('active');
    // Focus en el input
    setTimeout(() => {
        document.getElementById('deliver-remesa-code').focus();
    }, 100);
}

function closeDeliverRemesaModal() {
    const modal = document.getElementById('deliver-remesa-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function deliverRemesa(remesaId, confirmationCode) {
    try {
        if (typeof window.deliverRemesaFromSupabase !== 'function') {
            throw new Error('Función deliverRemesaFromSupabase no disponible.');
        }
        
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        const deliveredBy = user ? [user.given_name, user.family_name].filter(Boolean).join(' ').trim() || user.name || user.email : 'Admin';
        
        await window.deliverRemesaFromSupabase(confirmationCode, deliveredBy);
        
        closeDeliverRemesaModal();
        
        if (typeof showModal === 'function') {
            showModal('Éxito', 'Remesa entregada correctamente.', 'success');
        }
        
        // Recargar lista
        const filterStatus = document.getElementById('remesas-filter-status');
        loadRemesas(filterStatus?.value || null);
    } catch (error) {
        console.error('❌ [Admin] Error entregando remesa:', error);
        if (typeof showModal === 'function') {
            showModal('Error', error.message || 'No se pudo entregar la remesa. Verifica el código de confirmación.', 'error');
        }
    }
}

async function cancelRemesa(remesaId) {
    if (!confirm('¿Estás seguro de que deseas cancelar esta remesa?')) {
        return;
    }
    
    try {
        if (typeof window.cancelRemesaFromSupabase !== 'function') {
            throw new Error('Función cancelRemesaFromSupabase no disponible.');
        }
        
        await window.cancelRemesaFromSupabase(remesaId);
        
        if (typeof showModal === 'function') {
            showModal('Éxito', 'Remesa cancelada correctamente.', 'success');
        }
        
        // Recargar lista
        const filterStatus = document.getElementById('remesas-filter-status');
        loadRemesas(filterStatus?.value || null);
    } catch (error) {
        console.error('❌ [Admin] Error cancelando remesa:', error);
        if (typeof showModal === 'function') {
            showModal('Error', error.message || 'No se pudo cancelar la remesa.', 'error');
        }
    }
}

// Exportar funciones globalmente
window.loadRemesas = loadRemesas;
window.openDeliverRemesaModal = openDeliverRemesaModal;
window.closeDeliverRemesaModal = closeDeliverRemesaModal;
window.deliverRemesa = deliverRemesa;
window.cancelRemesa = cancelRemesa;

// ============================================
// GESTIÓN DE DELIVERY EN ADMIN
// ============================================

function initDeliveryTab() {
    const filterStatus = document.getElementById('delivery-filter-status');
    const refreshBtn = document.getElementById('delivery-refresh-btn');
    
    // Filtro por estado
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            loadDeliveryOrders(filterStatus.value || null);
        });
    }
    
    // Botón de actualizar
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadDeliveryOrders(filterStatus?.value || null);
        });
    }
    
    // Cargar órdenes inicialmente
    loadDeliveryOrders();
}

async function loadDeliveryOrders(statusFilter = null) {
    const container = document.getElementById('delivery-orders-list-container');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--gray-text);">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 12px;"></i>
            <p>Cargando órdenes de delivery...</p>
        </div>
    `;
    
    try {
        if (typeof window.getDeliveryOrdersFromSupabase !== 'function') {
            throw new Error('Función getDeliveryOrdersFromSupabase no disponible. Verifica que supabase-config.js esté cargado.');
        }
        
        const orders = await window.getDeliveryOrdersFromSupabase(statusFilter);
        renderDeliveryOrdersList(orders);
    } catch (error) {
        console.error('❌ [Admin] Error cargando órdenes de delivery:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--red-badge);">
                <i class="fas fa-exclamation-triangle" style="font-size: 32px; margin-bottom: 15px;"></i>
                <p><strong>Error cargando órdenes de delivery</strong></p>
                <p style="font-size: 14px; margin-top: 8px;">${error.message || 'Error desconocido'}</p>
                <button onclick="loadDeliveryOrders()" class="btn-primary" style="margin-top: 16px;">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function renderDeliveryOrdersList(orders) {
    const container = document.getElementById('delivery-orders-list-container');
    if (!container) return;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--gray-text);">
                <i class="fas fa-truck" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                <p>No hay órdenes de delivery para mostrar.</p>
            </div>
        `;
        return;
    }
    
    const ordersHtml = orders.map(order => {
        const statusColors = {
            pending: '#ff9800',
            preparing: '#2196f3',
            ready: '#4caf50',
            out_for_delivery: '#9c27b0',
            delivered: '#4caf50',
            cancelled: '#9e9e9e'
        };
        
        const statusLabels = {
            pending: 'Pendiente',
            preparing: 'En preparación',
            ready: 'Lista',
            out_for_delivery: 'En camino',
            delivered: 'Entregada',
            cancelled: 'Cancelada'
        };
        
        const statusColor = statusColors[order.status] || '#616161';
        const statusLabel = statusLabels[order.status] || order.status;
        
        const createdDate = new Date(order.created_at).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const address = order.recipient_address || {};
        const addressText = [
            address.address_line_1,
            address.locality,
            address.municipality,
            address.administrative_district_level_1
        ].filter(Boolean).join(', ');
        
        return `
            <div style="border: 2px solid var(--gray-border); border-radius: 8px; padding: 20px; margin-bottom: 16px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <h3 style="margin: 0; color: var(--dark-blue-nav); font-size: 18px;">
                                Orden #${order.order_id.substring(0, 8)}
                            </h3>
                            <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 12px;">
                                ${statusLabel}
                            </span>
                        </div>
                        <p style="margin: 0; color: var(--gray-text); font-size: 13px;">
                            <i class="fas fa-calendar"></i> Creada: ${createdDate}
                        </p>
                    </div>
                </div>
                
                <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; color: var(--gray-text); text-transform: uppercase;">
                        <i class="fas fa-user"></i> Destinatario
                    </h4>
                    <p style="margin: 0; font-weight: 600; color: var(--dark-blue-nav);">${order.recipient_name || 'N/A'}</p>
                    ${order.recipient_phone ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: var(--gray-text);"><i class="fas fa-phone"></i> ${order.recipient_phone}</p>` : ''}
                </div>
                
                <div style="background: #f0f7ff; border-left: 4px solid #42b649; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; color: var(--gray-text); text-transform: uppercase;">
                        <i class="fas fa-map-marker-alt"></i> Dirección de Entrega
                    </h4>
                    <p style="margin: 0; font-weight: 600; color: var(--dark-blue-nav);">${addressText || 'Sin dirección'}</p>
                </div>
                
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    ${order.status === 'pending' ? `
                        <button onclick="updateDeliveryOrderStatus('${order.order_id}', 'preparing')" 
                                class="btn-primary" 
                                style="background: #2196f3; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-utensils"></i> En Preparación
                        </button>
                    ` : ''}
                    ${order.status === 'preparing' ? `
                        <button onclick="updateDeliveryOrderStatus('${order.order_id}', 'ready')" 
                                class="btn-primary" 
                                style="background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-check"></i> Lista
                        </button>
                    ` : ''}
                    ${order.status === 'ready' ? `
                        <button onclick="updateDeliveryOrderStatus('${order.order_id}', 'out_for_delivery')" 
                                class="btn-primary" 
                                style="background: #9c27b0; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-truck"></i> En Camino
                        </button>
                    ` : ''}
                    ${order.status === 'out_for_delivery' ? `
                        <button onclick="updateDeliveryOrderStatus('${order.order_id}', 'delivered')" 
                                class="btn-primary" 
                                style="background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-check-circle"></i> Entregada
                        </button>
                    ` : ''}
                    ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
                        <button onclick="updateDeliveryOrderStatus('${order.order_id}', 'cancelled')" 
                                class="btn-secondary" 
                                style="background: #d93025; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-times-circle"></i> Cancelar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = ordersHtml;
}

async function updateDeliveryOrderStatus(orderId, newStatus) {
    if (!confirm(`¿Estás seguro de que deseas cambiar el estado a "${newStatus}"?`)) {
        return;
    }
    
    try {
        if (typeof window.updateDeliveryOrderStatus !== 'function') {
            throw new Error('Función updateDeliveryOrderStatus no disponible.');
        }
        
        await window.updateDeliveryOrderStatus(orderId, newStatus);
        
        if (typeof showModal === 'function') {
            showModal('Éxito', 'Estado de orden actualizado correctamente.', 'success');
        }
        
        // Recargar lista
        const filterStatus = document.getElementById('delivery-filter-status');
        loadDeliveryOrders(filterStatus?.value || null);
    } catch (error) {
        console.error('❌ [Admin] Error actualizando estado de orden:', error);
        if (typeof showModal === 'function') {
            showModal('Error', error.message || 'No se pudo actualizar el estado de la orden.', 'error');
        }
    }
}

// Exportar funciones globalmente
window.loadDeliveryOrders = loadDeliveryOrders;
window.updateDeliveryOrderStatus = updateDeliveryOrderStatus;

// Las funciones getCurrencyConfig y convertUsdToCup están definidas en square-integration.js
// para que estén disponibles en todas las páginas, no solo en el admin

function initTvTab() {
    const form = document.getElementById('tv-config-form');
    const resetBtn = document.getElementById('tv-reset-btn');
    const listContainer = document.getElementById('tv-list-container');
    if (!form || !listContainer) return;

    populateTvCategorySelect();
    populateTvQrSelect();
    renderTvList();
    seedSupabaseFromLocalIfNeeded()
        .then(() => hydrateTvConfigsFromSupabase())
        .then(() => {
            renderTvList();
            refreshPublicTvSyncStatus();
        });

    resetBtn?.addEventListener('click', () => {
        resetTvForm();
    });

    listContainer.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.dataset.tvAction;
        const tvId = target.dataset.tvId;
        const tvUrl = target.dataset.tvUrl;
        if (!action || !tvId) return;

        if (action === 'edit') {
            loadTvIntoForm(tvId);
            return;
        }

        if (action === 'delete') {
            if (!confirm('¿Estás seguro de que deseas eliminar este TV?')) {
                return;
            }
            
            try {
                // Primero eliminar de Supabase
                if (typeof window.deleteTvConfigFromSupabase === 'function') {
                    await window.deleteTvConfigFromSupabase(tvId);
                    console.log('✅ [Admin] TV eliminado de Supabase:', tvId);
                } else {
                    console.warn('⚠️ [Admin] Función deleteTvConfigFromSupabase no disponible');
                }
                
                // Luego eliminar de localStorage
            const tvConfigs = getTvConfigs().filter(item => item.id !== tvId);
                localStorage.setItem(TV_STORAGE_KEY, JSON.stringify(tvConfigs));
                
                // Recargar desde Supabase para sincronizar
                await hydrateTvConfigsFromSupabase();
            renderTvList();
                refreshPublicTvSyncStatus();
                
            if (typeof showModal === 'function') {
                showModal('Listo', 'TV eliminado correctamente.', 'success');
            }
            } catch (error) {
                console.error('❌ [Admin] Error eliminando TV:', error);
                if (typeof showModal === 'function') {
                    showModal('Error', `Error al eliminar TV: ${error.message || 'Error desconocido'}`, 'error');
                }
            }
            return;
        }

        if (action === 'rotate') {
            toggleTvScreenOrientation(tvId);
            return;
        }
    });

    const modeSelect = document.getElementById('tv-mode');
    if (modeSelect) {
        modeSelect.addEventListener('change', () => {
            const mode = modeSelect.value;
            applyTvModeVisibility(mode);
            if (mode === 'qr' || mode === 'mixed') {
                populateTvQrSelect(document.getElementById('tv-qr-select')?.value || '');
            }
        });
        applyTvModeVisibility(modeSelect.value || 'mixed');
    }

    // Actualizar QRs al entrar a la pestaña TV
    document.querySelector('.admin-internal-btn[data-subtab="tv"]')?.addEventListener('click', () => {
        setTimeout(() => {
            populateTvQrSelect(document.getElementById('tv-qr-select')?.value || '');
            const currentMode = document.getElementById('tv-mode')?.value || 'mixed';
            applyTvModeVisibility(currentMode);
        }, 100);
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const id = document.getElementById('tv-id').value || createTvId();
        const name = document.getElementById('tv-name').value.trim();
        const mode = document.getElementById('tv-mode').value;
        const categoryId = document.getElementById('tv-category').value;
        const categoryName = document.getElementById('tv-category').selectedOptions?.[0]?.textContent || 'Todas las categorías';
        const productCount = Math.max(1, Math.min(50, parseInt(document.getElementById('tv-product-count').value || '8', 10)));
        const slideSecondsProducts = Math.max(3, Math.min(60, parseInt(document.getElementById('tv-slide-seconds').value || '10', 10)));
        const slideSecondsMixed = Math.max(5, Math.min(120, parseInt(document.getElementById('tv-mixed-transition-seconds')?.value || '12', 10)));
        const slideSeconds = mode === 'mixed' ? slideSecondsMixed : slideSecondsProducts;
        const showPrice = document.getElementById('tv-show-price').checked;
        const showOffer = document.getElementById('tv-show-offer').checked;
        let promoText = document.getElementById('tv-promo-text').value.trim();
        let qrId = document.getElementById('tv-qr-select')?.value || '';
        let qrUrl = '';
        let qrSize = 400;
        
        if (qrId) {
            const qrs = getActiveQrConfigs();
            const selectedQr = qrs.find(qr => qr.id === qrId);
            if (selectedQr) {
                qrUrl = selectedQr.url;
                qrSize = selectedQr.size || 400;
            }
        }
        let tickerEnabled = document.getElementById('tv-ticker-enabled')?.checked !== false;
        const tickerSpeed = document.getElementById('tv-ticker-speed')?.value || 'normal';
        const tickerFontSize = document.getElementById('tv-ticker-font-size')?.value || '28px';
        const tickerTextColor = document.getElementById('tv-ticker-text-color')?.value || '#ffec67';
        const tickerBgColor = document.getElementById('tv-ticker-bg-color')?.value || '#000000';
        const active = document.getElementById('tv-active').checked;
        
        if ((mode === 'qr' || mode === 'mixed') && !qrId) {
            if (typeof showModal === 'function') {
                showModal('Error', 'Debes seleccionar un QR configurado para este modo. Ve a la pestaña "QR" para crear uno.', 'error');
            }
            return;
        }

        // Limpiar valores que no aplican según modo para evitar confusiones
        if (mode === 'qr') {
            // En modo QR: limpiar texto promocional y desactivar ticker (QR es solo QR)
            promoText = '';
            tickerEnabled = false;
        } else if (mode !== 'mixed') {
            // Si NO es QR: limpiar valores de QR
            qrId = '';
            qrUrl = '';
            qrSize = 400;
        }

        if (!name) {
            if (typeof showModal === 'function') {
                showModal('Error', 'Debes escribir un nombre para el TV.', 'error');
            }
            return;
        }

        const mixedTransitionSeconds = mode === 'mixed' ? Math.max(5, Math.min(120, parseInt(document.getElementById('tv-mixed-transition-seconds')?.value || '12', 10))) : undefined;
        const screenOrientation = getTvConfigs().find(t => t.id === id)?.screenOrientation || 'landscape';

        const tvPayload = {
            id,
            name,
            mode,
            categoryId,
            categoryName: categoryId ? categoryName : 'Todas',
            productCount,
            slideSeconds,
            mixedTransitionSeconds,
            showPrice,
            showOffer,
            promoText,
            qrId,
            qrUrl,
            qrSize,
            tickerEnabled,
            tickerSpeed,
            tickerFontSize,
            tickerTextColor,
            tickerBgColor,
            screenOrientation,
            active,
            updatedAt: Date.now()
        };

        const tvConfigs = getTvConfigs();
        const existingIndex = tvConfigs.findIndex(item => item.id === id);
        if (existingIndex >= 0) {
            tvConfigs[existingIndex] = tvPayload;
        } else {
            tvConfigs.push(tvPayload);
        }

        try {
            await saveTvConfigs(tvConfigs);
            await hydrateTvConfigsFromSupabase();
        console.log('💾 [Admin] TV guardado con payload completo:', JSON.stringify(tvPayload, null, 2));
        console.log('💾 [Admin] Ticker config:', {
            enabled: tvPayload.tickerEnabled,
            speed: tvPayload.tickerSpeed,
            fontSize: tvPayload.tickerFontSize,
            textColor: tvPayload.tickerTextColor,
            bgColor: tvPayload.tickerBgColor
        });
        renderTvList();
            refreshPublicTvSyncStatus();
        resetTvForm();
        } catch (_error) {
            // Error ya reportado en saveTvConfigs
        }
    });
}

function getPromotionConfig() {
    const fallback = {
        enabled: false,
        text: '',
        speed: 'normal',
        fontSize: '14px',
        textColor: '#ffffff',
        bgColor: '#1f318a',
        linkEnabled: false,
        url: ''
    };
    try {
        const raw = localStorage.getItem(PROMO_STORAGE_KEY);
        if (!raw) {
            console.log('⚠️ [Admin] No hay configuración de promoción en localStorage');
            return fallback;
        }
        const parsed = JSON.parse(raw);
        console.log('📋 [Admin] Configuración leída de localStorage:', parsed);
        const config = {
            enabled: Boolean(parsed.enabled) || Boolean(String(parsed.text || '').trim()),
            text: String(parsed.text || ''),
            speed: ['slow', 'normal', 'fast'].includes(parsed.speed) ? parsed.speed : 'normal',
            fontSize: String(parsed.fontSize || '14px'),
            textColor: String(parsed.textColor || '#ffffff'),
            bgColor: String(parsed.bgColor || '#1f318a'),
            linkEnabled: Boolean(parsed.linkEnabled),
            url: String(parsed.url || '')
        };
        console.log('📋 [Admin] Configuración procesada:', config);
        return config;
    } catch (error) {
        console.error('❌ [Admin] Error leyendo configuración de promoción:', error);
        return fallback;
    }
}

function savePromotionConfig(config) {
    const normalizedText = String(config.text || '').trim();
    const savedConfig = {
        // Si hay texto, se considera activa para evitar que no aparezca por error de checkbox.
        enabled: Boolean(normalizedText) || Boolean(config.enabled),
        text: normalizedText,
        speed: ['slow', 'normal', 'fast'].includes(config.speed) ? config.speed : 'normal',
        fontSize: String(config.fontSize || '14px'),
        textColor: String(config.textColor || '#ffffff'),
        bgColor: String(config.bgColor || '#1f318a'),
        linkEnabled: Boolean(config.linkEnabled),
        url: String(config.url || '').trim(),
        updatedAt: Date.now()
    };
    
    localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(savedConfig));
    console.log('💾 [Admin] Promoción guardada en localStorage:', savedConfig);
    console.log('💾 [Admin] Verificación:', localStorage.getItem(PROMO_STORAGE_KEY));
}

function initPromotionTab() {
    const form = document.getElementById('promotion-form');
    if (!form) return;

    const enabledInput = document.getElementById('promo-enabled');
    const textInput = document.getElementById('promo-text');
    const speedInput = document.getElementById('promo-speed');
    const fontSizeInput = document.getElementById('promo-font-size');
    const textColorInput = document.getElementById('promo-text-color');
    const bgColorInput = document.getElementById('promo-bg-color');
    const linkEnabledInput = document.getElementById('promo-link-enabled');
    const urlGroup = document.getElementById('promo-url-group');
    const urlInput = document.getElementById('promo-url');
    const resetBtn = document.getElementById('promo-reset-btn');
    const previewText = document.getElementById('promo-preview-text');
    const previewBox = document.getElementById('promo-preview-box');

    const applyFormFromConfig = (config) => {
        if (enabledInput) enabledInput.checked = config.enabled !== false;
        textInput.value = config.text || '';
        speedInput.value = config.speed || 'normal';
        if (fontSizeInput) fontSizeInput.value = config.fontSize || '14px';
        if (textColorInput) textColorInput.value = config.textColor || '#ffffff';
        if (bgColorInput) bgColorInput.value = config.bgColor || '#1f318a';
        linkEnabledInput.checked = config.linkEnabled || false;
        urlInput.value = config.url || '';
        urlGroup.style.display = config.linkEnabled ? 'block' : 'none';
        updatePromotionPreview();
    };

    const updatePromotionPreview = () => {
        const text = textInput.value.trim() || 'Sin texto de promoción...';
        const speed = speedInput.value;
        const fontSize = fontSizeInput ? fontSizeInput.value : '14px';
        const textColor = textColorInput ? textColorInput.value : '#ffffff';
        const bgColor = bgColorInput ? bgColorInput.value : '#1f318a';
        
        const durationBySpeed = {
            slow: '30s',    // Lento: 30 segundos
            normal: '20s',  // Normal: 20 segundos
            fast: '12s'     // Rápido: 12 segundos
        };
        
        previewText.textContent = `  ${text}   •   ${text}   •   ${text}  `;
        previewText.style.fontSize = fontSize;
        previewText.style.color = textColor;
        if (previewBox) {
            previewBox.style.backgroundColor = bgColor;
        }
        previewText.style.animation = 'none';
        previewText.offsetHeight; // force reflow
        previewText.style.animation = `promoPreviewMarquee ${durationBySpeed[speed] || '20s'} linear infinite`;
    };

    applyFormFromConfig(getPromotionConfig());

    linkEnabledInput.addEventListener('change', () => {
        urlGroup.style.display = linkEnabledInput.checked ? 'block' : 'none';
    });

    textInput.addEventListener('input', () => {
        // Ayuda visual: si hay texto, activamos el check para evitar confusión.
        if (enabledInput) enabledInput.checked = textInput.value.trim().length > 0;
        updatePromotionPreview();
    });
    speedInput.addEventListener('change', updatePromotionPreview);
    if (fontSizeInput) fontSizeInput.addEventListener('change', updatePromotionPreview);
    if (textColorInput) textColorInput.addEventListener('input', updatePromotionPreview);
    if (bgColorInput) bgColorInput.addEventListener('input', updatePromotionPreview);

    resetBtn.addEventListener('click', () => {
        const defaults = {
            enabled: false,
            text: '',
            speed: 'normal',
            fontSize: '14px',
            textColor: '#ffffff',
            bgColor: '#1f318a',
            linkEnabled: false,
            url: ''
        };
        applyFormFromConfig(defaults);
        savePromotionConfig(defaults);
        if (typeof showModal === 'function') {
            showModal('Listo', 'Configuración de promoción restablecida.', 'info');
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const promoText = textInput.value.trim();
        const fontSizeInput = document.getElementById('promo-font-size');
        const textColorInput = document.getElementById('promo-text-color');
        const bgColorInput = document.getElementById('promo-bg-color');
        const enabledToggle = document.getElementById('promo-enabled');
        
        const config = {
            // Publicar siempre que exista texto.
            enabled: enabledToggle ? enabledToggle.checked && promoText.length > 0 : promoText.length > 0,
            text: promoText,
            speed: speedInput.value || 'normal',
            fontSize: fontSizeInput ? fontSizeInput.value : '14px',
            textColor: textColorInput ? textColorInput.value : '#ffffff',
            bgColor: bgColorInput ? bgColorInput.value : '#1f318a',
            linkEnabled: linkEnabledInput.checked,
            url: urlInput.value.trim()
        };
        
        console.log('💾 [Admin] Guardando configuración de promoción:', config);

        if (!config.text) {
            if (typeof showModal === 'function') {
                showModal('Error', 'Debes escribir un texto de promoción.', 'error');
            }
            return;
        }

        if (config.linkEnabled && config.url) {
            try {
                new URL(config.url);
            } catch {
                if (typeof showModal === 'function') {
                    showModal('Error', 'La URL de promoción no es válida.', 'error');
                }
                return;
            }
        }

        savePromotionConfig(config);
        
        // Actualizar vista previa con los valores guardados
        updatePromotionPreview();
        
        // Verificar que se guardó correctamente
        const saved = getPromotionConfig();
        console.log('✅ [Admin] Promoción guardada:', config);
        console.log('✅ [Admin] Verificación lectura después de guardar:', saved);
        console.log('✅ [Admin] localStorage actualizado:', localStorage.getItem(PROMO_STORAGE_KEY));
        
        // Comparar valores guardados vs leídos
        if (saved.fontSize !== config.fontSize || saved.textColor !== config.textColor || saved.bgColor !== config.bgColor) {
            console.error('❌ [Admin] INCONSISTENCIA: Los valores guardados no coinciden con los leídos!');
            console.error('❌ [Admin] Guardado:', { fontSize: config.fontSize, textColor: config.textColor, bgColor: config.bgColor });
            console.error('❌ [Admin] Leído:', { fontSize: saved.fontSize, textColor: saved.textColor, bgColor: saved.bgColor });
        } else {
            console.log('✅ [Admin] Valores guardados y leídos coinciden correctamente');
        }

        if (typeof showModal === 'function') {
            showModal('Éxito', 'Promoción guardada correctamente. La barra promocional aparecerá en la página principal.', 'success');
        }
    });
}

function switchTab(tabName) {
    // Actualizar tabs principales
    document.querySelectorAll('.admin-tab[data-tab]').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.admin-tab[data-tab="${tabName}"]`)?.classList.add('active');

    // Actualizar contenido
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-content`)?.classList.add('active');
    
    // Mostrar/ocultar navegación interna según la pestaña principal
    const internalNav = document.getElementById('admin-internal-nav');
    if (tabName === 'admin' && internalNav) {
        internalNav.style.display = 'flex';
        // Activar la primera subpestaña por defecto
        if (!document.querySelector('.admin-internal-btn.active')) {
            switchSubTab('inventory');
        }
    } else if (internalNav) {
        internalNav.style.display = 'none';
    }
}

function switchSubTab(subtabName) {
    // Actualizar botones internos
    document.querySelectorAll('.admin-internal-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.admin-internal-btn[data-subtab="${subtabName}"]`)?.classList.add('active');

    // Actualizar contenido de subpestañas
    document.querySelectorAll('.admin-subcontent').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${subtabName}-content`)?.classList.add('active');
    
    // Cargar categorías si es la subpestaña de agregar producto
    if (subtabName === 'add-product') {
        loadCategoriesForProductForm();
        loadLocationsForProductForm();
    } else if (subtabName === 'tv') {
        populateTvCategorySelect();
        renderTvList();
    } else if (subtabName === 'delivery') {
        initDeliveryTab();
    } else if (subtabName === 'currency') {
        initRemesasManagement();
    } else if (subtabName === 'settings') {
        initSettingsTab();
    }
}

async function loadProducts() {
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--gray-text);"></i>
                <p style="margin-top: 15px; color: var(--gray-text);">Cargando productos e inventario...</p>
            </td>
        </tr>
    `;

    try {
        // Esperar a que se carguen los productos de Square
        await waitForSquareProducts();
        
        // Obtener todos los productos
        allProducts = squareProducts.filter(product => {
            const itemData = product.item_data;
            if (!itemData) return false;
            const name = itemData.name?.toLowerCase() || '';
            // Excluir Remesa del inventario
            if (name.includes('remesa')) return false;
            return true;
        });

        console.log('📦 Productos cargados:', allProducts.length);

        // Obtener inventario para todos los productos
        allProductsWithInventory = await Promise.all(
            allProducts.map(async (product) => {
                const itemData = product.item_data;
                const variation = itemData?.variations?.[0];
                const variationId = variation?.id;

                let inventory = { quantity: null, available: true };
                if (variationId && typeof getProductInventory === 'function') {
                    try {
                        const inv = await getProductInventory(variationId);
                        if (inv) {
                            inventory = {
                                quantity: inv.quantity || 0,
                                available: inv.quantity > 0 && inv.state !== 'NONE'
                            };
                        }
                    } catch (e) {
                        console.warn('Error obteniendo inventario para', variationId, e);
                    }
                }

                // Obtener información del proveedor
                const supplierInfo = getSupplierInfo(product.id, variationId);

                return {
                    product,
                    itemData,
                    variation,
                    variationId,
                    inventory,
                    supplierInfo
                };
            })
        );

        console.log('✅ Inventario cargado para', allProductsWithInventory.length, 'productos');

        // Actualizar estadísticas
        updateStats();

        // Renderizar tabla
        await renderProductsTable(allProductsWithInventory);

        // Verificar en segundo plano si el proveedor sigue abasteciendo
        // los productos que tienen URL de compra.
        refreshSuppliersAvailability(allProductsWithInventory).catch((error) => {
            console.warn('⚠️ Error verificando disponibilidad de proveedores:', error);
        });
    } catch (error) {
        console.error('Error cargando productos:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--red-badge);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; margin-bottom: 15px;"></i>
                    <p>Error cargando productos. Por favor, recarga la página.</p>
                </td>
            </tr>
        `;
    }
}

async function waitForSquareProducts() {
    return new Promise((resolve) => {
        if (typeof squareProducts !== 'undefined' && squareProducts.length > 0) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (typeof squareProducts !== 'undefined' && squareProducts.length > 0) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout después de 10 segundos
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        }
    });
}

function getSupplierInfo(productId, variationId) {
    const variationKey = variationId || '';
    const productKey = productId || '';
    return suppliersData[variationKey] || suppliersData[productKey] || null;
}

function setSupplierInfo(productId, variationId, supplierData) {
    const key = variationId || productId;
    const normalized = {
        ...supplierData,
        productId,
        variationId: variationId || null,
        mappingKey: key,
        supplyStatus: supplierData.supplyStatus || 'unknown',
        supplyMessage: supplierData.supplyMessage || '',
        supplyCheckedAt: supplierData.supplyCheckedAt || null,
        updatedAt: new Date().toISOString()
    };
    suppliersData[key] = normalized;
    if (productId) {
        suppliersData[productId] = {
            ...normalized,
            mappingKey: productId
        };
    }
    saveSuppliersData();
}

function getSupplierAvailabilityLabel(supplierInfo) {
    const status = String(supplierInfo?.supplyStatus || 'unknown');
    if (status === 'unavailable') {
        return '<span style="display:inline-block;margin-top:6px;padding:2px 8px;border-radius:10px;background:#ffebee;color:#c62828;font-size:11px;font-weight:700;">No abastecible</span>';
    }
    if (status === 'available') {
        return '<span style="display:inline-block;margin-top:6px;padding:2px 8px;border-radius:10px;background:#e8f5e9;color:#2e7d32;font-size:11px;font-weight:700;">Disponible proveedor</span>';
    }
    return '<span style="display:inline-block;margin-top:6px;padding:2px 8px;border-radius:10px;background:#fff8e1;color:#f57c00;font-size:11px;font-weight:700;">Sin verificar</span>';
}

function isSupplierCheckStale(supplierInfo) {
    if (!supplierInfo?.purchaseUrl) return false;
    const checkedAt = Number(supplierInfo.supplyCheckedAt || 0);
    if (!checkedAt) return true;
    return (Date.now() - checkedAt) > SUPPLIER_CHECK_INTERVAL_MS;
}

async function checkSupplierAvailabilityForItem(productData, force = false) {
    const supplierInfo = productData?.supplierInfo;
    if (!supplierInfo?.purchaseUrl) return false;
    if (!force && !isSupplierCheckStale(supplierInfo)) return false;

    const url = supplierInfo.purchaseUrl;
    const key = productData?.variationId || productData?.product?.id;
    if (!key) return false;

    let nextStatus = 'unknown';
    let nextMessage = '';
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, { cache: 'no-store' });

        if (!response.ok) {
            nextStatus = 'unavailable';
            nextMessage = `HTTP ${response.status}`;
        } else {
            const html = String(await response.text() || '').toLowerCase();
            const hasOutOfStock = SUPPLIER_OOS_PATTERNS.some(pattern => html.includes(pattern));
            if (hasOutOfStock) {
                nextStatus = 'unavailable';
                nextMessage = 'Proveedor indica agotado/no disponible';
            } else {
                nextStatus = 'available';
                nextMessage = '';
            }
        }
    } catch (error) {
        nextStatus = 'unknown';
        nextMessage = `Sin verificación (${error?.message || 'error'})`;
    }

    const updatedSupplier = {
        ...supplierInfo,
        supplyStatus: nextStatus,
        supplyMessage: nextMessage,
        supplyCheckedAt: Date.now(),
        updatedAt: new Date().toISOString()
    };

    suppliersData[key] = {
        ...updatedSupplier,
        mappingKey: key
    };
    if (updatedSupplier.productId) {
        suppliersData[updatedSupplier.productId] = {
            ...updatedSupplier,
            mappingKey: updatedSupplier.productId
        };
    }
    localStorage.setItem('tropiplus_suppliers', JSON.stringify(suppliersData));
    productData.supplierInfo = updatedSupplier;
    return true;
}

async function refreshSuppliersAvailability(products) {
    if (!Array.isArray(products) || products.length === 0) return;
    const candidates = products.filter(p => p?.supplierInfo?.purchaseUrl);
    if (candidates.length === 0) return;

    let changed = false;
    for (const item of candidates) {
        const itemChanged = await checkSupplierAvailabilityForItem(item, false);
        if (itemChanged) changed = true;
    }

    if (changed) {
        await renderProductsTable(allProductsWithInventory);
        updateStats();
    }
}

function updateStats() {
    const totalProducts = allProductsWithInventory.length;
    const lowStock = allProductsWithInventory.filter(p => 
        p.inventory.quantity !== null && 
        p.inventory.quantity > 0 && 
        p.inventory.quantity < 10
    ).length;
    const outOfStock = allProductsWithInventory.filter(p => 
        p.inventory.quantity === 0 || !p.inventory.available
    ).length;
    const withSupplier = allProductsWithInventory.filter(p => p.supplierInfo).length;

    document.getElementById('total-products').textContent = totalProducts;
    document.getElementById('low-stock-count').textContent = lowStock;
    document.getElementById('out-of-stock-count').textContent = outOfStock;
    document.getElementById('with-supplier-count').textContent = withSupplier;
}

async function renderProductsTable(products) {
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) return;

    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-text);">
                    No se encontraron productos.
                </td>
            </tr>
        `;
        return;
    }

    // Renderizar productos con imágenes
    const rows = await Promise.all(products.map(async (productData) => {
        const { product, itemData, variation, inventory, supplierInfo, variationId } = productData;
        const productName = itemData?.name || 'Producto sin nombre';
        const stockQuantity = inventory.quantity !== null ? inventory.quantity : 'N/A';
        const stockClass = getStockClass(inventory.quantity, inventory.available);
        const stockText = getStockText(inventory.quantity, inventory.available);
        
        // Obtener imagen del producto
        let productImageUrl = 'images/placeholder.svg';
        if (itemData?.image_ids && itemData.image_ids.length > 0) {
            try {
                // Intentar obtener la imagen desde square-integration.js
                if (typeof window.getCachedProductImageUrl === 'function') {
                    const imgUrl = await window.getCachedProductImageUrl(itemData.image_ids[0]);
                    if (imgUrl && imgUrl !== 'images/placeholder.svg') {
                        productImageUrl = imgUrl;
                    }
                } else if (typeof getCachedProductImageUrl === 'function') {
                    const imgUrl = await getCachedProductImageUrl(itemData.image_ids[0]);
                    if (imgUrl && imgUrl !== 'images/placeholder.svg') {
                        productImageUrl = imgUrl;
                    }
                }
            } catch (e) {
                console.warn('Error obteniendo imagen del producto:', e);
            }
        }
        // Fallback: imagen externa guardada en la relación producto/proveedor
        if ((!itemData?.image_ids || itemData.image_ids.length === 0) && supplierInfo?.imageUrl) {
            productImageUrl = supplierInfo.imageUrl;
        }

        return `
            <tr>
                <td style="text-align: center; padding: 10px;">
                    <img src="${productImageUrl}" alt="${productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 2px solid var(--gray-border);" onerror="this.src='images/placeholder.svg'">
                </td>
                <td>
                    <strong>${productName}</strong>
                    ${variation ? `<br><small style="color: var(--gray-text);">Variación: ${variation.item_variation_data?.name || 'N/A'}</small>` : ''}
                </td>
                <td>
                    <span class="stock-badge ${stockClass}">${stockText}</span>
                    ${inventory.quantity !== null ? `<br><small style="color: var(--gray-text); margin-top: 4px; display: block;">Cantidad: ${inventory.quantity}</small>` : ''}
                </td>
                <td>
                    ${supplierInfo ? `
                        <div class="supplier-info">
                            <span class="supplier-name">${supplierInfo.name || 'Sin nombre'}</span>
                            ${supplierInfo.url ? `<a href="${supplierInfo.url}" target="_blank" class="supplier-url"><i class="fas fa-external-link-alt"></i></a>` : ''}
                        </div>
                    ` : '<span class="no-supplier">Sin proveedor</span>'}
                </td>
                <td>
                    ${supplierInfo?.purchaseUrl ? `
                        <a href="${supplierInfo.purchaseUrl}" target="_blank" class="supplier-url" style="${supplierInfo.supplyStatus === 'unavailable' ? 'color:#c62828;font-weight:700;' : ''}">
                            <i class="fas fa-shopping-cart"></i> Ver producto
                        </a>
                        ${getSupplierAvailabilityLabel(supplierInfo)}
                        ${supplierInfo?.supplyMessage ? `<div style="margin-top:4px;font-size:11px;color:${supplierInfo.supplyStatus === 'unavailable' ? '#c62828' : '#757575'};">${supplierInfo.supplyMessage}</div>` : ''}
                    ` : '<span class="no-supplier">-</span>'}
                </td>
                <td>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn-edit-product" onclick="editProduct('${product.id}', '${variationId || ''}')" style="background: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            <i class="fas fa-edit"></i> Editar Producto
                        </button>
                        <button class="btn-edit-supplier" onclick="openSupplierModal('${product.id}', '${variationId || ''}')">
                            <i class="fas fa-truck"></i> ${supplierInfo ? 'Editar' : 'Agregar'} Proveedor
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }));

    tableBody.innerHTML = rows.join('');
}

function getStockClass(quantity, available) {
    if (quantity === null) return 'medium';
    if (quantity === 0 || !available) return 'out';
    if (quantity < 10) return 'low';
    if (quantity < 50) return 'medium';
    return 'high';
}

function getStockText(quantity, available) {
    if (quantity === null) return 'N/A';
    if (quantity === 0 || !available) return 'AGOTADO';
    if (quantity < 10) return `Bajo (${quantity})`;
    if (quantity < 50) return `Medio (${quantity})`;
    return `Alto (${quantity})`;
}

async function filterProducts() {
    const searchTerm = document.getElementById('product-search')?.value.trim() || '';
    const stockFilter = document.getElementById('stock-filter')?.value || 'all';

    let filtered = allProductsWithInventory;

    // Filtrar por búsqueda - buscar en Square API si hay término de búsqueda
    if (searchTerm) {
        try {
            // Buscar en Square API por nombre, SKU, GTIN, etc.
            const searchResults = await searchProductsInSquare(searchTerm);
            
            if (searchResults.length > 0) {
                // Filtrar productos que coincidan con los resultados de Square
                const searchResultIds = new Set(searchResults.map(r => r.id));
                filtered = filtered.filter(p => searchResultIds.has(p.product.id));
            } else {
                // Si no hay resultados en Square, buscar localmente por nombre
                const searchLower = searchTerm.toLowerCase();
                filtered = filtered.filter(p => {
                    const name = p.itemData?.name?.toLowerCase() || '';
                    const variationName = p.variation?.item_variation_data?.name?.toLowerCase() || '';
                    const sku = p.variation?.item_variation_data?.sku?.toLowerCase() || '';
                    const price = p.variation?.item_variation_data?.price_money?.amount || 0;
                    const priceStr = (price / 100).toString();
                    
                    return name.includes(searchLower) || 
                           variationName.includes(searchLower) ||
                           sku.includes(searchLower) ||
                           priceStr.includes(searchLower);
                });
            }
        } catch (error) {
            console.error('Error buscando en Square API:', error);
            // Fallback a búsqueda local
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(p => {
                const name = p.itemData?.name?.toLowerCase() || '';
                return name.includes(searchLower);
            });
        }
    }

    // Filtrar por stock
    switch (stockFilter) {
        case 'low':
            filtered = filtered.filter(p => 
                p.inventory.quantity !== null && 
                p.inventory.quantity > 0 && 
                p.inventory.quantity < 10
            );
            break;
        case 'out':
            filtered = filtered.filter(p => 
                p.inventory.quantity === 0 || !p.inventory.available
            );
            break;
        case 'with-supplier':
            filtered = filtered.filter(p => p.supplierInfo);
            break;
        case 'without-supplier':
            filtered = filtered.filter(p => !p.supplierInfo);
            break;
    }

    await renderProductsTable(filtered);
}

function initSupplierModal() {
    const modal = document.getElementById('supplier-modal');
    const form = document.getElementById('supplier-form');
    const cancelBtn = document.getElementById('supplier-cancel-btn');
    const globalSupplierForm = document.getElementById('global-supplier-form');
    const supplierSelect = document.getElementById('supplier-global-select');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            closeSupplierModal();
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSupplier();
        });
    }

    if (supplierSelect) {
        supplierSelect.addEventListener('change', onGlobalSupplierSelect);
    }

    if (globalSupplierForm) {
        globalSupplierForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveGlobalSupplier();
        });
    }

    // Cerrar al hacer clic fuera del modal
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSupplierModal();
            }
        });
    }

    // Cargar lista de proveedores globales al cambiar de tab
    const suppliersTab = document.querySelector('.admin-tab[data-tab="suppliers"]');
    if (suppliersTab) {
        suppliersTab.addEventListener('click', async () => {
            await renderGlobalSuppliersList();
        });
    }
}

async function saveGlobalSupplier() {
    const form = document.getElementById('global-supplier-form');
    const editingId = form.dataset.editingId;
    const name = document.getElementById('global-supplier-name').value.trim();
    const address = document.getElementById('global-supplier-address').value.trim();
    const url = document.getElementById('global-supplier-url').value.trim();
    const notes = document.getElementById('global-supplier-notes').value.trim();

    if (!name) {
        if (typeof showModal === 'function') {
            showModal('Error', 'El nombre del proveedor es requerido.', 'error');
        } else {
            alert('El nombre del proveedor es requerido.');
        }
        return;
    }

    const supplierData = {
        name: name,
        address: address,
        url: url,
        notes: notes
    };

    try {
        if (editingId && globalSuppliers[editingId]) {
            // Actualizar proveedor existente
            supplierData.id = editingId;
            
            // Guardar en Supabase primero
            if (typeof window.saveSupplierToSupabase === 'function') {
                await window.saveSupplierToSupabase(supplierData);
            }
            
            // Actualizar en memoria local
            globalSuppliers[editingId] = {
                ...globalSuppliers[editingId],
                ...supplierData,
                updatedAt: new Date().toISOString()
            };
            await saveSuppliersData();
            await renderGlobalSuppliersList();
            loadGlobalSuppliersDropdown();
            
            // Limpiar formulario
            form.reset();
            delete form.dataset.editingId;
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Guardar Proveedor';
            }

            if (typeof showModal === 'function') {
                showModal('Éxito', 'Proveedor actualizado correctamente.', 'success');
            }
        } else {
            // Crear nuevo proveedor
            supplierData.createdAt = new Date().toISOString();
            
            // Guardar en Supabase primero
            let savedSupplier = null;
            if (typeof window.saveSupplierToSupabase === 'function') {
                savedSupplier = await window.saveSupplierToSupabase(supplierData);
            }
            
            // Si Supabase retornó un ID, usarlo; si no, generar uno local
            const supplierId = savedSupplier?.id || `supplier_${Date.now()}`;
            globalSuppliers[supplierId] = {
                ...supplierData,
                id: supplierId,
                createdAt: savedSupplier?.created_at || supplierData.createdAt,
                updatedAt: savedSupplier?.updated_at || new Date().toISOString()
            };
            
            await saveSuppliersData();
            await renderGlobalSuppliersList();
            loadGlobalSuppliersDropdown();

            if (typeof showModal === 'function') {
                showModal('Éxito', 'Proveedor guardado correctamente. Ahora puedes seleccionarlo al asignar proveedores a productos.', 'success');
            } else {
                alert('Proveedor guardado correctamente.');
            }
        }
    } catch (error) {
        console.error('Error guardando proveedor:', error);
        if (typeof showModal === 'function') {
            showModal('Error', `Error al guardar proveedor: ${error.message}`, 'error');
        } else {
            alert(`Error al guardar proveedor: ${error.message}`);
        }
    }
}

async function renderGlobalSuppliersList() {
    const listContainer = document.getElementById('global-suppliers-list');
    if (!listContainer) {
        console.warn('⚠️ Contenedor de proveedores no encontrado');
        return;
    }

    // Asegurar que los datos estén cargados (ahora es async)
    await loadSuppliersData();
    
    const suppliers = getGlobalSuppliersList();
    console.log('📦 Proveedores encontrados:', suppliers.length, suppliers);

    if (suppliers.length === 0) {
        listContainer.innerHTML = `
            <p style="text-align: center; padding: 40px; color: var(--gray-text);">
                <i class="fas fa-truck" style="font-size: 48px; margin-bottom: 15px; display: block; opacity: 0.3;"></i>
                No hay proveedores guardados. Agrega uno usando el formulario de arriba.
            </p>
        `;
        return;
    }

    listContainer.innerHTML = `
        <div style="display: grid; gap: 12px; max-width: 700px; margin: 0 auto;">
            ${suppliers.map(supplier => `
                <div style="border: 2px solid var(--gray-border); border-radius: 8px; padding: 15px; background: var(--gray-light);">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 8px 0; color: var(--dark-blue-nav); font-size: 16px;">${supplier.name}</h4>
                            ${supplier.address ? `<p style="margin: 4px 0; color: var(--gray-text); font-size: 13px;"><i class="fas fa-map-marker-alt"></i> ${supplier.address}</p>` : ''}
                            ${supplier.url ? `<p style="margin: 4px 0; font-size: 13px;"><a href="${supplier.url}" target="_blank" style="color: var(--green-categories); text-decoration: none;"><i class="fas fa-external-link-alt"></i> ${supplier.url}</a></p>` : ''}
                            ${supplier.notes ? `<p style="margin: 8px 0 0 0; color: var(--gray-text); font-style: italic; font-size: 12px;">${supplier.notes}</p>` : ''}
                        </div>
                        <div style="display: flex; gap: 8px; margin-left: 15px;">
                            <button onclick="editGlobalSupplier('${supplier.id}')" style="background: var(--green-categories); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap;">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button onclick="deleteGlobalSupplier('${supplier.id}')" style="background: var(--red-badge); color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap;">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function deleteGlobalSupplier(supplierId) {
    if (confirm('¿Estás seguro de que deseas eliminar este proveedor?')) {
        try {
            // Eliminar de Supabase primero
            if (typeof window.deleteSupplierFromSupabase === 'function') {
                await window.deleteSupplierFromSupabase(supplierId);
            }
            
            // Eliminar de memoria local
            delete globalSuppliers[supplierId];
            await saveSuppliersData();
            await renderGlobalSuppliersList();
            
            if (typeof showModal === 'function') {
                showModal('Éxito', 'Proveedor eliminado correctamente.', 'success');
            }
        } catch (error) {
            console.error('Error eliminando proveedor:', error);
            if (typeof showModal === 'function') {
                showModal('Error', `Error al eliminar proveedor: ${error.message}`, 'error');
            }
        }
    }
}

function editGlobalSupplier(supplierId) {
    const supplier = globalSuppliers[supplierId];
    if (!supplier) {
        if (typeof showModal === 'function') {
            showModal('Error', 'Proveedor no encontrado.', 'error');
        }
        return;
    }

    // Llenar el formulario con los datos del proveedor
    document.getElementById('global-supplier-name').value = supplier.name || '';
    document.getElementById('global-supplier-address').value = supplier.address || '';
    document.getElementById('global-supplier-url').value = supplier.url || '';
    document.getElementById('global-supplier-notes').value = supplier.notes || '';

    // Guardar el ID del proveedor que se está editando
    const form = document.getElementById('global-supplier-form');
    form.dataset.editingId = supplierId;

    // Cambiar el texto del botón
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Actualizar Proveedor';
    }

    // Scroll al formulario
    document.querySelector('.global-supplier-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEditGlobalSupplier() {
    const form = document.getElementById('global-supplier-form');
    form.reset();
    delete form.dataset.editingId;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Guardar Proveedor';
    }
}

window.deleteGlobalSupplier = deleteGlobalSupplier;
window.editGlobalSupplier = editGlobalSupplier;
window.cancelEditGlobalSupplier = cancelEditGlobalSupplier;

function openSupplierModal(productId, variationId) {
    const modal = document.getElementById('supplier-modal');
    const form = document.getElementById('supplier-form');
    
    if (!modal || !form) return;

    // Guardar IDs
    document.getElementById('supplier-product-id').value = productId;
    document.getElementById('supplier-variation-id').value = variationId;

    // Cargar datos existentes
    const supplierInfo = getSupplierInfo(productId, variationId);
    if (supplierInfo) {
        document.getElementById('supplier-name').value = supplierInfo.name || '';
        document.getElementById('supplier-address').value = supplierInfo.address || '';
        document.getElementById('supplier-url').value = supplierInfo.url || '';
        document.getElementById('supplier-purchase-url').value = supplierInfo.purchaseUrl || '';
        document.getElementById('supplier-notes').value = supplierInfo.notes || '';
    } else {
        form.reset();
        document.getElementById('supplier-product-id').value = productId;
        document.getElementById('supplier-variation-id').value = variationId;
    }

    // Cargar lista de proveedores globales en el dropdown
    loadGlobalSuppliersDropdown();

    modal.classList.add('active');
}

function loadGlobalSuppliersDropdown() {
    const supplierSelect = document.getElementById('supplier-global-select');
    if (!supplierSelect) return;

    const suppliers = getGlobalSuppliersList();
    supplierSelect.innerHTML = '<option value="">Seleccionar proveedor guardado...</option>';
    
    suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = `${supplier.name}${supplier.url ? ' - ' + supplier.url : ''}`;
        supplierSelect.appendChild(option);
    });
}

function onGlobalSupplierSelect() {
    const supplierSelect = document.getElementById('supplier-global-select');
    if (!supplierSelect || !supplierSelect.value) {
        // Si se deselecciona, limpiar campos
        document.getElementById('supplier-name').value = '';
        document.getElementById('supplier-address').value = '';
        document.getElementById('supplier-url').value = '';
        document.getElementById('supplier-purchase-url').value = '';
        document.getElementById('supplier-notes').value = '';
        return;
    }

    const supplierId = supplierSelect.value;
    const supplier = globalSuppliers[supplierId];
    
    if (supplier) {
        document.getElementById('supplier-name').value = supplier.name || '';
        document.getElementById('supplier-address').value = supplier.address || '';
        document.getElementById('supplier-url').value = supplier.url || '';
        document.getElementById('supplier-purchase-url').value = supplier.purchaseUrl || '';
        document.getElementById('supplier-notes').value = supplier.notes || '';
    }
}

function closeSupplierModal() {
    const modal = document.getElementById('supplier-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function saveSupplier() {
    const productId = document.getElementById('supplier-product-id').value;
    const variationId = document.getElementById('supplier-variation-id').value;
    const name = document.getElementById('supplier-name').value;
    const address = document.getElementById('supplier-address').value;
    const url = document.getElementById('supplier-url').value;
    const purchaseUrl = document.getElementById('supplier-purchase-url').value;
    const notes = document.getElementById('supplier-notes').value;

    if (!name.trim()) {
        if (typeof showModal === 'function') {
            showModal('Error', 'El nombre del proveedor es requerido.', 'error');
        } else {
            alert('El nombre del proveedor es requerido.');
        }
        return;
    }

    const supplierData = {
        name: name.trim(),
        address: address.trim(),
        url: url.trim(),
        purchaseUrl: purchaseUrl.trim(),
        notes: notes.trim(),
        updatedAt: new Date().toISOString()
    };

    setSupplierInfo(productId, variationId, supplierData);

    // Actualizar la tabla
    const productData = allProductsWithInventory.find(p => 
        p.product.id === productId && (p.variationId === variationId || (!p.variationId && !variationId))
    );
    if (productData) {
        productData.supplierInfo = supplierData;
    }

    await renderProductsTable(allProductsWithInventory);
    updateStats();
    closeSupplierModal();

    if (typeof showModal === 'function') {
        showModal('Éxito', 'Información del proveedor guardada correctamente.', 'success');
    } else {
        alert('Información del proveedor guardada correctamente.');
    }
}

// Función para buscar productos en Square API
async function searchProductsInSquare(searchTerm) {
    try {
        const keywords = String(searchTerm || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 3);
        if (keywords.length === 0) {
            return [];
        }

        // Buscar por texto (nombre, descripción, etc.)
        const response = await squareApiCall(
            '/v2/catalog/search',
            'POST',
            {
                object_types: ['ITEM'],
                query: {
                    text_query: {
                        keywords: keywords
                    }
                }
            }
        );
        
        return response.objects || [];
    } catch (error) {
        console.error('Error buscando productos en Square:', error);
        return [];
    }
}

// Función para obtener lista de proveedores globales
function getGlobalSuppliersList() {
    return Object.entries(globalSuppliers).map(([id, supplier]) => ({
        id: id,
        ...supplier
    }));
}

// Función para agregar proveedor global (ahora guarda en Supabase también)
async function addGlobalSupplier(supplierData) {
    try {
        // Guardar en Supabase primero
        let savedSupplier = null;
        if (typeof window.saveSupplierToSupabase === 'function') {
            savedSupplier = await window.saveSupplierToSupabase(supplierData);
        }
        
        // Si Supabase retornó un ID, usarlo; si no, generar uno local
        const supplierId = savedSupplier?.id || `supplier_${Date.now()}`;
        globalSuppliers[supplierId] = {
            ...supplierData,
            id: supplierId,
            createdAt: savedSupplier?.created_at || supplierData.createdAt || new Date().toISOString(),
            updatedAt: savedSupplier?.updated_at || new Date().toISOString()
        };
        await saveSuppliersData();
        return supplierId;
    } catch (error) {
        console.error('Error agregando proveedor:', error);
        // Fallback: guardar solo localmente si Supabase falla
        const supplierId = `supplier_${Date.now()}`;
        globalSuppliers[supplierId] = {
            ...supplierData,
            id: supplierId,
            createdAt: new Date().toISOString()
        };
        await saveSuppliersData();
        return supplierId;
    }
}

function normalizeBarcodeValue(rawValue) {
    if (!rawValue) return '';
    const digits = String(rawValue).replace(/\D/g, '');
    return [8, 12, 13, 14].includes(digits.length) ? digits : '';
}

function setBarcodeLookupStatus(message, type = 'info') {
    const statusEl = document.getElementById('barcode-lookup-status');
    if (!statusEl) return;
    const colors = {
        info: '#616161',
        loading: '#1976d2',
        success: '#2e7d32',
        error: '#c62828'
    };
    statusEl.style.color = colors[type] || colors.info;
    statusEl.innerHTML = message;
}

// Buscar código de barras usando Square Catalog API
async function lookupBarcodeInSquare(productName) {
    try {
        console.log('🔍 Buscando código de barras en Square Catalog:', productName);

        const extractBarcodeFromCatalogObjects = (objects = []) => {
            for (const obj of objects) {
                if (obj?.type === 'ITEM' && obj.item_data?.variations) {
                    for (const variation of obj.item_data.variations) {
                        const variationData = variation?.item_variation_data;
                        if (!variationData) continue;
                        const gtin =
                            variationData.gtin ||
                            variationData.upc ||
                            variationData.ean;
                        const normalized = normalizeBarcodeValue(gtin);
                        if (normalized) {
                            return {
                                barcode: normalized,
                                source: 'Square Catalog API',
                                raw: {
                                    productName: obj.item_data.name,
                                    variationName: variationData.name || 'Default'
                                }
                            };
                        }
                    }
                }
            }
            return null;
        };

        const keywords = String(productName || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 3);

        if (keywords.length > 0) {
            const searchResponse = await squareApiCall(
                '/v2/catalog/search',
                'POST',
                {
                    object_types: ['ITEM'],
                    query: {
                        text_query: {
                            // Square requiere array, no string.
                            keywords
                        }
                    },
                    limit: 10
                }
            );

            const fromSearch = extractBarcodeFromCatalogObjects(searchResponse?.objects || []);
            if (fromSearch?.barcode) {
                console.log('✅ Código encontrado en Square Catalog:', fromSearch.barcode);
                return fromSearch;
            }
        }

        // Fallback a SearchCatalogItems para comportamiento más cercano al buscador del POS.
        const itemsResponse = await squareApiCall(
            '/v2/catalog/search-catalog-items',
            'POST',
            {
                text_filter: String(productName || '').trim(),
                product_types: ['REGULAR'],
                enabled_location_ids: [SQUARE_CONFIG.locationId],
                limit: 10
            }
        );

        if (Array.isArray(itemsResponse?.items)) {
            for (const itemWrapper of itemsResponse.items) {
                const catalogItem = itemWrapper?.item_data || itemWrapper;
                const variations = catalogItem?.variations || [];
                for (const variation of variations) {
                    const variationData = variation?.item_variation_data || variation;
                    const gtin =
                        variationData?.gtin ||
                        variationData?.upc ||
                        variationData?.ean;
                    const normalized = normalizeBarcodeValue(gtin);
                    if (normalized) {
                        const found = {
                            barcode: normalized,
                            source: 'Square Catalog Items API',
                            raw: {
                                productName: catalogItem?.name || productName,
                                variationName: variationData?.name || 'Default'
                            }
                        };
                        console.log('✅ Código encontrado en SearchCatalogItems:', found.barcode);
                        return found;
                    }
                }
            }
        }
        
        return null;
    } catch (error) {
        console.warn('Error buscando en Square Catalog:', error);
        return null;
    }
}

// Configuración para APIs externas de GTIN (RapidAPI)
// Configura tu API key de RapidAPI aquí para usar "Barcodes Data" API
const RAPIDAPI_CONFIG = {
    enabled: true, // Habilitado con credenciales del usuario
    apiKey: '43db5773a3msh2a82d305d0dbf5ap16f958jsna677a7d7e263', // API key de RapidAPI
    host: 'barcodes-data.p.rapidapi.com', // Host de "Barcodes Data" API
    baseUrl: 'https://barcodes-data.p.rapidapi.com/' // URL base de la API
};

/**
 * Calcula la similitud entre dos strings (0-1, donde 1 es idéntico)
 * Usa algoritmo de Levenshtein simplificado
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1;
    
    // Si uno contiene al otro, alta similitud
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Contar palabras comunes
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    const totalWords = Math.max(words1.length, words2.length);
    
    return commonWords.length / totalWords;
}

/**
 * Busca GTIN/UPC/EAN usando "Barcodes Data" API de RapidAPI
 * Esta API permite buscar por nombre de producto o por código de barras
 * Si hay múltiples resultados, selecciona el más relevante basándose en el nombre
 * @param {string} productName - Nombre del producto
 * @returns {Promise<string|null>} - GTIN encontrado o null
 */
async function lookupGtinFromExternalApi(productName) {
    // Si no está habilitado o no hay API key, retornar null
    if (!RAPIDAPI_CONFIG.enabled || !RAPIDAPI_CONFIG.apiKey) {
        return null;
    }

    if (!productName || !productName.trim()) {
        return null;
    }

    try {
        console.log('🔍 Buscando GTIN en Barcodes Data API (RapidAPI):', productName);
        
        // Endpoint: GET /?query={search_term}
        // El parámetro query puede ser un código de barras o un término de búsqueda (nombre de producto)
        const queryParams = new URLSearchParams({
            query: productName.trim()
        });
        
        const apiUrl = `${RAPIDAPI_CONFIG.baseUrl}?${queryParams.toString()}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_CONFIG.apiKey,
                'X-RapidAPI-Host': RAPIDAPI_CONFIG.host
            }
        });
        
        if (!response.ok) {
            console.warn(`⚠️ Barcodes Data API respondió con error ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        console.log('📦 Respuesta completa de Barcodes Data API:', data);
        
        // Extraer todos los productos posibles de diferentes formatos de respuesta
        let products = [];
        
        // Formato 1: data.results[] (formato de "Barcodes Data" API)
        if (Array.isArray(data.results) && data.results.length > 0) {
            products = data.results;
        }
        // Formato 2: data.products[] (array de productos)
        else if (Array.isArray(data.products) && data.products.length > 0) {
            products = data.products;
        }
        // Formato 3: data.data[] (array de productos)
        else if (Array.isArray(data.data) && data.data.length > 0) {
            products = data.data;
        }
        // Formato 4: data.result[] (array de productos)
        else if (Array.isArray(data.result) && data.result.length > 0) {
            products = data.result;
        }
        // Formato 5: objeto único (no array)
        else if (data.barcode || data.gtin || data.upc || data.ean) {
            products = [data];
        }
        // Formato 6: data.items[]
        else if (Array.isArray(data.items) && data.items.length > 0) {
            products = data.items;
        }
        
        if (products.length === 0) {
            console.warn('⚠️ Barcodes Data API no retornó productos en la respuesta');
            return null;
        }
        
        console.log(`📊 Se encontraron ${products.length} producto(s) en la respuesta`);
        
        // Si hay solo un producto, retornarlo directamente
        if (products.length === 1) {
            const product = products[0];
            const gtin = normalizeBarcodeValue(
                product.barcode || 
                product.gtin || 
                product.upc || 
                product.ean ||
                product.code
            );
            if (gtin) {
                console.log('✅ GTIN encontrado (único resultado):', gtin);
                return gtin;
            }
        }
        
        // Si hay múltiples productos, seleccionar el más relevante
        // Calcular similitud entre el nombre buscado y cada producto encontrado
        const productsWithScore = products.map(product => {
            const productNameFromApi = 
                product.name || 
                product.title || 
                product.product_name || 
                product.description || 
                '';
            
            // Extraer barcode/GTIN - "Barcodes Data" API usa "barcode"
            const rawBarcode = 
                product.barcode || 
                product.gtin || 
                product.upc || 
                product.ean ||
                product.code;
            
            const gtin = normalizeBarcodeValue(rawBarcode);
            
            // Calcular similitud mejorada
            let similarity = calculateSimilarity(productName, productNameFromApi);
            
            // Bonus por coincidencias específicas
            const searchLower = productName.toLowerCase();
            const apiNameLower = productNameFromApi.toLowerCase();
            
            // Bonus por marca (ej: "Goya")
            if (product.manufacturer) {
                const manufacturerLower = product.manufacturer.toLowerCase();
                if (searchLower.includes(manufacturerLower) || apiNameLower.includes(manufacturerLower)) {
                    similarity += 0.1; // Bonus de 10%
                }
            }
            
            // Bonus por palabras clave importantes
            const importantWords = ['comino', 'cumin', 'adobo', 'seasoning'];
            importantWords.forEach(word => {
                if (searchLower.includes(word) && apiNameLower.includes(word)) {
                    similarity += 0.05; // Bonus de 5% por palabra clave
                }
            });
            
            // Limitar similitud a máximo 1.0
            similarity = Math.min(similarity, 1.0);
            
            return {
                product,
                gtin,
                name: productNameFromApi,
                manufacturer: product.manufacturer || '',
                similarity
            };
        }).filter(item => item.gtin); // Solo productos con GTIN válido
        
        if (productsWithScore.length === 0) {
            console.warn('⚠️ Ningún producto tiene GTIN válido');
            return null;
        }
        
        // Ordenar por similitud (mayor a menor)
        productsWithScore.sort((a, b) => b.similarity - a.similarity);
        
        const bestMatch = productsWithScore[0];
        const secondBest = productsWithScore[1];
        
        console.log(`✅ Mejor coincidencia encontrada (similitud: ${(bestMatch.similarity * 100).toFixed(1)}%):`, {
            nombre_buscado: productName,
            nombre_encontrado: bestMatch.name,
            fabricante: bestMatch.manufacturer || 'N/A',
            gtin: bestMatch.gtin,
            barcode_original: bestMatch.product.barcode || 'N/A'
        });
        
        // Mostrar también el segundo mejor si existe y es muy cercano
        if (secondBest && secondBest.similarity > 0.7) {
            console.log(`📊 Segunda opción (similitud: ${(secondBest.similarity * 100).toFixed(1)}%):`, {
                nombre: secondBest.name,
                gtin: secondBest.gtin
            });
        }
        
        // Si la similitud es muy baja (< 0.3), puede que no sea el producto correcto
        if (bestMatch.similarity < 0.3) {
            console.warn(`⚠️ Similitud baja (${(bestMatch.similarity * 100).toFixed(1)}%). El GTIN puede no ser correcto.`);
            console.warn(`💡 Sugerencia: Verifica manualmente si el GTIN "${bestMatch.gtin}" corresponde a "${bestMatch.name}"`);
        }
        
        return bestMatch.gtin;
        
    } catch (error) {
        console.warn('⚠️ Error buscando GTIN en Barcodes Data API:', error);
        return null;
    }
}

async function lookupBarcodeFromInternet(productData = {}) {
    const sku = productData.sku || '';

    // Solo aceptamos códigos confiables en cliente sin backend:
    // - Un SKU que YA sea un código de barras válido.
    // No buscamos por nombre en Square para evitar falsos positivos
    // que terminan marcando "producto existente" por error.
    const skuBarcode = normalizeBarcodeValue(sku);
    if (skuBarcode) {
        return {
            barcode: skuBarcode,
            source: 'SKU del formulario'
        };
    }

    throw new Error('No se encontró código de barras. Intenta extraerlo manualmente desde la página del producto o desde Square Catalog.');
}

async function autoFillBarcodeFromCurrentFields() {
    const name = document.getElementById('product-name')?.value.trim() || '';
    const description = document.getElementById('product-description')?.value.trim() || '';
    const sku = document.getElementById('product-sku')?.value.trim() || '';
    const gtinInput = document.getElementById('product-gtin');

    if (!gtinInput) return;

    const currentGtin = normalizeBarcodeValue(gtinInput.value);
    if (currentGtin) {
        setBarcodeLookupStatus('<i class="fas fa-check-circle"></i> GTIN ya disponible en el formulario', 'success');
        return;
    }

    const skuBarcode = normalizeBarcodeValue(sku);
    if (skuBarcode) {
        gtinInput.value = skuBarcode;
        setBarcodeLookupStatus(`<i class="fas fa-check-circle"></i> Codigo detectado desde SKU: ${skuBarcode}`, 'success');
        return;
    }

    if (!name && !sku) {
        setBarcodeLookupStatus('<i class="fas fa-info-circle"></i> Ingresa nombre o SKU para buscar codigo', 'info');
        return;
    }

    setBarcodeLookupStatus('<i class="fas fa-spinner fa-spin"></i> Buscando codigo de barras en internet...', 'loading');

    try {
        const result = await lookupBarcodeFromInternet({ name, description, sku });
        const normalized = normalizeBarcodeValue(result?.barcode);
        if (normalized) {
            gtinInput.value = normalized;
            const source = result?.source || 'fuente externa';
            setBarcodeLookupStatus(`<i class="fas fa-check-circle"></i> Codigo encontrado: ${normalized} (${source})`, 'success');
        } else {
            setBarcodeLookupStatus('<i class="fas fa-exclamation-circle"></i> No se encontro codigo confiable', 'error');
        }
    } catch (error) {
        console.error('Error buscando codigo de barras:', error);
        setBarcodeLookupStatus(`<i class="fas fa-exclamation-circle"></i> ${error.message}`, 'error');
    }
}

// Funciones para agregar productos
async function initAddProductForm() {
    const form = document.getElementById('add-product-form');
    const imageInput = document.getElementById('product-image');
    const lookupBarcodeBtn = document.getElementById('lookup-barcode-btn');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveNewProduct();
        });
    }
    
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const preview = document.getElementById('product-image-preview');
                    const previewImg = document.getElementById('product-image-preview-img');
                    if (preview && previewImg) {
                        previewImg.src = event.target.result;
                        preview.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (lookupBarcodeBtn) {
        lookupBarcodeBtn.addEventListener('click', async () => {
            await autoFillBarcodeFromCurrentFields();
        });
    }
}

async function loadCategoriesForProductForm() {
    const categorySelect = document.getElementById('product-category');
    if (!categorySelect) return;
    
    try {
        // Esperar a que se carguen las categorías de Square
        await waitForSquareProducts();
        
        // Obtener categorías desde squareCategories si está disponible
        let categories = [];
        if (typeof squareCategories !== 'undefined' && squareCategories.length > 0) {
            categories = squareCategories;
        } else {
            // Si no están cargadas, obtenerlas directamente
            const response = await squareApiCall(
                '/v2/catalog/search',
                'POST',
                {
                    object_types: ['CATEGORY']
                }
            );
            categories = response.objects || [];
        }
        
        categorySelect.innerHTML = '<option value="">Seleccionar categoría...</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.category_data?.name || category.id;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando categorías:', error);
        if (typeof showModal === 'function') {
            showModal('Error', 'No se pudieron cargar las categorías. Por favor, recarga la página.', 'error');
        }
    }
}

async function loadLocationsForProductForm() {
    const locationSelect = document.getElementById('product-location');
    if (!locationSelect) return;

    try {
        const response = await squareApiCall('/v2/locations', 'GET');
        const locations = response?.locations || [];

        locationSelect.innerHTML = '';

        if (locations.length === 0) {
            locationSelect.innerHTML = '<option value="">No hay locations disponibles</option>';
            return;
        }

        locations.forEach((location) => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name || location.id;
            if (location.id === SQUARE_CONFIG.locationId) {
                option.selected = true;
            }
            locationSelect.appendChild(option);
        });

        // Fallback: si no está el location configurado, seleccionar el primero.
        if (!locationSelect.value && locations[0]?.id) {
            locationSelect.value = locations[0].id;
        }
    } catch (error) {
        console.error('Error cargando locations:', error);
        locationSelect.innerHTML = `<option value="${SQUARE_CONFIG.locationId}">TropiPlus Supermarket</option>`;
        locationSelect.value = SQUARE_CONFIG.locationId;
    }
}

async function uploadImageToSquare(imageFile) {
    try {
        // Nota: Square requiere que las imágenes sean URLs públicas
        // Para una implementación completa, necesitarías subir la imagen a un servicio de hosting
        // Por ahora, retornamos null y el producto se creará sin imagen
        // El usuario puede agregar la imagen después desde Square Dashboard
        
        console.warn('⚠️ La subida de imágenes requiere un servicio de hosting. El producto se creará sin imagen.');
        console.warn('⚠️ Puedes agregar la imagen después desde Square Dashboard.');
        
        // TODO: Implementar subida a un servicio de hosting (AWS S3, Cloudinary, etc.)
        // y luego crear el objeto IMAGE en Square con la URL pública
        
        return null;
    } catch (error) {
        console.error('Error subiendo imagen a Square:', error);
        return null;
    }
}

async function createCatalogImageFromUrl(imageUrl, productName, productObjectId) {
    if (!imageUrl) return null;

    try {
        // El proxy (local o Supabase) convierte image_url a multipart/form-data
        // para usar correctamente CreateCatalogImage de Square.
        const imageResponse = await squareApiCall('/v2/catalog/images', 'POST', {
            idempotency_key: `img_key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            object_id: productObjectId || undefined,
            image_url: imageUrl,
            image_name: `Imagen ${productName || 'Producto'}`
        });

        const createdImageId = imageResponse?.image?.id || imageResponse?.catalog_object?.id || null;
        if (!createdImageId) {
            console.warn('⚠️ Square no devolvió ID de imagen:', imageResponse);
        }
        return createdImageId;
    } catch (error) {
        console.warn('No se pudo crear imagen en Square con URL externa:', error?.message || error);
        return null;
    }
}

async function saveNewProduct() {
    const form = document.getElementById('add-product-form');
    const isEditing = form?.dataset?.editingProductId;
    const editingProductId = form?.dataset?.editingProductId;
    const editingVariationId = form?.dataset?.editingVariationId;
    
    const name = document.getElementById('product-name')?.value.trim();
    const description = document.getElementById('product-description')?.value.trim();
    const sku = document.getElementById('product-sku')?.value.trim();
    const gtin = document.getElementById('product-gtin')?.value.trim();
    const price = parseFloat(document.getElementById('product-price')?.value) || 0;
    const quantity = parseInt(document.getElementById('product-quantity')?.value) || 0;
    const categoryId = document.getElementById('product-category')?.value;
    const selectedLocationId = document.getElementById('product-location')?.value || SQUARE_CONFIG.locationId;
    const imageFile = document.getElementById('product-image')?.files[0];
    
    if (!name) {
        if (typeof showModal === 'function') {
            showModal('Error', 'El nombre del producto es requerido.', 'error');
        }
        return;
    }
    
    if (!categoryId) {
        if (typeof showModal === 'function') {
            showModal('Error', 'Debes seleccionar una categoría.', 'error');
        }
        return;
    }
    
    if (price <= 0) {
        if (typeof showModal === 'function') {
            showModal('Error', 'El precio debe ser mayor a 0.', 'error');
        }
        return;
    }

    if (!selectedLocationId) {
        if (typeof showModal === 'function') {
            showModal('Error', 'Debes seleccionar una location para guardar el inventario.', 'error');
        }
        return;
    }
    
    try {
        let imageId = null;
        let reusedExistingProduct = false;
        let existingInventoryQuantity = 0;
        if (imageFile) {
            // Mantener comportamiento actual para archivos locales.
            console.log('ℹ️ Imagen local seleccionada. Aun no se sube a Square automaticamente en esta version.');
        }

        // Si vino imagen desde URL extraída, la asociamos después de crear el item.
        const previewImg = document.getElementById('product-image-preview-img');
        const extractedImageUrl = previewImg?.dataset?.imageUrl;
        
        let createdProductId, createdVariationId;
        
        if (isEditing && editingProductId) {
            // ACTUALIZAR producto existente
            // Obtener el producto actual para mantener la versión
            const currentProductResponse = await squareApiCall(`/v2/catalog/object/${editingProductId}`, 'GET');
            if (!currentProductResponse || !currentProductResponse.object) {
                throw new Error('No se pudo obtener el producto para actualizar');
            }
            
            const currentProduct = currentProductResponse.object;
            const currentItemData = currentProduct.item_data;
            const currentVariation = currentItemData?.variations?.find(v => v.id === editingVariationId) || currentItemData?.variations?.[0];
            
            // Construir objeto de actualización
            const updateObject = {
                type: 'ITEM',
                id: editingProductId,
                version: currentProduct.version, // Versión requerida para actualizar
                present_at_all_locations: false,
                present_at_location_ids: [selectedLocationId],
                item_data: {
                    name: name,
                    description: description || undefined,
                    category_id: categoryId,
                    variations: [
                        {
                            type: 'ITEM_VARIATION',
                            id: editingVariationId,
                            version: currentVariation?.version, // Versión requerida
                            present_at_all_locations: false,
                            present_at_location_ids: [selectedLocationId],
                            item_variation_data: {
                                name: currentVariation?.item_variation_data?.name || 'Default',
                                pricing_type: 'FIXED_PRICING',
                                price_money: {
                                    amount: Math.round(price * 100),
                                    currency: 'USD'
                                },
                                sku: sku || undefined,
                                track_inventory: quantity > 0
                            }
                        }
                    ]
                }
            };
            
            // Agregar GTIN si existe
            if (gtin) {
                updateObject.item_data.variations[0].item_variation_data.upc = gtin;
            }
            
            // Mantener imágenes existentes o agregar nueva
            if (currentItemData?.image_ids && currentItemData.image_ids.length > 0) {
                updateObject.item_data.image_ids = currentItemData.image_ids;
            }
            if (imageId && !updateObject.item_data.image_ids) {
                updateObject.item_data.image_ids = [imageId];
            } else if (imageId) {
                updateObject.item_data.image_ids.push(imageId);
            }
            
            // Actualizar el producto
            const updateResponse = await squareApiCall(
                '/v2/catalog/object',
                'PUT',
                {
                    idempotency_key: `update_key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    object: updateObject
                }
            );
            
            if (!updateResponse || !updateResponse.catalog_object) {
                throw new Error('No se pudo actualizar el producto');
            }
            
            createdProductId = editingProductId;
            createdVariationId = editingVariationId;
            
        } else {
            // Si el producto ya existe por identificador confiable, no crear duplicado.
            // Reglas de coincidencia:
            // 1) SKU exacto
            // 2) GTIN/UPC/EAN exacto
            // 3) Misma URL de compra (si viene de extracción por URL)
            // NOTA: NO usamos solo el nombre, porque puede ser genérico y causar falsos positivos.
            const normalizedSku = String(sku || '').trim().toLowerCase();
            const normalizedGtin = normalizeBarcodeValue(gtin);
            const sourceUrl = String(form?.dataset?.sourceUrl || '').trim();
            const existingProductData = allProductsWithInventory.find((p) => {
                const existingSku = String(p?.variation?.item_variation_data?.sku || '').trim().toLowerCase();
                if (normalizedSku && existingSku) {
                    return existingSku === normalizedSku;
                }

                const existingVariationData = p?.variation?.item_variation_data || {};
                const existingGtin = normalizeBarcodeValue(
                    existingVariationData.upc || existingVariationData.gtin || existingVariationData.ean || ''
                );
                if (normalizedGtin && existingGtin) {
                    return existingGtin === normalizedGtin;
                }

                if (sourceUrl) {
                    const existingSupplierInfo = getSupplierInfo(p?.product?.id, p?.variationId);
                    const existingPurchaseUrl = String(existingSupplierInfo?.purchaseUrl || '').trim();
                    if (existingPurchaseUrl && existingPurchaseUrl === sourceUrl) {
                        return true;
                    }
                }

                return false;
            });

            if (existingProductData?.product?.id && existingProductData?.variationId) {
                reusedExistingProduct = true;
                createdProductId = existingProductData.product.id;
                createdVariationId = existingProductData.variationId;
                existingInventoryQuantity = Number(existingProductData?.inventory?.quantity || 0);
            } else {
            // CREAR nuevo producto
            const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const variationId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Para objetos nuevos con ID temporal (#), NO especificar present_at_all_locations
            // o present_at_location_ids en el nivel raíz. Square los asignará automáticamente.
            // Solo especificamos las locations dentro de item_data.
            const productObject = {
                type: 'ITEM',
                id: `#${productId}`,
                present_at_all_locations: false,
                present_at_location_ids: [selectedLocationId],
                item_data: {
                    name: name,
                    description: description || undefined,
                    category_id: categoryId,
                    variations: [
                        {
                            type: 'ITEM_VARIATION',
                            id: `#${variationId}`,
                            present_at_all_locations: false,
                            present_at_location_ids: [selectedLocationId],
                            item_variation_data: {
                                name: 'Default',
                                pricing_type: 'FIXED_PRICING',
                                price_money: {
                                    amount: Math.round(price * 100), // Convertir a centavos
                                    currency: 'USD'
                                },
                                sku: sku || undefined,
                                track_inventory: quantity > 0
                            }
                        }
                    ]
                }
            };
            
            // Después de crear el producto, actualizamos las locations usando UpdateCatalogObject
            // Esto asegura que tanto el ITEM como la VARIATION tengan la misma configuración de locations
            
            // Agregar GTIN si existe
            if (gtin) {
                productObject.item_data.variations[0].item_variation_data.upc = gtin;
            }
            
            // Agregar imagen si se subió
            if (imageId) {
                productObject.item_data.image_ids = [imageId];
            }
            
            // Crear el producto en Square
            const response = await squareApiCall(
                '/v2/catalog/object',
                'POST',
                {
                    idempotency_key: `prod_key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    object: productObject
                }
            );
            
            if (!response || !response.catalog_object) {
                throw new Error('No se recibió respuesta válida de Square');
            }
            
            createdProductId = response.catalog_object.id;
            createdVariationId = response.catalog_object.item_data.variations[0].id;
            
            // Square asigna automáticamente las locations al crear el producto
            // No es necesario actualizarlas manualmente
            }
        }
        
        if (createdProductId && createdVariationId) {
            if (reusedExistingProduct) {
                try {
                    const existingResponse = await squareApiCall(`/v2/catalog/object/${createdProductId}`, 'GET');
                    const existingObject = existingResponse?.object;
                    const existingVariation = existingObject?.item_data?.variations?.find(v => v.id === createdVariationId)
                        || existingObject?.item_data?.variations?.[0];
                    if (existingObject && existingVariation) {
                        await squareApiCall('/v2/catalog/object', 'PUT', {
                            idempotency_key: `loc_fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            object: {
                                type: 'ITEM',
                                id: createdProductId,
                                version: existingObject.version,
                                present_at_all_locations: false,
                                present_at_location_ids: [selectedLocationId],
                                item_data: {
                                    ...existingObject.item_data,
                                    variations: [
                                        {
                                            ...existingVariation,
                                            present_at_all_locations: false,
                                            present_at_location_ids: [selectedLocationId]
                                        }
                                    ]
                                }
                            }
                        });
                    }
                } catch (locationFixError) {
                    console.warn('No se pudo normalizar location del producto existente:', locationFixError?.message || locationFixError);
                }
            }

            // Subir imagen extraída desde URL y asociarla al producto
            if (extractedImageUrl) {
                console.log('📷 Procesando imagen extraída desde URL:', extractedImageUrl);
                imageId = await createCatalogImageFromUrl(extractedImageUrl, name, createdProductId);
                
                // Si se creó la imagen, asegurarse de que esté asociada al producto
                if (imageId && createdProductId && !reusedExistingProduct) {
                    try {
                        // Obtener el producto recién creado para actualizar con la imagen
                        const currentProduct = await squareApiCall(`/v2/catalog/object/${createdProductId}`, 'GET');
                        if (currentProduct?.object) {
                            const updateObject = {
                                type: 'ITEM',
                                id: createdProductId,
                                version: currentProduct.object.version,
                                item_data: {
                                    ...currentProduct.object.item_data,
                                    image_ids: [imageId] // Asociar la imagen al producto
                                }
                            };
                            
                            await squareApiCall('/v2/catalog/object', 'PUT', {
                                idempotency_key: `img_assoc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                                object: updateObject
                            });
                            
                            console.log('✅ Imagen asociada al producto correctamente:', imageId);
                        }
                    } catch (imgError) {
                        console.warn('⚠️ Error asociando imagen al producto (no crítico):', imgError);
                        // No es crítico, el producto se creó correctamente
                    }
                }
            }
            
            // Si hay cantidad inicial, actualizar inventario.
            // Usamos PHYSICAL_COUNT para evitar errores de from_state/to_state.
            if (quantity > 0 && createdVariationId) {
                const finalQuantity = reusedExistingProduct
                    ? (Number(existingInventoryQuantity) + Number(quantity))
                    : Number(quantity);
                try {
                    await squareApiCall(
                        '/v2/inventory/batch-change',
                        'POST',
                        {
                            idempotency_key: `inv_key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            changes: [
                                {
                                    type: 'PHYSICAL_COUNT',
                                    physical_count: {
                                        catalog_object_id: createdVariationId,
                                        // catalog_object_type es de solo lectura en este endpoint.
                                        state: 'IN_STOCK',
                                        location_id: selectedLocationId,
                                        quantity: String(finalQuantity),
                                        occurred_at: new Date().toISOString()
                                    }
                                }
                            ]
                        }
                    );
                } catch (inventoryError) {
                    console.warn('No se pudo actualizar inventario inmediatamente:', inventoryError?.message || inventoryError);
                    if (typeof showModal === 'function') {
                        showModal(
                            'Aviso',
                            'El producto se guardó correctamente, pero no se pudo actualizar el inventario automáticamente. Puedes ajustarlo desde Square Dashboard.',
                            'warning'
                        );
                    }
                }
            }
            
            // Si el producto se creó desde una URL, guardar automáticamente el proveedor
            const sourceUrl = String(form?.dataset?.sourceUrl || '').trim();
            if (sourceUrl) {
                try {
                    let domain = 'Proveedor Web';
                    let providerBaseUrl = '';
                    let existingSupplier = null;

                    try {
                        const urlObj = new URL(sourceUrl);
                        domain = urlObj.hostname.replace('www.', '') || domain;
                        providerBaseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
                    } catch {
                        // Continuar con fallback sin romper guardado del purchaseUrl.
                    }

                    // Guardar SIEMPRE la relación del producto con URL de compra,
                    // aunque falle cualquier paso de proveedor global.
                    const supplierData = {
                        name: domain.charAt(0).toUpperCase() + domain.slice(1),
                        url: providerBaseUrl,
                        purchaseUrl: sourceUrl,
                        imageUrl: extractedImageUrl || '',
                        notes: `Producto extraído desde ${sourceUrl}`
                    };

                    // Intentar enriquecer con proveedor global existente/creado
                    try {
                        const globalSuppliersList = getGlobalSuppliersList();
                        existingSupplier = globalSuppliersList.find(s => {
                            const supplierUrl = s.url || '';
                            if (!providerBaseUrl) return false;
                            try {
                                const supplierUrlObj = new URL(supplierUrl);
                                return supplierUrlObj.hostname.replace('www.', '') === domain;
                            } catch {
                                return supplierUrl.includes(domain);
                            }
                        });

                        if (existingSupplier) {
                            supplierData.name = existingSupplier.name || supplierData.name;
                            supplierData.url = existingSupplier.url || supplierData.url;
                        } else if (providerBaseUrl) {
                            await addGlobalSupplier({
                                name: supplierData.name,
                                url: providerBaseUrl,
                                address: '',
                                notes: `Proveedor creado automáticamente desde ${sourceUrl}`
                            });
                        }
                    } catch (globalSupplierError) {
                        console.warn('⚠️ No se pudo sincronizar proveedor global:', globalSupplierError);
                    }

                    setSupplierInfo(createdProductId, createdVariationId, supplierData);
                    if (typeof window.saveProductSupplierToSupabase === 'function') {
                        await window.saveProductSupplierToSupabase({
                            mappingKey: createdVariationId || createdProductId,
                            productId: createdProductId,
                            variationId: createdVariationId || null,
                            ...supplierData
                        });
                    }
                    saveSuppliersData();
                    
                    console.log('✅ Proveedor guardado automáticamente desde URL:', supplierData);
                } catch (urlError) {
                    console.warn('Error procesando URL de proveedor:', urlError);
                }
            }
            
            if (typeof showModal === 'function') {
                let successMessage = '';
                if (isEditing) {
                    successMessage = 'Producto actualizado correctamente en Square.';
                } else if (reusedExistingProduct) {
                    successMessage = 'Producto ya existente detectado. Se sumó la cantidad al inventario correctamente.';
                } else {
                    successMessage = 'Producto creado correctamente en Square.';
                }
                if (sourceUrl) {
                    successMessage += ' Proveedor guardado automáticamente.';
                }
                showModal('Éxito', successMessage, 'success');
            }
            
            // Limpiar formulario
            document.getElementById('add-product-form').reset();
            document.getElementById('product-image-preview').style.display = 'none';
            if (previewImg) {
                delete previewImg.dataset.imageUrl;
            }
            if (form) {
                delete form.dataset.sourceUrl;
                delete form.dataset.editingProductId;
                delete form.dataset.editingVariationId;
                delete form.dataset.existingSupplier;
            }
            
            // Restaurar texto del botón
            const submitBtn = document.querySelector('#add-product-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
            }
            
            // Recargar productos
            await loadProducts();
            
            // Cambiar a la pestaña de inventario
            switchTab('inventory');
        } else {
            throw new Error('No se recibió respuesta válida de Square');
        }
    } catch (error) {
        console.error('Error creando producto:', error);
        if (typeof showModal === 'function') {
            showModal('Error', `Error al crear el producto: ${error.message || 'Error desconocido'}`, 'error');
        } else {
            alert(`Error al crear el producto: ${error.message || 'Error desconocido'}`);
        }
    }
}

// Funciones para extraer datos desde URL
function openUrlExtractorModal() {
    const modal = document.getElementById('url-extractor-modal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('url-extractor-form').reset();
        document.getElementById('url-extractor-status').style.display = 'none';
    }
}

function closeUrlExtractorModal() {
    const modal = document.getElementById('url-extractor-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openBulkUrlImportModal() {
    const modal = document.getElementById('bulk-url-import-modal');
    if (modal) {
        modal.classList.add('active');
        const form = document.getElementById('bulk-url-import-form');
        if (form) form.reset();
        bulkImportProducts = [];
        const status = document.getElementById('bulk-url-import-status');
        const results = document.getElementById('bulk-url-import-results');
        if (status) status.style.display = 'none';
        if (results) results.style.display = 'none';
    }
}

function closeBulkUrlImportModal() {
    const modal = document.getElementById('bulk-url-import-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function updateBulkImportStatus(message, type = 'info') {
    const statusDiv = document.getElementById('bulk-url-import-status');
    const statusText = document.getElementById('bulk-url-import-status-text');
    if (!statusDiv || !statusText) return;
    statusDiv.style.display = 'block';
    if (type === 'error') {
        statusDiv.style.background = '#ffebee';
        statusDiv.style.color = '#c62828';
    } else if (type === 'success') {
        statusDiv.style.background = '#e8f5e9';
        statusDiv.style.color = '#2e7d32';
    } else {
        statusDiv.style.background = '#e3f2fd';
        statusDiv.style.color = '#1976d2';
    }
    statusText.innerHTML = message;
}

async function extractProductsFromCatalogUrl(sourceUrl, maxProducts = 30) {
    const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(sourceUrl)}`;
    const response = await fetch(corsProxyUrl, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`No se pudo abrir la URL del catálogo (${response.status})`);
    }
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const anchors = Array.from(doc.querySelectorAll('a[href]'));
    const productLinks = [];
    const seen = new Set();
    
    // URLs que NO son productos (páginas generales del sitio)
    const excludePatterns = [
        /\/cart/i,
        /\/checkout/i,
        /\/checkout\//i,
        /\/account/i,
        /\/login/i,
        /\/register/i,
        /\/contact/i,
        /\/about/i,
        /\/home/i,
        /\/index/i,
        /\/shop$/i,  // Solo /shop sin más ruta
        /\/store$/i,
        /\/category/i,
        /\/categories/i,
        /\/search/i,
        /\/tag/i,
        /\/tags/i,
        /\/blog/i,
        /\/news/i,
        /\/help/i,
        /\/faq/i,
        /\/terms/i,
        /\/privacy/i,
        /\/policy/i,
        /\/wishlist/i,
        /\/compare/i,
        /^https?:\/\/[^\/]+\/?$/i  // Solo dominio raíz
    ];
    
    for (const a of anchors) {
        const hrefRaw = a.getAttribute('href') || '';
        if (!hrefRaw || hrefRaw.startsWith('#') || hrefRaw.startsWith('javascript:')) continue;
        let href;
        try {
            href = new URL(hrefRaw, sourceUrl).href;
        } catch {
            continue;
        }
        
        // Excluir URLs que son páginas generales
        const shouldExclude = excludePatterns.some(pattern => pattern.test(href));
        if (shouldExclude) continue;
        
        // Buscar patrones que indiquen que es un producto individual
        const hrefLower = href.toLowerCase();
        const text = `${a.textContent || ''} ${hrefLower}`.toLowerCase();
        
        // Patrones que indican producto: /product/, /producto/, /item/, /p/, /dp/, números en la URL, etc.
        const isProductLike = 
            /\/product[\/\-]/i.test(href) ||
            /\/producto[\/\-]/i.test(href) ||
            /\/item[\/\-]/i.test(href) ||
            /\/p\/[^\/]+/i.test(href) ||
            /\/dp\/[^\/]+/i.test(href) ||
            /\/products\/[^\/]+/i.test(href) ||
            /\/productos\/[^\/]+/i.test(href) ||
            /\/[a-z]+\/[0-9]+/i.test(href) ||  // URL con números (ej: /product/12345)
            (text.includes('product') && !text.includes('category') && !text.includes('shop') && !text.includes('store'));
        
        if (!isProductLike) continue;
        if (seen.has(href)) continue;
        seen.add(href);
        productLinks.push(href);
        if (productLinks.length >= maxProducts) break;
    }

    // Fallback: si no detecta enlaces producto, intenta tratar la URL como producto único.
    if (productLinks.length === 0) {
        productLinks.push(sourceUrl);
    }

    const extracted = [];
    for (const link of productLinks) {
        try {
            const item = await extractProductDataFromUrl(link);
            
            extracted.push({
                selected: true,
                name: item.name || 'Producto sin nombre',
                description: item.description || '',
                image: item.image || '',
                sku: item.sku || '',
                gtin: item.gtin || '',
                sourceUrl: link,
                price: item.price > 0 ? item.price : 1, // Usar precio extraído, default 1 si no se encontró
                quantity: 0,
                categoryId: '',
                locationId: SQUARE_CONFIG.locationId || ''
            });
        } catch (error) {
            console.warn('No se pudo extraer producto del enlace:', link, error);
        }
    }

    return extracted;
}

function getCategoryOptionsHtml(selectedId = '') {
    const categories = (typeof squareCategories !== 'undefined' && Array.isArray(squareCategories)) ? squareCategories : [];
    const options = ['<option value="">Seleccionar categoría...</option>'];
    categories.forEach((category) => {
        const value = category.id;
        const name = category.category_data?.name || category.id;
        const selected = value === selectedId ? 'selected' : '';
        options.push(`<option value="${value}" ${selected}>${name}</option>`);
    });
    return options.join('');
}

function getLocationOptionsHtml(selectedId = '') {
    const locationSelect = document.getElementById('product-location');
    if (locationSelect && locationSelect.options.length > 0) {
        return Array.from(locationSelect.options).map((opt) => {
            const selected = opt.value === selectedId ? 'selected' : '';
            return `<option value="${opt.value}" ${selected}>${opt.textContent}</option>`;
        }).join('');
    }
    return `<option value="${SQUARE_CONFIG.locationId}">TropiPlus Supermarket</option>`;
}

function renderBulkImportTable() {
    const tbody = document.getElementById('bulk-products-table-body');
    const results = document.getElementById('bulk-url-import-results');
    const countLabel = document.getElementById('bulk-products-count');
    if (!tbody || !results || !countLabel) return;

    results.style.display = bulkImportProducts.length ? 'block' : 'none';
    countLabel.textContent = `${bulkImportProducts.length} productos detectados`;

    const categoryOptions = getCategoryOptionsHtml();
    const locationOptions = getLocationOptionsHtml(SQUARE_CONFIG.locationId || '');

    tbody.innerHTML = bulkImportProducts.map((item, idx) => `
        <tr>
            <td style="text-align:center;">
                <input type="checkbox" class="bulk-item-check" data-index="${idx}" ${item.selected ? 'checked' : ''}>
            </td>
            <td style="text-align:center;">
                <img src="${item.image || 'images/placeholder.svg'}" alt="img" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #ddd;" onerror="this.src='images/placeholder.svg'">
            </td>
            <td>
                <input type="text" class="bulk-item-name" data-index="${idx}" value="${(item.name || '').replace(/"/g, '&quot;')}" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;">
                <small style="display:block;color:#666;margin-top:4px;">${(item.description || '').slice(0, 100)}</small>
            </td>
            <td><input type="number" step="0.01" min="0.01" class="bulk-item-price" data-index="${idx}" value="${Number(item.price || 1)}" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;"></td>
            <td><input type="number" min="0" class="bulk-item-qty" data-index="${idx}" value="${Number(item.quantity || 0)}" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;"></td>
            <td><select class="bulk-item-category" data-index="${idx}" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;">${categoryOptions}</select></td>
            <td><select class="bulk-item-location" data-index="${idx}" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;">${locationOptions}</select></td>
            <td><input type="url" class="bulk-item-url" data-index="${idx}" value="${(item.sourceUrl || '').replace(/"/g, '&quot;')}" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;"></td>
        </tr>
    `).join('');

    // Aplicar valores seleccionados por fila
    bulkImportProducts.forEach((item, idx) => {
        const catEl = tbody.querySelector(`.bulk-item-category[data-index="${idx}"]`);
        const locEl = tbody.querySelector(`.bulk-item-location[data-index="${idx}"]`);
        if (catEl) catEl.value = item.categoryId || '';
        if (locEl) locEl.value = item.locationId || (SQUARE_CONFIG.locationId || '');
    });
}

function syncBulkRowValuesFromUI() {
    const tbody = document.getElementById('bulk-products-table-body');
    if (!tbody) return;
    bulkImportProducts.forEach((item, idx) => {
        const checkedEl = tbody.querySelector(`.bulk-item-check[data-index="${idx}"]`);
        const nameEl = tbody.querySelector(`.bulk-item-name[data-index="${idx}"]`);
        const priceEl = tbody.querySelector(`.bulk-item-price[data-index="${idx}"]`);
        const qtyEl = tbody.querySelector(`.bulk-item-qty[data-index="${idx}"]`);
        const catEl = tbody.querySelector(`.bulk-item-category[data-index="${idx}"]`);
        const locEl = tbody.querySelector(`.bulk-item-location[data-index="${idx}"]`);
        const urlEl = tbody.querySelector(`.bulk-item-url[data-index="${idx}"]`);

        item.selected = !!checkedEl?.checked;
        item.name = (nameEl?.value || item.name || '').trim();
        item.price = Math.max(0.01, Number(priceEl?.value || item.price || 1));
        item.quantity = Math.max(0, Number(qtyEl?.value || item.quantity || 0));
        item.categoryId = catEl?.value || item.categoryId || '';
        item.locationId = locEl?.value || item.locationId || SQUARE_CONFIG.locationId || '';
        item.sourceUrl = (urlEl?.value || item.sourceUrl || '').trim();
    });
}

async function createSingleProductFromBulk(item) {
    if (!item?.name || !item?.categoryId || !item?.locationId || !item?.price) {
        throw new Error('Faltan campos obligatorios (nombre, precio, categoría, location).');
    }

    const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const variationId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const productObject = {
        type: 'ITEM',
        id: `#${productId}`,
        present_at_all_locations: false,
        present_at_location_ids: [item.locationId],
        item_data: {
            name: item.name,
            description: item.description || undefined,
            category_id: item.categoryId,
            variations: [
                {
                    type: 'ITEM_VARIATION',
                    id: `#${variationId}`,
                    present_at_all_locations: false,
                    present_at_location_ids: [item.locationId],
                    item_variation_data: {
                        name: 'Default',
                        pricing_type: 'FIXED_PRICING',
                        price_money: { amount: Math.round(Number(item.price) * 100), currency: 'USD' },
                        sku: item.sku || undefined,
                        track_inventory: Number(item.quantity || 0) > 0
                    }
                }
            ]
        }
    };

    if (item.gtin) {
        productObject.item_data.variations[0].item_variation_data.upc = item.gtin;
    }

    const response = await squareApiCall('/v2/catalog/object', 'POST', {
        idempotency_key: `prod_bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        object: productObject
    });
    const createdProductId = response?.catalog_object?.id;
    const createdVariationId = response?.catalog_object?.item_data?.variations?.[0]?.id;
    if (!createdProductId || !createdVariationId) {
        throw new Error('Square no devolvió IDs del producto creado.');
    }

    if (item.image) {
        await createCatalogImageFromUrl(item.image, item.name, createdProductId);
    }

    if (Number(item.quantity || 0) > 0) {
        await squareApiCall('/v2/inventory/batch-change', 'POST', {
            idempotency_key: `inv_bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            changes: [
                {
                    type: 'PHYSICAL_COUNT',
                    physical_count: {
                        catalog_object_id: createdVariationId,
                        state: 'IN_STOCK',
                        location_id: item.locationId,
                        quantity: String(Number(item.quantity || 0)),
                        occurred_at: new Date().toISOString()
                    }
                }
            ]
        });
    }

    if (item.sourceUrl) {
        const supplierData = {
            name: (() => {
                try {
                    const u = new URL(item.sourceUrl);
                    return u.hostname.replace('www.', '');
                } catch {
                    return 'Proveedor Web';
                }
            })(),
            url: (() => {
                try {
                    const u = new URL(item.sourceUrl);
                    return `${u.protocol}//${u.hostname}`;
                } catch {
                    return '';
                }
            })(),
            purchaseUrl: item.sourceUrl,
            imageUrl: item.image || '',
            notes: `Producto importado en masa desde ${item.sourceUrl}`
        };
        setSupplierInfo(createdProductId, createdVariationId, supplierData);
        if (typeof window.saveProductSupplierToSupabase === 'function') {
            await window.saveProductSupplierToSupabase({
                mappingKey: createdVariationId || createdProductId,
                productId: createdProductId,
                variationId: createdVariationId || null,
                ...supplierData
            });
        }
    }
}

async function createSelectedBulkProducts() {
    syncBulkRowValuesFromUI();
    const selected = bulkImportProducts.filter(item => item.selected);
    if (selected.length === 0) {
        updateBulkImportStatus('Selecciona al menos un producto para crear.', 'error');
        return;
    }

    updateBulkImportStatus(`<i class="fas fa-spinner fa-spin"></i> Creando ${selected.length} productos en Square...`, 'info');
    let ok = 0;
    const errors = [];
    for (const item of selected) {
        try {
            await createSingleProductFromBulk(item);
            ok += 1;
        } catch (error) {
            errors.push(`${item.name}: ${error.message || error}`);
        }
    }

    if (errors.length === 0) {
        updateBulkImportStatus(`<i class="fas fa-check-circle"></i> ${ok} productos creados correctamente.`, 'success');
    } else {
        updateBulkImportStatus(`<i class="fas fa-exclamation-triangle"></i> Creados: ${ok}. Con errores: ${errors.length}. Revisa consola.`, 'error');
        console.warn('Errores importación masiva:', errors);
    }

    await loadProducts();
}

function initBulkUrlImportForm() {
    const form = document.getElementById('bulk-url-import-form');
    const selectAll = document.getElementById('bulk-select-all');
    const createBtn = document.getElementById('bulk-create-selected-btn');
    const modal = document.getElementById('bulk-url-import-modal');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = document.getElementById('bulk-source-url')?.value?.trim();
            const maxProducts = Number(document.getElementById('bulk-max-products')?.value || 30);
            if (!url) {
                updateBulkImportStatus('Debes ingresar una URL válida.', 'error');
                return;
            }

            try {
                updateBulkImportStatus('<i class="fas fa-spinner fa-spin"></i> Escaneando productos del catálogo...', 'info');
                await waitForSquareProducts();
                await loadCategoriesForProductForm();
                await loadLocationsForProductForm();
                bulkImportProducts = await extractProductsFromCatalogUrl(url, Math.max(1, Math.min(100, maxProducts)));
                renderBulkImportTable();
                updateBulkImportStatus(`<i class="fas fa-check-circle"></i> Se detectaron ${bulkImportProducts.length} productos.`, 'success');
            } catch (error) {
                console.error('Error en importación masiva:', error);
                updateBulkImportStatus(`<i class="fas fa-exclamation-circle"></i> ${error.message || 'Error escaneando URL.'}`, 'error');
            }
        });
    }

    if (selectAll) {
        selectAll.addEventListener('change', () => {
            const checked = !!selectAll.checked;
            bulkImportProducts = bulkImportProducts.map(item => ({ ...item, selected: checked }));
            renderBulkImportTable();
        });
    }

    if (createBtn) {
        createBtn.addEventListener('click', async () => {
            await createSelectedBulkProducts();
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeBulkUrlImportModal();
            }
        });
    }
}

async function extractProductDataFromUrl(url) {
    try {
        const statusDiv = document.getElementById('url-extractor-status');
        const statusText = document.getElementById('url-extractor-status-text');
        
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#e3f2fd';
        statusDiv.style.color = '#1976d2';
        statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Extrayendo datos de la URL...';
        
        // Usar CORS proxy público para acceder a la URL (necesario porque GitHub Pages no tiene backend)
        // El sitio objetivo puede bloquear el acceso directo desde el navegador por políticas CORS
        const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        console.log('🔗 Extrayendo datos desde URL usando proxy CORS:', url);
        
        const response = await fetch(corsProxyUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error accediendo a la URL:', response.status, errorText);
            
            let errorMessage = 'No se pudo acceder a la URL. Posibles causas:';
            errorMessage += '\n• El sitio bloquea el acceso externo';
            errorMessage += '\n• La URL no existe o no es accesible';
            errorMessage += '\n• Problemas de conectividad';
            
            if (response.status === 404) {
                errorMessage = `La URL no fue encontrada (Error 404). Verifica que la URL sea correcta y que el producto exista en el sitio.`;
            } else if (response.status >= 500) {
                errorMessage = `Error del servidor (${response.status}). El sitio puede estar temporalmente no disponible.`;
            }
            
            throw new Error(errorMessage);
        }
        
        const html = await response.text();
        console.log('✅ HTML recibido, longitud:', html.length);
        
        // Crear un parser de HTML temporal
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extraer datos usando múltiples estrategias
        const productData = {
            name: '',
            description: '',
            image: '',
            price: 0,
            sku: '',
            gtin: '',
            sourceUrl: url // Guardar la URL original
        };
        
        // 1. Nombre: og:title, title, h1, product-name, etc.
        productData.name = 
            doc.querySelector('meta[property="og:title"]')?.content ||
            doc.querySelector('meta[name="twitter:title"]')?.content ||
            doc.querySelector('h1')?.textContent?.trim() ||
            doc.querySelector('.product-name')?.textContent?.trim() ||
            doc.querySelector('[itemprop="name"]')?.textContent?.trim() ||
            doc.querySelector('title')?.textContent?.trim() ||
            '';
        
        // 2. Descripción: og:description, meta description, product-description, etc.
        productData.description = 
            doc.querySelector('meta[property="og:description"]')?.content ||
            doc.querySelector('meta[name="description"]')?.content ||
            doc.querySelector('meta[name="twitter:description"]')?.content ||
            doc.querySelector('[itemprop="description"]')?.textContent?.trim() ||
            doc.querySelector('.product-description')?.textContent?.trim() ||
            doc.querySelector('.product-details')?.textContent?.trim() ||
            '';
        
        // 3. Imagen: og:image, twitter:image, product-image, etc.
        const imageUrl = 
            doc.querySelector('meta[property="og:image"]')?.content ||
            doc.querySelector('meta[name="twitter:image"]')?.content ||
            doc.querySelector('[itemprop="image"]')?.content ||
            doc.querySelector('.product-image img')?.src ||
            doc.querySelector('.product-photo img')?.src ||
            doc.querySelector('img[class*="product"]')?.src ||
            doc.querySelector('img[alt*="producto"]')?.src ||
            '';
        
        productData.image = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, url).href) : '';
        
        // 3.5. Precio: meta price, itemprop price, .price, etc.
        // Primero cargar JSON-LD scripts para buscar precio
        const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
        
        const priceText = 
            doc.querySelector('meta[property="product:price:amount"]')?.content ||
            doc.querySelector('meta[property="product:price"]')?.content ||
            doc.querySelector('[itemprop="price"]')?.content ||
            doc.querySelector('[itemprop="price"]')?.textContent?.trim() ||
            doc.querySelector('.price')?.textContent?.trim() ||
            doc.querySelector('.product-price')?.textContent?.trim() ||
            doc.querySelector('[class*="price"]')?.textContent?.trim() ||
            doc.querySelector('[data-price]')?.getAttribute('data-price') ||
            '';
        
        if (priceText) {
            // Extraer número del precio (ej: "$19.99" -> 19.99, "€25,50" -> 25.50)
            const priceMatch = priceText.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
                productData.price = parseFloat(priceMatch[0].replace(/,/g, '')) || 0;
            }
        }
        
        // Buscar precio en JSON-LD
        if (productData.price === 0) {
            for (const script of jsonLdScripts) {
                try {
                    const parsed = JSON.parse(script.textContent || '{}');
                    const entries = Array.isArray(parsed) ? parsed : [parsed];
                    for (const entry of entries) {
                        if (!entry || typeof entry !== 'object') continue;
                        const priceCandidate = 
                            entry.offers?.price ||
                            entry.offers?.[0]?.price ||
                            entry.price ||
                            entry.lowPrice ||
                            entry.highPrice;
                        if (priceCandidate) {
                            const priceNum = typeof priceCandidate === 'string' 
                                ? parseFloat(priceCandidate.replace(/[^\d.]/g, '')) 
                                : parseFloat(priceCandidate);
                            if (!isNaN(priceNum) && priceNum > 0) {
                                productData.price = priceNum;
                                break;
                            }
                        }
                    }
                    if (productData.price > 0) break;
                } catch (jsonError) {
                    // Continuar
                }
            }
        }
        
        // 4. SKU: meta sku, product-sku, data-sku, etc.
        productData.sku = 
            doc.querySelector('meta[property="product:retailer_item_id"]')?.content ||
            doc.querySelector('meta[name="sku"]')?.content ||
            doc.querySelector('[itemprop="sku"]')?.textContent?.trim() ||
            doc.querySelector('.product-sku')?.textContent?.trim() ||
            doc.querySelector('[data-sku]')?.getAttribute('data-sku') ||
            doc.querySelector('[data-product-id]')?.getAttribute('data-product-id') ||
            '';

        // 5. GTIN/UPC/EAN directamente desde la pagina (si existe)
        // Amazon específicamente usa varios formatos
        const directBarcode =
            doc.querySelector('meta[property="product:gtin13"]')?.content ||
            doc.querySelector('meta[property="product:gtin12"]')?.content ||
            doc.querySelector('meta[property="product:gtin14"]')?.content ||
            doc.querySelector('meta[property="product:ean"]')?.content ||
            doc.querySelector('meta[property="product:upc"]')?.content ||
            doc.querySelector('[itemprop="gtin13"]')?.textContent?.trim() ||
            doc.querySelector('[itemprop="gtin12"]')?.textContent?.trim() ||
            doc.querySelector('[itemprop="gtin14"]')?.textContent?.trim() ||
            doc.querySelector('[itemprop="gtin8"]')?.textContent?.trim() ||
            doc.querySelector('[itemprop="ean"]')?.textContent?.trim() ||
            doc.querySelector('[itemprop="upc"]')?.textContent?.trim() ||
            '';

        // Buscar en JSON-LD estructurado (Amazon usa esto frecuentemente)
        let jsonLdBarcode = '';
        for (const script of jsonLdScripts) {
            if (jsonLdBarcode) break;
            try {
                const parsed = JSON.parse(script.textContent || '{}');
                const entries = Array.isArray(parsed) ? parsed : [parsed];
                for (const entry of entries) {
                    if (!entry || typeof entry !== 'object') continue;
                    // Buscar en diferentes niveles del objeto JSON-LD
                    const candidate =
                        entry.gtin13 ||
                        entry.gtin12 ||
                        entry.gtin14 ||
                        entry.gtin8 ||
                        entry.gtin ||
                        entry.ean ||
                        entry.upc ||
                        entry.offers?.gtin13 ||
                        entry.offers?.gtin12 ||
                        entry.offers?.gtin ||
                        entry.offers?.ean ||
                        entry.offers?.upc ||
                        entry.aggregateRating?.gtin13 ||
                        entry.aggregateRating?.gtin12;
                    const normalized = normalizeBarcodeValue(candidate);
                    if (normalized) {
                        jsonLdBarcode = normalized;
                        break;
                    }
                }
            } catch (jsonError) {
                console.warn('JSON-LD invalido en pagina de producto:', jsonError);
            }
        }

        // Buscar en texto visible de la página (Amazon a veces muestra el código visiblemente)
        let visibleBarcode = '';
        if (!jsonLdBarcode && !directBarcode) {
            // Buscar patrones de códigos de barras en el texto (12-14 dígitos)
            const pageText = doc.body?.textContent || '';
            const barcodePatterns = [
                /UPC[:\s]*(\d{12})/i,
                /EAN[:\s]*(\d{13})/i,
                /GTIN[:\s]*(\d{12,14})/i,
                /ISBN[:\s]*(\d{10,13})/i,
                /ASIN[:\s]*([A-Z0-9]{10})/i, // Amazon ASIN (no es código de barras, pero puede ser útil)
                /(\d{12,14})/g // Cualquier secuencia de 12-14 dígitos
            ];
            
            for (const pattern of barcodePatterns) {
                const matches = pageText.match(pattern);
                if (matches) {
                    const candidate = matches[1] || matches[0];
                    const normalized = normalizeBarcodeValue(candidate);
                    if (normalized && normalized.length >= 12 && normalized.length <= 14) {
                        visibleBarcode = normalized;
                        console.log('✅ Código encontrado en texto visible:', visibleBarcode);
                        break;
                    }
                }
            }
        }

        productData.gtin = normalizeBarcodeValue(directBarcode) || jsonLdBarcode || normalizeBarcodeValue(visibleBarcode) || '';
        
        // Si no se encontró GTIN en HTML, intentar buscar por API externa
        if (!productData.gtin && productData.name) {
            try {
                const apiGtin = await lookupGtinFromExternalApi(productData.name);
                if (apiGtin) {
                    productData.gtin = apiGtin;
                    console.log('✅ GTIN encontrado vía API externa:', apiGtin);
                }
            } catch (apiError) {
                console.warn('⚠️ No se pudo obtener GTIN desde API externa:', apiError);
            }
        }
        
        // Limpiar y formatear los datos
        if (productData.name) {
            productData.name = productData.name.replace(/\s+/g, ' ').trim();
        }
        if (productData.description) {
            const decoder = document.createElement('textarea');
            decoder.innerHTML = productData.description;
            const decodedDescription = decoder.value || productData.description;
            productData.description = decodedDescription.replace(/\s+/g, ' ').trim().substring(0, 500);
        }
        
        statusDiv.style.background = '#e8f5e9';
        statusDiv.style.color = '#2e7d32';
        statusText.innerHTML = '<i class="fas fa-check-circle"></i> Datos extraídos correctamente';
        
        return productData;
    } catch (error) {
        console.error('Error extrayendo datos:', error);
        const statusDiv = document.getElementById('url-extractor-status');
        const statusText = document.getElementById('url-extractor-status-text');
        statusDiv.style.background = '#ffebee';
        statusDiv.style.color = '#c62828';
        statusText.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error: ${error.message}`;
        throw error;
    }
}

function fillProductFormWithExtractedData(data) {
    if (data.name) {
        document.getElementById('product-name').value = data.name;
    }
    if (data.description) {
        document.getElementById('product-description').value = data.description;
    }
    if (data.sku) {
        document.getElementById('product-sku').value = data.sku;
    }
    if (data.gtin) {
        document.getElementById('product-gtin').value = data.gtin;
        setBarcodeLookupStatus(`<i class="fas fa-check-circle"></i> Codigo detectado en la pagina: ${data.gtin}`, 'success');
    } else {
        setBarcodeLookupStatus('<i class="fas fa-info-circle"></i> Sin codigo en la pagina. Puedes buscarlo automaticamente.', 'info');
    }
    if (data.image) {
        // Mostrar la imagen extraída en la vista previa
        const preview = document.getElementById('product-image-preview');
        const previewImg = document.getElementById('product-image-preview-img');
        if (preview && previewImg) {
            previewImg.src = data.image;
            preview.style.display = 'block';
            
            // Guardar la URL de la imagen para usarla después
            previewImg.dataset.imageUrl = data.image;
        }
    }
    
    // Guardar la URL de origen para crear proveedor automáticamente
    if (data.sourceUrl) {
        const form = document.getElementById('add-product-form');
        if (form) {
            form.dataset.sourceUrl = data.sourceUrl;
        }
    }
}

// Inicializar el formulario de extracción de URL
function initUrlExtractorForm() {
    const form = document.getElementById('url-extractor-form');
    const modal = document.getElementById('url-extractor-modal');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = document.getElementById('product-url').value.trim();
            
            if (!url) {
                if (typeof showModal === 'function') {
                    showModal('Error', 'Por favor ingresa una URL válida.', 'error');
                }
                return;
            }
            
            try {
                const productData = await extractProductDataFromUrl(url);
                fillProductFormWithExtractedData(productData);

                // No buscar GTIN automáticamente por nombre (Square) para evitar
                // falsos positivos de duplicados en importación por URL.
                // Solo informamos; el usuario puede usar el botón manual si desea.
                if (!normalizeBarcodeValue(productData.gtin)) {
                    setBarcodeLookupStatus('<i class="fas fa-info-circle"></i> Sin código automático confiable. Puedes completar GTIN manualmente.', 'info');
                }
                
                // Cerrar el modal después de un breve delay
                setTimeout(() => {
                    closeUrlExtractorModal();
                    if (typeof showModal === 'function') {
                        showModal('Éxito', 'Datos extraídos correctamente. Revisa y completa los campos faltantes.', 'success');
                    }
                }, 1500);
            } catch (error) {
                console.error('Error en extracción:', error);
            }
        });
    }
    
    // Cerrar al hacer clic fuera del modal
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeUrlExtractorModal();
            }
        });
    }
}

// Función para editar un producto existente
async function editProduct(productId, variationId) {
    try {
        // Cambiar al módulo Admin y a la subpestaña correcta
        switchTab('admin');
        switchSubTab('add-product');
        
        // Obtener el producto desde Square
        const productResponse = await squareApiCall(`/v2/catalog/object/${productId}`, 'GET');
        if (!productResponse || !productResponse.object) {
            throw new Error('No se pudo obtener el producto');
        }
        
        const product = productResponse.object;
        const itemData = product.item_data;
        const variation = itemData?.variations?.find(v => v.id === variationId) || itemData?.variations?.[0];
        
        // Llenar el formulario con los datos del producto
        document.getElementById('product-name').value = itemData?.name || '';
        document.getElementById('product-description').value = itemData?.description || '';
        document.getElementById('product-sku').value = variation?.item_variation_data?.sku || '';
        document.getElementById('product-gtin').value = variation?.item_variation_data?.upc || 
                                                       variation?.item_variation_data?.gtin || 
                                                       variation?.item_variation_data?.ean || '';
        
        // Precio (convertir de centavos a dólares)
        const priceAmount = variation?.item_variation_data?.price_money?.amount || 0;
        document.getElementById('product-price').value = (priceAmount / 100).toFixed(2);
        
        // Categoría
        if (itemData?.category_id) {
            document.getElementById('product-category').value = itemData.category_id;
        }
        
        // Location (usar la primera location donde está presente)
        if (product.present_at_location_ids && product.present_at_location_ids.length > 0) {
            document.getElementById('product-location').value = product.present_at_location_ids[0];
        }
        
        // Obtener inventario
        if (variationId) {
            const inventory = await getProductInventory(variationId);
            if (inventory) {
                document.getElementById('product-quantity').value = inventory.quantity || 0;
            }
        }
        
        // Imagen
        if (itemData?.image_ids && itemData.image_ids.length > 0) {
            const imageUrl = await getCachedProductImageUrl(itemData.image_ids[0]);
            if (imageUrl) {
                const preview = document.getElementById('product-image-preview');
                const previewImg = document.getElementById('product-image-preview-img');
                if (preview && previewImg) {
                    previewImg.src = imageUrl;
                    preview.style.display = 'block';
                }
            }
        }
        
        // Guardar modo edición aunque no exista proveedor
        const editForm = document.getElementById('add-product-form');
        if (editForm) {
            editForm.dataset.editingProductId = productId;
            editForm.dataset.editingVariationId = variationId;
        }

        // Obtener información del proveedor si existe
        const supplierInfo = getSupplierInfo(productId, variationId);
        if (supplierInfo && editForm) {
            editForm.dataset.existingSupplier = JSON.stringify(supplierInfo);
        }
        
        // Cambiar el texto del botón de guardar
        const submitBtn = document.querySelector('#add-product-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Producto';
        }
        
        // Scroll al formulario
        document.getElementById('add-product-content').scrollIntoView({ behavior: 'smooth' });
        
        if (typeof showModal === 'function') {
            showModal('Información', 'Producto cargado para edición. Modifica los campos necesarios y guarda los cambios.', 'info');
        }
    } catch (error) {
        console.error('Error cargando producto para editar:', error);
        if (typeof showModal === 'function') {
            showModal('Error', `Error al cargar el producto: ${error.message}`, 'error');
        }
    }
}

async function toggleTvScreenOrientation(tvId) {
    const tvConfigs = getTvConfigs();
    const tv = tvConfigs.find(t => t.id === tvId);
    if (!tv) {
        if (typeof showModal === 'function') {
            showModal('Error', 'TV no encontrado', 'error');
        }
        return;
    }
    
    // Alternar entre landscape y portrait
    const currentOrientation = tv.screenOrientation || 'landscape';
    const newOrientation = currentOrientation === 'landscape' ? 'portrait' : 'landscape';
    
    tv.screenOrientation = newOrientation;
    tv.updatedAt = Date.now();
    
    try {
        await saveTvConfigs(tvConfigs);
        renderTvList();
        if (typeof showModal === 'function') {
            showModal('Éxito', `Pantalla configurada en modo ${newOrientation === 'landscape' ? 'horizontal' : 'vertical'}`, 'success');
        }
    } catch (error) {
        console.error('Error guardando orientación:', error);
        if (typeof showModal === 'function') {
            showModal('Error', `Error al guardar orientación: ${error.message}`, 'error');
        }
    }
}

// ============================================
// FUNCIONES PARA PESTAÑA DE AJUSTES
// ============================================

const BANNERS_STORAGE_KEY = 'tropiplus_banners';
const BANNER_TRANSITION_STORAGE_KEY = 'tropiplus_banner_transition_interval';
const MAINTENANCE_MODE_STORAGE_KEY = 'tropiplus_maintenance_mode';
const FEATURED_CARDS_STORAGE_KEY = 'tropiplus_featured_cards';

function initSettingsTab() {
    console.log('⚙️ Inicializando pestaña de Ajustes...');
    
    // Cargar y renderizar tarjetas destacadas
    renderFeaturedCardsList();
    
    // Cargar y renderizar banners
    renderBannersList();
    
    // Configurar formulario de transición
    const transitionForm = document.getElementById('banner-transition-form');
    if (transitionForm) {
        const savedInterval = localStorage.getItem(BANNER_TRANSITION_STORAGE_KEY);
        if (savedInterval) {
            document.getElementById('banner-transition-interval').value = savedInterval;
        }
        
        transitionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const interval = parseInt(document.getElementById('banner-transition-interval').value);
            if (interval >= 2 && interval <= 60) {
                localStorage.setItem(BANNER_TRANSITION_STORAGE_KEY, interval.toString());
                await saveBannerTransitionToSupabase(interval);
                showModal('Éxito', `Intervalo de transición guardado: ${interval} segundos`, 'success');
            } else {
                showModal('Error', 'El intervalo debe estar entre 2 y 60 segundos', 'error');
            }
        });
    }
    
    // Configurar formulario de mantenimiento
    const maintenanceForm = document.getElementById('maintenance-mode-form');
    if (maintenanceForm) {
        const savedMaintenance = localStorage.getItem(MAINTENANCE_MODE_STORAGE_KEY);
        const isEnabled = savedMaintenance === 'true';
        document.getElementById('maintenance-enabled').checked = isEnabled;
        
        maintenanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const enabled = document.getElementById('maintenance-enabled').checked;
            localStorage.setItem(MAINTENANCE_MODE_STORAGE_KEY, enabled.toString());
            await saveMaintenanceModeToSupabase(enabled);
            showModal('Éxito', `Modo mantenimiento ${enabled ? 'activado' : 'desactivado'}`, 'success');
        });
    }
    
    // Botón para agregar banner
    const addBannerBtn = document.getElementById('btn-add-banner');
    if (addBannerBtn) {
        addBannerBtn.addEventListener('click', () => {
            openBannerModal();
        });
    }
    
    // Botón para agregar tarjeta destacada
    const addFeaturedCardBtn = document.getElementById('btn-add-featured-card');
    if (addFeaturedCardBtn) {
        addFeaturedCardBtn.addEventListener('click', () => {
            openFeaturedCardModal();
        });
    }
}

// ============================================
// FUNCIONES PARA TARJETAS DESTACADAS
// ============================================

async function renderFeaturedCardsList() {
    const container = document.getElementById('featured-cards-list-container');
    if (!container) return;
    
    try {
        const cards = await getFeaturedCardsFromStorage();
        
        if (cards.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--gray-text);">
                    <i class="fas fa-image" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p style="font-size: 16px; margin: 0;">No hay tarjetas configuradas</p>
                    <p style="font-size: 14px; margin-top: 8px; opacity: 0.7;">Agrega una tarjeta para mostrarla en el home</p>
                </div>
            `;
            return;
        }
        
        // Ordenar tarjetas por display_order
        const sortedCards = [...cards].sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
        
        container.innerHTML = sortedCards.map((card, index) => {
            const imagePreview = card.image_url ? 
                `<img src="${card.image_url}" alt="Tarjeta ${index + 1}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">` :
                `<div style="width: 100%; height: 100%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: #999;">Sin imagen</div>`;
            
            return `
                <div style="display: flex; align-items: center; gap: 15px; padding: 15px; border: 2px solid var(--gray-border); border-radius: 8px; margin-bottom: 12px; background: #f9f9f9;">
                    <div style="width: 120px; height: 120px; border-radius: 6px; overflow: hidden; background: #e0e0e0; flex-shrink: 0; border: 2px solid var(--gray-border);">
                        ${imagePreview}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <p style="margin: 0 0 5px 0; font-weight: 600; font-size: 14px; color: var(--dark-blue);">
                            Tarjeta ${index + 1}
                        </p>
                        ${card.redirect_url ? `
                            <p style="margin: 0 0 3px 0; font-size: 12px; color: var(--green-categories); word-break: break-all;">
                                <strong>URL:</strong> ${card.redirect_url.substring(0, 50)}${card.redirect_url.length > 50 ? '...' : ''}
                            </p>
                        ` : `
                            <p style="margin: 0 0 3px 0; font-size: 12px; color: var(--gray-text);">
                                <strong>URL:</strong> <em>Sin redirección</em>
                            </p>
                        `}
                        <p style="margin: 5px 0 0 0; font-size: 11px; color: var(--gray-text);">
                            Orden: ${card.display_order || index + 1}
                        </p>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button onclick="editFeaturedCard('${card.id}')" class="btn-primary" style="padding: 8px 12px; font-size: 12px;">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="deleteFeaturedCard('${card.id}')" class="btn-delete" style="padding: 8px 12px; font-size: 12px;">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error cargando tarjetas:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--red-error);">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 12px;"></i>
                <p>Error cargando tarjetas: ${error.message}</p>
            </div>
        `;
    }
}

async function openFeaturedCardModal(cardId = null) {
    const card = cardId ? await getFeaturedCardById(cardId) : null;
    
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'supplier-modal';
    modal.id = 'featured-card-modal';
    modal.style.display = 'flex';
    
    const redirectUrlValue = card ? (card.redirect_url || '') : '';
    const displayOrderValue = card ? (card.display_order || 1) : 1;
    const cardIdValue = card ? card.id : '';
    const existingImageUrl = card ? (card.image_url || '') : '';
    
    modal.innerHTML = `
        <div class="supplier-modal-content" style="max-width: 600px;">
            <h2 style="margin-top: 0; margin-bottom: 18px; font-size: 20px;">
                <i class="fas fa-image"></i> ${cardId ? 'Editar' : 'Agregar'} Tarjeta Destacada
            </h2>
            <form id="featured-card-form">
                <div class="supplier-form-group">
                    <label for="featured-card-image">Imagen de la Tarjeta *</label>
                    <input type="file" id="featured-card-image" accept="image/*" ${cardId && existingImageUrl ? '' : 'required'}
                           style="width: 100%; padding: 10px; border: 2px solid var(--gray-border); border-radius: 6px; font-size: 14px;">
                    ${existingImageUrl ? `
                        <div style="margin-top: 10px;">
                            <p style="font-size: 12px; color: var(--gray-text); margin-bottom: 5px;">Imagen actual:</p>
                            <img src="${existingImageUrl}" alt="Imagen actual" style="max-width: 200px; max-height: 150px; border-radius: 6px; border: 2px solid var(--gray-border);">
                        </div>
                    ` : ''}
                    <small style="color: var(--gray-text); display: block; margin-top: 5px; font-size: 12px;">
                        Selecciona una imagen desde tu galería
                    </small>
                </div>
                
                <div class="supplier-form-group">
                    <label for="featured-card-redirect-url">URL de Redirección (Opcional)</label>
                    <input type="url" id="featured-card-redirect-url" 
                           placeholder="https://ejemplo.com/destino" 
                           value="${redirectUrlValue}"
                           style="width: 100%; padding: 10px; border: 2px solid var(--gray-border); border-radius: 6px; font-size: 14px;">
                    <small style="color: var(--gray-text); display: block; margin-top: 5px; font-size: 12px;">
                        Si se especifica, al hacer clic en la tarjeta redirigirá a esta URL
                    </small>
                </div>
                
                <div class="supplier-form-group">
                    <label for="featured-card-display-order">Orden de Visualización *</label>
                    <input type="number" id="featured-card-display-order" required min="1" 
                           value="${displayOrderValue}"
                           style="width: 100%; padding: 10px; border: 2px solid var(--gray-border); border-radius: 6px; font-size: 14px;">
                    <small style="color: var(--gray-text); display: block; margin-top: 5px; font-size: 12px;">
                        Número que determina el orden en que se mostrarán las tarjetas (menor = primero)
                    </small>
                </div>
                
                ${cardIdValue ? `<input type="hidden" id="featured-card-id" value="${cardIdValue}">` : ''}
                ${existingImageUrl ? `<input type="hidden" id="featured-card-existing-image" value="${existingImageUrl}">` : ''}
                
                <div class="supplier-modal-footer">
                    <button type="button" class="btn-cancel" onclick="closeFeaturedCardModal()">Cancelar</button>
                    <button type="submit" class="btn-save">
                        <i class="fas fa-save"></i> ${cardId ? 'Actualizar' : 'Guardar'} Tarjeta
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Configurar formulario
    const form = document.getElementById('featured-card-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageInput = document.getElementById('featured-card-image');
        const redirectUrl = document.getElementById('featured-card-redirect-url').value.trim();
        const displayOrder = parseInt(document.getElementById('featured-card-display-order').value) || 1;
        const existingImageUrl = document.getElementById('featured-card-existing-image')?.value || '';
        
        let imageUrl = existingImageUrl;
        
        // Si hay una nueva imagen seleccionada, convertirla a base64
        if (imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];
            imageUrl = await convertFileToBase64(file);
        }
        
        if (!imageUrl) {
            showModal('Error', 'La imagen es requerida', 'error');
            return;
        }
        
        await saveFeaturedCard(imageUrl, displayOrder, cardId, redirectUrl || null);
        closeFeaturedCardModal();
    });
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        // Validar tamaño máximo del archivo (5MB)
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxFileSize) {
            reject(new Error(`El archivo es demasiado grande. Tamaño máximo: 5MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`));
            return;
        }
        
        // Comprimir imagen antes de convertir a base64
        // Reducir tamaño para evitar "quota exceeded" en Supabase
        const maxWidth = 800;  // Reducido de 1200
        const maxHeight = 600; // Reducido de 800
        const quality = 0.5;   // Reducido de 0.7 a 0.5 (50% calidad)
        const maxBase64Size = 500 * 1024; // 500KB máximo en base64
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Calcular nuevas dimensiones manteniendo proporción
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    } else {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                // Crear canvas para redimensionar
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Mejorar calidad de renderizado
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                ctx.drawImage(img, 0, 0, width, height);
                
                // Intentar comprimir con diferentes calidades hasta que quepa
                let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                let currentQuality = quality;
                
                // Si el base64 es muy grande, reducir calidad progresivamente
                while (compressedBase64.length > maxBase64Size && currentQuality > 0.1) {
                    currentQuality -= 0.1;
                    compressedBase64 = canvas.toDataURL('image/jpeg', currentQuality);
                }
                
                // Si aún es muy grande después de reducir calidad, reducir dimensiones
                if (compressedBase64.length > maxBase64Size) {
                    width = Math.floor(width * 0.8);
                    height = Math.floor(height * 0.8);
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
                }
                
                console.log(`📸 [Imagen] Comprimida: ${(compressedBase64.length / 1024).toFixed(2)}KB (${width}x${height}, calidad: ${(currentQuality * 100).toFixed(0)}%)`);
                resolve(compressedBase64);
            };
            img.onerror = () => reject(new Error('Error al cargar la imagen'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsDataURL(file);
    });
}

function closeFeaturedCardModal() {
    const modal = document.getElementById('featured-card-modal');
    if (modal) {
        modal.remove();
    }
}

async function getFeaturedCardById(cardId) {
    try {
        const cards = await getFeaturedCardsFromStorage();
        return cards.find(c => c.id === cardId) || null;
    } catch (error) {
        console.error('Error obteniendo tarjeta:', error);
        return null;
    }
}

async function saveFeaturedCard(imageUrl, displayOrder, cardId = null, redirectUrl = null) {
    try {
        const cardData = {
            id: cardId || `featured_card_${Date.now()}`,
            image_url: imageUrl,
            display_order: displayOrder,
            redirect_url: redirectUrl,
            active: true
        };
        
        await saveFeaturedCardToStorage(cardData);
        await renderFeaturedCardsList();
        showModal('Éxito', 'Tarjeta guardada correctamente', 'success');
    } catch (error) {
        console.error('Error guardando tarjeta:', error);
        showModal('Error', `Error al guardar tarjeta: ${error.message}`, 'error');
    }
}

async function deleteFeaturedCard(cardId) {
    if (!confirm('¿Estás seguro de eliminar esta tarjeta?')) return;
    
    try {
        await deleteFeaturedCardFromStorage(cardId);
        await renderFeaturedCardsList();
        showModal('Éxito', 'Tarjeta eliminada correctamente', 'success');
    } catch (error) {
        console.error('Error eliminando tarjeta:', error);
        showModal('Error', `Error al eliminar tarjeta: ${error.message}`, 'error');
    }
}

async function getFeaturedCardsFromStorage() {
    try {
        // Intentar obtener de Supabase
        const anonKey = window.SUPABASE_CONFIG?.anonKey || localStorage.getItem('supabase_anon_key');
        if (anonKey && anonKey !== 'null' && anonKey !== 'placeholder') {
            // En el admin, mostrar TODAS las tarjetas (activas e inactivas)
            const response = await fetch(
                `${window.SUPABASE_CONFIG?.url || 'https://your-project.supabase.co'}/rest/v1/featured_cards?select=*&order=display_order.asc`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': anonKey,
                        'Authorization': `Bearer ${anonKey}`
                    }
                }
            );
            
            if (response.ok) {
                return await response.json();
            }
        }
        
        // Fallback a localStorage
        const localCards = localStorage.getItem(FEATURED_CARDS_STORAGE_KEY);
        return localCards ? JSON.parse(localCards) : [];
    } catch (error) {
        console.warn('Error obteniendo tarjetas, usando localStorage:', error);
        const localCards = localStorage.getItem(FEATURED_CARDS_STORAGE_KEY);
        return localCards ? JSON.parse(localCards) : [];
    }
}

async function saveFeaturedCardToStorage(cardData) {
    try {
        const anonKey = window.SUPABASE_CONFIG?.anonKey || localStorage.getItem('supabase_anon_key');
        
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            console.warn('⚠️ [Featured Cards] Anon key no configurada. Guardando solo en localStorage.');
            // Guardar en localStorage como fallback
            const localCards = JSON.parse(localStorage.getItem(FEATURED_CARDS_STORAGE_KEY) || '[]');
            const existingIndex = localCards.findIndex(c => c.id === cardData.id);
            if (existingIndex >= 0) {
                localCards[existingIndex] = cardData;
            } else {
                localCards.push(cardData);
            }
            localStorage.setItem(FEATURED_CARDS_STORAGE_KEY, JSON.stringify(localCards));
            return;
        }
        
        // PRIMERO guardar en Supabase (BD principal)
        const response = await fetch(
            `${window.SUPABASE_CONFIG?.url || 'https://your-project.supabase.co'}/rest/v1/featured_cards`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation,resolution=merge-duplicates',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                },
                body: JSON.stringify({
                    id: cardData.id,
                    image_url: cardData.image_url,
                    display_order: cardData.display_order,
                    redirect_url: cardData.redirect_url || null,
                    active: cardData.active !== false
                })
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [Featured Cards] Error guardando en Supabase:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const saved = await response.json();
        console.log('✅ [Featured Cards] Tarjeta guardada en Supabase:', saved);
        
        // También guardar en localStorage como cache
        const localCards = JSON.parse(localStorage.getItem(FEATURED_CARDS_STORAGE_KEY) || '[]');
        const existingIndex = localCards.findIndex(c => c.id === cardData.id);
        if (existingIndex >= 0) {
            localCards[existingIndex] = cardData;
        } else {
            localCards.push(cardData);
        }
        localStorage.setItem(FEATURED_CARDS_STORAGE_KEY, JSON.stringify(localCards));
    } catch (error) {
        console.error('❌ [Featured Cards] Error guardando tarjeta en Supabase:', error);
        // Guardar en localStorage como fallback
        const localCards = JSON.parse(localStorage.getItem(FEATURED_CARDS_STORAGE_KEY) || '[]');
        const existingIndex = localCards.findIndex(c => c.id === cardData.id);
        if (existingIndex >= 0) {
            localCards[existingIndex] = cardData;
        } else {
            localCards.push(cardData);
        }
        localStorage.setItem(FEATURED_CARDS_STORAGE_KEY, JSON.stringify(localCards));
        throw error; // Re-lanzar para que el usuario sepa que hubo un error
    }
}

async function deleteFeaturedCardFromStorage(cardId) {
    try {
        // Eliminar de localStorage
        const localCards = JSON.parse(localStorage.getItem(FEATURED_CARDS_STORAGE_KEY) || '[]');
        const filtered = localCards.filter(c => c.id !== cardId);
        localStorage.setItem(FEATURED_CARDS_STORAGE_KEY, JSON.stringify(filtered));
        
        const anonKey = window.SUPABASE_CONFIG?.anonKey || localStorage.getItem('supabase_anon_key');
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            return;
        }
        
        const response = await fetch(
            `${window.SUPABASE_CONFIG?.url || 'https://your-project.supabase.co'}/rest/v1/featured_cards?id=eq.${cardId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                }
            }
        );
        
        if (!response.ok && response.status !== 404) {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.warn('Error eliminando tarjeta de Supabase:', error);
        // Ya eliminado de localStorage como fallback
    }
}

// Hacer funciones disponibles globalmente
window.editFeaturedCard = openFeaturedCardModal;
window.deleteFeaturedCard = deleteFeaturedCard;
window.closeFeaturedCardModal = closeFeaturedCardModal;

async function renderBannersList() {
    const container = document.getElementById('banners-list-container');
    if (!container) return;
    
    try {
        const banners = await getBannersFromSupabase();
        
        if (banners.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--gray-text);">
                    <i class="fas fa-image" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p style="font-size: 16px; margin: 0;">No hay banners configurados</p>
                    <p style="font-size: 14px; margin-top: 8px; opacity: 0.7;">Agrega un banner para mostrarlo en el home</p>
                </div>
            `;
            return;
        }
        
        // Ordenar banners por display_order
        const sortedBanners = [...banners].sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
        
        container.innerHTML = sortedBanners.map((banner, index) => `
            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; border: 2px solid var(--gray-border); border-radius: 8px; margin-bottom: 12px; background: #f9f9f9;">
                <div style="width: 120px; height: 80px; border-radius: 6px; overflow: hidden; background: #e0e0e0; flex-shrink: 0; border: 2px solid var(--gray-border);">
                    <img src="${banner.image_url}" alt="Banner ${index + 1}" 
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'120\\' height=\\'80\\'%3E%3Crect fill=\\'%23e0e0e0\\' width=\\'120\\' height=\\'80\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\' font-size=\\'12\\'%3EImagen no disponible%3C/text%3E%3C/svg%3E'"
                         style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="flex: 1; min-width: 0;">
                    <p style="margin: 0 0 5px 0; font-weight: 600; font-size: 14px; color: var(--dark-blue);">
                        Banner ${index + 1}
                    </p>
                    <p style="margin: 0 0 3px 0; font-size: 12px; color: var(--gray-text); word-break: break-all;">
                        <strong>Imagen:</strong> ${banner.image_url.substring(0, 50)}${banner.image_url.length > 50 ? '...' : ''}
                    </p>
                    ${banner.redirect_url ? `
                        <p style="margin: 0 0 3px 0; font-size: 12px; color: var(--green-categories); word-break: break-all;">
                            <strong>URL:</strong> ${banner.redirect_url.substring(0, 50)}${banner.redirect_url.length > 50 ? '...' : ''}
                        </p>
                    ` : `
                        <p style="margin: 0 0 3px 0; font-size: 12px; color: var(--gray-text);">
                            <strong>URL:</strong> <em>Sin redirección</em>
                        </p>
                    `}
                    <p style="margin: 5px 0 0 0; font-size: 11px; color: var(--gray-text);">
                        Orden: ${banner.display_order || index + 1}
                    </p>
                </div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <button onclick="editBanner('${banner.id}')" class="btn-primary" style="padding: 8px 12px; font-size: 12px;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="deleteBanner('${banner.id}')" class="btn-delete" style="padding: 8px 12px; font-size: 12px;">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando banners:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--red-error);">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 12px;"></i>
                <p>Error cargando banners: ${error.message}</p>
            </div>
        `;
    }
}

async function openBannerModal(bannerId = null) {
    const banner = bannerId ? await getBannerById(bannerId) : null;
    
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'supplier-modal';
    modal.id = 'banner-modal';
    modal.style.display = 'flex';
    
    const redirectUrlValue = banner ? (banner.redirect_url || '') : '';
    const displayOrderValue = banner ? (banner.display_order || 1) : 1;
    const bannerIdValue = banner ? banner.id : '';
    const existingImageUrl = banner ? (banner.image_url || '') : '';
    
    modal.innerHTML = `
        <div class="supplier-modal-content" style="max-width: 600px;">
            <h2 style="margin-top: 0; margin-bottom: 18px; font-size: 20px;">
                <i class="fas fa-image"></i> ${bannerId ? 'Editar' : 'Agregar'} Banner
            </h2>
            <form id="banner-form">
                <div class="supplier-form-group">
                    <label for="banner-image">Imagen del Banner *</label>
                    <input type="file" id="banner-image" accept="image/*" ${bannerId && existingImageUrl ? '' : 'required'}
                           style="width: 100%; padding: 10px; border: 2px solid var(--gray-border); border-radius: 6px; font-size: 14px;">
                    ${existingImageUrl ? `
                        <div style="margin-top: 10px;">
                            <p style="font-size: 12px; color: var(--gray-text); margin-bottom: 5px;">Imagen actual:</p>
                            <img src="${existingImageUrl}" alt="Imagen actual" style="max-width: 200px; max-height: 150px; border-radius: 6px; border: 2px solid var(--gray-border);">
                        </div>
                    ` : ''}
                    <small style="color: var(--gray-text); display: block; margin-top: 5px; font-size: 12px;">
                        Selecciona una imagen desde tu galería
                    </small>
                </div>
                
                <div class="supplier-form-group">
                    <label for="banner-redirect-url">URL de Redirección (Opcional)</label>
                    <input type="url" id="banner-redirect-url" 
                           placeholder="https://ejemplo.com/destino" 
                           value="${redirectUrlValue}"
                           style="width: 100%; padding: 10px; border: 2px solid var(--gray-border); border-radius: 6px; font-size: 14px;">
                    <small style="color: var(--gray-text); display: block; margin-top: 5px; font-size: 12px;">
                        Si se especifica, al hacer clic en el banner redirigirá a esta URL
                    </small>
                </div>
                
                <div class="supplier-form-group">
                    <label for="banner-display-order">Orden de Visualización *</label>
                    <input type="number" id="banner-display-order" required min="1" 
                           value="${displayOrderValue}"
                           style="width: 100%; padding: 10px; border: 2px solid var(--gray-border); border-radius: 6px; font-size: 14px;">
                    <small style="color: var(--gray-text); display: block; margin-top: 5px; font-size: 12px;">
                        Número que determina el orden en que se mostrarán los banners (menor = primero)
                    </small>
                </div>
                
                ${bannerIdValue ? `<input type="hidden" id="banner-id" value="${bannerIdValue}">` : ''}
                ${existingImageUrl ? `<input type="hidden" id="banner-existing-image" value="${existingImageUrl}">` : ''}
                
                <div class="supplier-modal-footer">
                    <button type="button" class="btn-cancel" onclick="closeBannerModal()">Cancelar</button>
                    <button type="submit" class="btn-save">
                        <i class="fas fa-save"></i> ${bannerId ? 'Actualizar' : 'Guardar'} Banner
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Configurar formulario
    const form = document.getElementById('banner-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageInput = document.getElementById('banner-image');
        const redirectUrl = document.getElementById('banner-redirect-url').value.trim();
        const displayOrder = parseInt(document.getElementById('banner-display-order').value) || 1;
        const existingImageUrl = document.getElementById('banner-existing-image')?.value || '';
        
        let imageUrl = existingImageUrl;
        
        // Si hay una nueva imagen seleccionada, convertirla a base64
        if (imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];
            imageUrl = await convertFileToBase64(file);
        }
        
        if (!imageUrl) {
            showModal('Error', 'La imagen es requerida', 'error');
            return;
        }
        
        await saveBanner(imageUrl, displayOrder, bannerId, redirectUrl || null);
        closeBannerModal();
    });
}

function closeBannerModal() {
    const modal = document.getElementById('banner-modal');
    if (modal) {
        modal.remove();
    }
}

async function getBannerById(bannerId) {
    try {
        const banners = await getBannersFromSupabase();
        return banners.find(b => b.id === bannerId) || null;
    } catch (error) {
        console.error('Error obteniendo banner:', error);
        return null;
    }
}

async function saveBanner(imageUrl, displayOrder, bannerId = null, redirectUrl = null) {
    try {
        const bannerData = {
            id: bannerId || `banner_${Date.now()}`,
            image_url: imageUrl,
            display_order: displayOrder,
            redirect_url: redirectUrl,
            active: true
        };
        
        await saveBannerToSupabase(bannerData);
        await renderBannersList();
        showModal('Éxito', 'Banner guardado correctamente', 'success');
    } catch (error) {
        console.error('Error guardando banner:', error);
        showModal('Error', `Error al guardar banner: ${error.message}`, 'error');
    }
}

async function deleteBanner(bannerId) {
    if (!confirm('¿Estás seguro de eliminar este banner?')) return;
    
    try {
        await deleteBannerFromSupabase(bannerId);
        await renderBannersList();
        showModal('Éxito', 'Banner eliminado correctamente', 'success');
    } catch (error) {
        console.error('Error eliminando banner:', error);
        showModal('Error', `Error al eliminar banner: ${error.message}`, 'error');
    }
}

// Funciones para Supabase (banners, transición, mantenimiento)
async function getBannersFromSupabase() {
    try {
        const anonKey = SUPABASE_CONFIG?.anonKey || localStorage.getItem('supabase_anon_key');
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            // Fallback a localStorage
            const localBanners = localStorage.getItem(BANNERS_STORAGE_KEY);
            return localBanners ? JSON.parse(localBanners) : [];
        }
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/home_banners?select=*&order=display_order.asc`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                }
            }
        );
        
        if (!response.ok) {
            if (response.status === 404) {
                return [];
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.warn('Error obteniendo banners de Supabase, usando localStorage:', error);
        const localBanners = localStorage.getItem(BANNERS_STORAGE_KEY);
        return localBanners ? JSON.parse(localBanners) : [];
    }
}

async function saveBannerToSupabase(bannerData) {
    try {
        const anonKey = SUPABASE_CONFIG?.anonKey || localStorage.getItem('supabase_anon_key');
        
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            console.warn('⚠️ [Banners] Anon key no configurada. Guardando solo en localStorage.');
            // Guardar en localStorage como fallback
            const localBanners = JSON.parse(localStorage.getItem(BANNERS_STORAGE_KEY) || '[]');
            const existingIndex = localBanners.findIndex(b => b.id === bannerData.id);
            if (existingIndex >= 0) {
                localBanners[existingIndex] = bannerData;
            } else {
                localBanners.push(bannerData);
            }
            localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(localBanners));
            return;
        }
        
        // PRIMERO guardar en Supabase (BD principal)
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/home_banners`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation,resolution=merge-duplicates',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                },
                body: JSON.stringify({
                    id: bannerData.id,
                    image_url: bannerData.image_url,
                    display_order: bannerData.display_order,
                    redirect_url: bannerData.redirect_url || null,
                    active: bannerData.active !== false
                })
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [Banners] Error guardando en Supabase:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const saved = await response.json();
        console.log('✅ [Banners] Banner guardado en Supabase:', saved);
        
        // También guardar en localStorage como cache
        const localBanners = JSON.parse(localStorage.getItem(BANNERS_STORAGE_KEY) || '[]');
        const existingIndex = localBanners.findIndex(b => b.id === bannerData.id);
        if (existingIndex >= 0) {
            localBanners[existingIndex] = bannerData;
        } else {
            localBanners.push(bannerData);
        }
        localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(localBanners));
    } catch (error) {
        console.error('❌ [Banners] Error guardando banner en Supabase:', error);
        // Guardar en localStorage como fallback
        const localBanners = JSON.parse(localStorage.getItem(BANNERS_STORAGE_KEY) || '[]');
        const existingIndex = localBanners.findIndex(b => b.id === bannerData.id);
        if (existingIndex >= 0) {
            localBanners[existingIndex] = bannerData;
        } else {
            localBanners.push(bannerData);
        }
        localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(localBanners));
        throw error; // Re-lanzar para que el usuario sepa que hubo un error
    }
}

async function deleteBannerFromSupabase(bannerId) {
    try {
        // Eliminar de localStorage
        const localBanners = JSON.parse(localStorage.getItem(BANNERS_STORAGE_KEY) || '[]');
        const filtered = localBanners.filter(b => b.id !== bannerId);
        localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(filtered));
        
        const anonKey = SUPABASE_CONFIG?.anonKey || localStorage.getItem('supabase_anon_key');
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            return;
        }
        
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/home_banners?id=eq.${bannerId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                }
            }
        );
        
        if (!response.ok && response.status !== 404) {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.warn('Error eliminando banner de Supabase:', error);
        // Ya eliminado de localStorage como fallback
    }
}

async function saveBannerTransitionToSupabase(interval) {
    try {
        const anonKey = SUPABASE_CONFIG?.anonKey || localStorage.getItem('supabase_anon_key');
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            return;
        }
        
        await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/site_settings`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation,resolution=merge-duplicates',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                },
                body: JSON.stringify({
                    key: 'banner_transition_interval',
                    value: interval.toString()
                })
            }
        );
    } catch (error) {
        console.warn('Error guardando intervalo en Supabase:', error);
    }
}

async function saveMaintenanceModeToSupabase(enabled) {
    try {
        const anonKey = SUPABASE_CONFIG?.anonKey || localStorage.getItem('supabase_anon_key');
        if (!anonKey || anonKey === 'null' || anonKey === 'placeholder') {
            return;
        }
        
        await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/site_settings`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation,resolution=merge-duplicates',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                },
                body: JSON.stringify({
                    key: 'maintenance_mode',
                    value: enabled.toString()
                })
            }
        );
    } catch (error) {
        console.warn('Error guardando modo mantenimiento en Supabase:', error);
    }
}

// Hacer funciones disponibles globalmente
window.editBanner = openBannerModal;
window.deleteBanner = deleteBanner;
window.closeBannerModal = closeBannerModal;

// Hacer función disponible globalmente
window.openSupplierModal = openSupplierModal;
window.openUrlExtractorModal = openUrlExtractorModal;
window.closeUrlExtractorModal = closeUrlExtractorModal;
window.openBulkUrlImportModal = openBulkUrlImportModal;
window.closeBulkUrlImportModal = closeBulkUrlImportModal;
window.editProduct = editProduct;
