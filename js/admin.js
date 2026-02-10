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
const PROMO_STORAGE_KEY = 'tropiplus_promo_config';
const TV_STORAGE_KEY = 'tropiplus_tv_configs';
const QR_STORAGE_KEY = 'tropiplus_qr_configs';
const HOURS_STORAGE_KEY = 'tropiplus_hours_config';
const PUBLIC_TVS_URL = 'https://landerlopez1992-cyber.github.io/tropiplussupermarket/tvs-public.json';

// Cargar datos de proveedores desde localStorage
function loadSuppliersData() {
    const stored = localStorage.getItem('tropiplus_suppliers');
    if (stored) {
        try {
            suppliersData = JSON.parse(stored);
        } catch (e) {
            console.error('Error cargando datos de proveedores:', e);
            suppliersData = {};
        }
    }
    
    // Cargar proveedores globales
    const globalStored = localStorage.getItem('tropiplus_global_suppliers');
    if (globalStored) {
        try {
            globalSuppliers = JSON.parse(globalStored);
        } catch (e) {
            console.error('Error cargando proveedores globales:', e);
            globalSuppliers = {};
        }
    }
}

// Guardar datos de proveedores en localStorage
function saveSuppliersData() {
    localStorage.setItem('tropiplus_suppliers', JSON.stringify(suppliersData));
    localStorage.setItem('tropiplus_global_suppliers', JSON.stringify(globalSuppliers));
}

function initAdminPage() {
    loadSuppliersData();
    
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
        btn.addEventListener('click', () => {
            const subtabName = btn.dataset.subtab;
            switchSubTab(subtabName);
            if (subtabName === 'suppliers') {
                renderGlobalSuppliersList();
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

    // Inicializar pestaña de promoción
    initPromotionTab();
    // Inicializar pestaña QR
    initQrTab();
    // Inicializar pestaña Horario
    initHoursTab();
    // Inicializar pestaña TV
    initTvTab();

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

function saveTvConfigs(tvConfigs) {
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
    
    // ACTUALIZAR AUTOMÁTICAMENTE EL ARCHIVO PÚBLICO
    updatePublicTvsFile(tvConfigs);
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

    statusEl.innerHTML = '<i class="fas fa-sync fa-spin"></i> Verificando sincronización con archivo público...';

    const localTvs = getTvConfigs();
    try {
        const response = await fetch(`${PUBLIC_TVS_URL}?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const publicTvs = await response.json();
        const localSig = buildSyncSignature(localTvs);
        const publicSig = buildSyncSignature(publicTvs);

        if (localSig === publicSig) {
            statusEl.style.background = '#e9f8ee';
            statusEl.style.borderColor = '#42b649';
            statusEl.style.color = '#1f6f2a';
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Público sincronizado: admin y TVs están mostrando la misma configuración.';
            return;
        }

        statusEl.style.background = '#fff3cd';
        statusEl.style.borderColor = '#ffcc00';
        statusEl.style.color = '#7a5a00';
        statusEl.innerHTML = `
            <div><i class="fas fa-exclamation-triangle"></i> Público desincronizado: Admin y TV público no tienen los mismos datos.</div>
            <div style="margin-top:8px;">Haz clic en <b>Guardar TV</b> y luego ejecuta los comandos copiados en terminal para actualizar <code>tvs-public.json</code>.</div>
        `;
    } catch (error) {
        statusEl.style.background = '#fdecea';
        statusEl.style.borderColor = '#e57373';
        statusEl.style.color = '#b71c1c';
        statusEl.innerHTML = `<i class="fas fa-times-circle"></i> No se pudo verificar el archivo público (${error.message}).`;
    }
}

async function updatePublicTvsFile(tvConfigs) {
    const jsonContent = JSON.stringify(tvConfigs, null, 2);
    
    // Mostrar instrucciones claras para actualizar
    const commands = `cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
cat > tvs-public.json << 'EOF'
${jsonContent}
EOF
git add tvs-public.json && git commit -m "Auto-update TVs" && git push`;
    
    // Copiar comandos al portapapeles automáticamente
    try {
        await navigator.clipboard.writeText(commands);
        console.log('✅ Comandos copiados al portapapeles');
        
        // Mostrar alerta clara
        alert(`✅ TVs guardados!\n\nLos comandos para actualizar el archivo público han sido copiados al portapapeles.\n\nPega en terminal y presiona Enter para actualizar automáticamente.\n\nO ejecuta manualmente los comandos que aparecen en la consola.`);
        
        console.log('📋 EJECUTA ESTOS COMANDOS EN TERMINAL:');
        console.log(commands);
        
    } catch (e) {
        console.error('Error copiando:', e);
        console.log('📋 EJECUTA ESTOS COMANDOS EN TERMINAL:');
        console.log(commands);
        alert('📋 Ejecuta los comandos que aparecen en la consola (F12) para actualizar el archivo público.');
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
    const isQrMode = mode === 'qr';

    // Opciones de productos
    setVisible('tv-category-group', isProductsMode);
    setVisible('tv-product-count-group', isProductsMode);
    setVisible('tv-show-price-group', isProductsMode);
    setVisible('tv-show-offer-group', isProductsMode);

    // Segundos aplica para productos, orders y mixed (rotación/refresco)
    setVisible('tv-slide-seconds-group', mode !== 'promo' && mode !== 'qr');

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
        const tvUrl = `${baseUrl}tv.html?tv=${encodeURIComponent(tv.id)}`;
        return `
        <div class="tv-list-item">
            <h4>${tv.name || 'TV sin nombre'} ${tv.active ? '' : '<span style="color:#d93025; font-size:12px;">(Inactivo)</span>'}</h4>
            <div class="tv-meta">
                Modo: <b>${tv.mode || 'mixed'}</b> | Categoría: <b>${tv.categoryName || 'Todas'}</b> |
                Productos: <b>${tv.productCount || 8}</b> | Seg: <b>${tv.slideSeconds || 10}</b>
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
                <a class="tv-btn-open" href="tv.html?tv=${encodeURIComponent(tv.id)}" target="_blank" rel="noopener noreferrer">Abrir Pantalla TV</a>
                <button class="tv-btn-cast" data-tv-action="cast" data-tv-id="${tv.id}" data-tv-url="${tvUrl}" style="background: #ff6b35; color: white; padding: 8px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fas fa-broadcast-tower"></i> Transmitir a TV
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

function initTvTab() {
    const form = document.getElementById('tv-config-form');
    const resetBtn = document.getElementById('tv-reset-btn');
    const listContainer = document.getElementById('tv-list-container');
    if (!form || !listContainer) return;

    populateTvCategorySelect();
    populateTvQrSelect();
    renderTvList();

    resetBtn?.addEventListener('click', () => {
        resetTvForm();
    });

    listContainer.addEventListener('click', (event) => {
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
            const tvConfigs = getTvConfigs().filter(item => item.id !== tvId);
            saveTvConfigs(tvConfigs);
            renderTvList();
            if (typeof showModal === 'function') {
                showModal('Listo', 'TV eliminado correctamente.', 'success');
            }
            return;
        }

        if (action === 'cast') {
            showTvCastModal(tvUrl, tvId);
            return;
        }
    });

    const modeSelect = document.getElementById('tv-mode');
    if (modeSelect) {
        modeSelect.addEventListener('change', () => {
            const mode = modeSelect.value;
            applyTvModeVisibility(mode);
            if (mode === 'qr') {
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
        const slideSeconds = Math.max(3, Math.min(60, parseInt(document.getElementById('tv-slide-seconds').value || '10', 10)));
        const showPrice = document.getElementById('tv-show-price').checked;
        const showOffer = document.getElementById('tv-show-offer').checked;
        const promoText = document.getElementById('tv-promo-text').value.trim();
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
        const tickerEnabled = document.getElementById('tv-ticker-enabled')?.checked !== false;
        const tickerSpeed = document.getElementById('tv-ticker-speed')?.value || 'normal';
        const tickerFontSize = document.getElementById('tv-ticker-font-size')?.value || '28px';
        const tickerTextColor = document.getElementById('tv-ticker-text-color')?.value || '#ffec67';
        const tickerBgColor = document.getElementById('tv-ticker-bg-color')?.value || '#000000';
        const active = document.getElementById('tv-active').checked;
        
        if (mode === 'qr' && !qrId) {
            if (typeof showModal === 'function') {
                showModal('Error', 'Debes seleccionar un QR configurado. Ve a la pestaña "QR" para crear uno.', 'error');
            }
            return;
        }

        // Limpiar valores que no aplican según modo para evitar confusiones
        if (mode !== 'qr') {
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

        const tvPayload = {
            id,
            name,
            mode,
            categoryId,
            categoryName: categoryId ? categoryName : 'Todas',
            productCount,
            slideSeconds,
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

        saveTvConfigs(tvConfigs);
        console.log('💾 [Admin] TV guardado con payload completo:', JSON.stringify(tvPayload, null, 2));
        console.log('💾 [Admin] Ticker config:', {
            enabled: tvPayload.tickerEnabled,
            speed: tvPayload.tickerSpeed,
            fontSize: tvPayload.tickerFontSize,
            textColor: tvPayload.tickerTextColor,
            bgColor: tvPayload.tickerBgColor
        });
        renderTvList();
        resetTvForm();

        if (typeof showModal === 'function') {
            showModal('Éxito', 'Configuración de TV guardada correctamente.', 'success');
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
    const key = variationId || productId;
    return suppliersData[key] || null;
}

function setSupplierInfo(productId, variationId, supplierData) {
    const key = variationId || productId;
    suppliersData[key] = supplierData;
    saveSuppliersData();
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
                        <a href="${supplierInfo.purchaseUrl}" target="_blank" class="supplier-url">
                            <i class="fas fa-shopping-cart"></i> Ver producto
                        </a>
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
        suppliersTab.addEventListener('click', () => {
            renderGlobalSuppliersList();
        });
    }
}

function saveGlobalSupplier() {
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

    if (editingId && globalSuppliers[editingId]) {
        // Actualizar proveedor existente
        globalSuppliers[editingId] = {
            ...globalSuppliers[editingId],
            ...supplierData,
            updatedAt: new Date().toISOString()
        };
        saveSuppliersData();
        renderGlobalSuppliersList();
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
        addGlobalSupplier(supplierData);
        form.reset();
        renderGlobalSuppliersList();
        loadGlobalSuppliersDropdown();

        if (typeof showModal === 'function') {
            showModal('Éxito', 'Proveedor guardado correctamente. Ahora puedes seleccionarlo al asignar proveedores a productos.', 'success');
        } else {
            alert('Proveedor guardado correctamente.');
        }
    }
}

function renderGlobalSuppliersList() {
    const listContainer = document.getElementById('global-suppliers-list');
    if (!listContainer) return;

    const suppliers = getGlobalSuppliersList();

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

function deleteGlobalSupplier(supplierId) {
    if (confirm('¿Estás seguro de que deseas eliminar este proveedor?')) {
        delete globalSuppliers[supplierId];
        saveSuppliersData();
        renderGlobalSuppliersList();
        
        if (typeof showModal === 'function') {
            showModal('Éxito', 'Proveedor eliminado correctamente.', 'success');
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

// Función para agregar proveedor global
function addGlobalSupplier(supplierData) {
    const supplierId = `supplier_${Date.now()}`;
    globalSuppliers[supplierId] = {
        ...supplierData,
        id: supplierId,
        createdAt: new Date().toISOString()
    };
    saveSuppliersData();
    return supplierId;
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

async function lookupBarcodeFromInternet(productData = {}) {
    const name = productData.name || '';
    const description = productData.description || '';
    const sku = productData.sku || '';
    
    // PRIORIDAD 1: Buscar en Square Catalog API (si tenemos nombre)
    if (name) {
        const fromSquare = await lookupBarcodeInSquare(name);
        if (fromSquare?.barcode) {
            return fromSquare;
        }
    }
    
    // PRIORIDAD 2: Buscar en fuentes externas
    const response = await fetch('/api/barcode-lookup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            description: description,
            sku: sku
        })
    });

    if (!response.ok) {
        let serverMessage = `Error ${response.status}: ${response.statusText}`;
        try {
            const errJson = await response.json();
            serverMessage = errJson.error || serverMessage;
        } catch (error) {
            console.warn('No se pudo parsear error JSON de barcode lookup:', error);
        }
        throw new Error(serverMessage);
    }

    return response.json();
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
        // Este endpoint es interceptado por server-proxy.js para convertir la solicitud
        // a multipart/form-data válido para CreateCatalogImage.
        const imageResponse = await squareApiCall('/v2/catalog/images', 'POST', {
            idempotency_key: `img_key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            object_id: productObjectId,
            image_url: imageUrl,
            image_name: `Imagen ${productName || 'Producto'}`
        });

        const createdImageId = imageResponse?.image?.id || imageResponse?.catalog_object?.id;
        return createdImageId || null;
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
            // Si el producto ya existe (por SKU o nombre), no crear duplicado.
            // En ese caso se suma "Cantidad Inicial en Inventario" al inventario actual.
            const normalizedSku = String(sku || '').trim().toLowerCase();
            const normalizedName = String(name || '').trim().toLowerCase();
            const existingProductData = allProductsWithInventory.find((p) => {
                const existingSku = String(p?.variation?.item_variation_data?.sku || '').trim().toLowerCase();
                const existingName = String(p?.itemData?.name || '').trim().toLowerCase();
                if (normalizedSku && existingSku) {
                    return existingSku === normalizedSku;
                }
                return existingName === normalizedName;
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

            if (extractedImageUrl) {
                imageId = await createCatalogImageFromUrl(extractedImageUrl, name, createdProductId);
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
            const form = document.getElementById('add-product-form');
            const sourceUrl = form?.dataset?.sourceUrl;
            if (sourceUrl) {
                try {
                    const urlObj = new URL(sourceUrl);
                    const domain = urlObj.hostname.replace('www.', '');
                    
                    // Buscar o crear proveedor global con este dominio
                    let supplierId = null;
                    const globalSuppliersList = getGlobalSuppliersList();
                    const existingSupplier = globalSuppliersList.find(s => {
                        const supplierUrl = s.url || '';
                        try {
                            const supplierUrlObj = new URL(supplierUrl);
                            return supplierUrlObj.hostname.replace('www.', '') === domain;
                        } catch {
                            return supplierUrl.includes(domain);
                        }
                    });
                    
                    if (existingSupplier) {
                        supplierId = existingSupplier.id;
                    } else {
                        // Crear nuevo proveedor global
                        supplierId = addGlobalSupplier({
                            name: domain.charAt(0).toUpperCase() + domain.slice(1),
                            url: `${urlObj.protocol}//${urlObj.hostname}`,
                            address: '',
                            notes: `Proveedor creado automáticamente desde ${sourceUrl}`
                        });
                    }
                    
                    // Guardar información del proveedor para este producto
                    const supplierData = {
                        name: existingSupplier?.name || (domain.charAt(0).toUpperCase() + domain.slice(1)),
                        url: existingSupplier?.url || `${urlObj.protocol}//${urlObj.hostname}`,
                        purchaseUrl: sourceUrl, // URL de compra específica del producto
                        notes: `Producto extraído desde ${sourceUrl}`
                    };
                    
                    setSupplierInfo(createdProductId, createdVariationId, supplierData);
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

async function extractProductDataFromUrl(url) {
    try {
        const statusDiv = document.getElementById('url-extractor-status');
        const statusText = document.getElementById('url-extractor-status-text');
        
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#e3f2fd';
        statusDiv.style.color = '#1976d2';
        statusText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Extrayendo datos de la URL...';
        
        // Usar un proxy para evitar problemas de CORS
        // Intentar obtener el HTML de la URL
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        console.log('🔗 Llamando a proxy:', proxyUrl);
        
        const response = await fetch(proxyUrl);
        console.log('📥 Respuesta del proxy:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en respuesta:', errorText);
            let errorMessage = 'No se pudo acceder a la URL';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
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
        const directBarcode =
            doc.querySelector('meta[property="product:gtin13"]')?.content ||
            doc.querySelector('meta[property="product:gtin12"]')?.content ||
            doc.querySelector('meta[property="product:ean"]')?.content ||
            doc.querySelector('[itemprop="gtin13"]')?.textContent?.trim() ||
            doc.querySelector('[itemprop="gtin12"]')?.textContent?.trim() ||
            doc.querySelector('[itemprop="gtin14"]')?.textContent?.trim() ||
            doc.querySelector('[itemprop="gtin8"]')?.textContent?.trim() ||
            '';

        // Buscar tambien en JSON-LD estructurado
        let jsonLdBarcode = '';
        const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
        for (const script of jsonLdScripts) {
            if (jsonLdBarcode) break;
            try {
                const parsed = JSON.parse(script.textContent || '{}');
                const entries = Array.isArray(parsed) ? parsed : [parsed];
                for (const entry of entries) {
                    if (!entry || typeof entry !== 'object') continue;
                    const candidate =
                        entry.gtin13 ||
                        entry.gtin12 ||
                        entry.gtin14 ||
                        entry.gtin8 ||
                        entry.gtin ||
                        entry.ean ||
                        entry.upc;
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

        productData.gtin = normalizeBarcodeValue(directBarcode) || jsonLdBarcode || '';
        
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

                // Si no se detecto GTIN directo, intentar buscarlo en bases externas
                if (!normalizeBarcodeValue(productData.gtin)) {
                    await autoFillBarcodeFromCurrentFields();
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
        // Cambiar a la pestaña de agregar producto
        switchTab('add-product');
        
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
        
        // Obtener información del proveedor si existe
        const supplierInfo = getSupplierInfo(productId, variationId);
        if (supplierInfo) {
            // Guardar en un campo oculto para mostrar después
            const form = document.getElementById('add-product-form');
            if (form) {
                form.dataset.editingProductId = productId;
                form.dataset.editingVariationId = variationId;
                form.dataset.existingSupplier = JSON.stringify(supplierInfo);
            }
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

// Hacer función disponible globalmente
window.openSupplierModal = openSupplierModal;
window.openUrlExtractorModal = openUrlExtractorModal;
window.closeUrlExtractorModal = closeUrlExtractorModal;
window.editProduct = editProduct;
