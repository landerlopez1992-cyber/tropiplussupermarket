// Aplicación principal - Tropiplus Supermarket Square App

let currentTab = 'inventory';
let allInventory = [];
let allOrders = [];
let allProducts = [];
let allCategories = [];

// Inicializar app
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Verificar si hay tokens de OAuth guardados (para App Marketplace)
    const connection = window.squareOAuth?.getConnection();
    
    if (connection && connection.connected) {
        // Usar tokens de OAuth si están disponibles (App Marketplace)
        window.squareApi.init(connection.accessToken, connection.locationId);
        updateConnectionUI(true);
        loadInitialData();
    } else {
        // Intentar usar proxy directo (fallback para desarrollo)
        const initialized = await window.squareApi.init();
        
        if (initialized) {
            updateConnectionUI(true);
            loadInitialData();
        } else {
            updateConnectionUI(false);
            showWelcomeMessage();
        }
    }
    
    // Event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Botón conectar (para OAuth en App Marketplace)
    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            if (window.squareOAuth) {
                window.squareOAuth.initiate();
            } else {
                alert('OAuth no está disponible. Verifica que square-oauth.js esté cargado.');
            }
        });
    }
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Botones de actualizar
    const refreshInventory = document.getElementById('refresh-inventory');
    if (refreshInventory) {
        refreshInventory.addEventListener('click', loadInventory);
    }
    
    const refreshOrders = document.getElementById('refresh-orders');
    if (refreshOrders) {
        refreshOrders.addEventListener('click', loadOrders);
    }
    
    // Búsquedas y filtros
    const inventorySearch = document.getElementById('inventory-search');
    if (inventorySearch) {
        inventorySearch.addEventListener('input', filterInventory);
    }
    
    const inventoryCategory = document.getElementById('inventory-category');
    if (inventoryCategory) {
        inventoryCategory.addEventListener('change', filterInventory);
    }
    
    // Modal de inventario
    const saveInventoryBtn = document.getElementById('save-inventory-btn');
    if (saveInventoryBtn) {
        saveInventoryBtn.addEventListener('click', saveInventory);
    }
    
    // Agregar producto
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            openModal('product-modal');
        });
    }
    
    const saveProductBtn = document.getElementById('save-product-btn');
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', createNewProduct);
    }
    
    // Cerrar modales
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.dataset.modal || e.currentTarget.closest('.modal')?.id;
            if (modalId) {
                closeModal(modalId);
            }
        });
    });
}

function switchTab(tab) {
    currentTab = tab;
    
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-tab`);
    });
    
    // Cargar datos según el tab
    if (tab === 'inventory') {
        loadInventory();
    } else if (tab === 'orders') {
        loadOrders();
    } else if (tab === 'products') {
        loadProducts();
    }
}

async function loadInitialData() {
    await Promise.all([
        loadCategories(),
        loadInventory(),
        loadOrders()
    ]);
}

async function loadCategories() {
    try {
        allCategories = await window.squareApi.getCategories();
        
        // Llenar selects de categorías
        const selects = ['inventory-category', 'products-category', 'product-category-select'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Todas las categorías</option>' +
                    allCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
            }
        });
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

async function loadInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando inventario...</p></div>';
    
    try {
        allInventory = await window.squareApi.getInventory();
        renderInventory(allInventory);
    } catch (error) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ${error.message}</p></div>`;
    }
}

function renderInventory(inventory) {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    
    if (inventory.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>No hay productos en inventario</p></div>';
        return;
    }
    
    grid.innerHTML = inventory.map(item => {
        const badgeClass = item.quantity === 0 ? 'low' : item.quantity < 10 ? 'medium' : 'good';
        const badgeText = item.quantity === 0 ? 'Agotado' : item.quantity < 10 ? 'Bajo' : 'Disponible';
        
        return `
            <div class="inventory-card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${item.name}</div>
                        <div class="card-category">${item.categoryName}</div>
                    </div>
                    <span class="inventory-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="inventory-info">
                    <div style="font-size: 14px; color: var(--text-secondary);">Cantidad actual</div>
                    <div class="inventory-quantity">${item.quantity}</div>
                    <div style="font-size: 14px; color: var(--text-secondary);">
                        Precio: ${formatMoney(item.price)}
                    </div>
                </div>
                <div class="inventory-actions">
                    <button class="btn-edit btn-small" onclick="editInventory('${item.variationId}', '${item.name}', ${item.quantity})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function editInventory(variationId, name, currentQuantity) {
    document.getElementById('modal-product-name').value = name;
    document.getElementById('modal-current-inventory').value = currentQuantity;
    document.getElementById('modal-new-inventory').value = currentQuantity;
    document.getElementById('modal-adjustment-type').value = 'set';
    
    // Guardar variationId en el botón de guardar
    const saveBtn = document.getElementById('save-inventory-btn');
    saveBtn.dataset.variationId = variationId;
    
    openModal('inventory-modal');
}

async function saveInventory() {
    const saveBtn = document.getElementById('save-inventory-btn');
    const variationId = saveBtn.dataset.variationId;
    const newQuantity = parseInt(document.getElementById('modal-new-inventory').value);
    const adjustmentType = document.getElementById('modal-adjustment-type').value;
    
    if (isNaN(newQuantity) || newQuantity < 0) {
        alert('Por favor, ingresa una cantidad válida');
        return;
    }
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
        await window.squareApi.updateInventory(variationId, newQuantity, adjustmentType);
        closeModal('inventory-modal');
        loadInventory();
        alert('Inventario actualizado correctamente');
    } catch (error) {
        alert('Error actualizando inventario: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Guardar';
    }
}

function filterInventory() {
    const search = document.getElementById('inventory-search')?.value.toLowerCase() || '';
    const category = document.getElementById('inventory-category')?.value || '';
    
    let filtered = allInventory;
    
    if (search) {
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(search) ||
            item.variationName.toLowerCase().includes(search)
        );
    }
    
    if (category) {
        filtered = filtered.filter(item => item.categoryId === category);
    }
    
    renderInventory(filtered);
}

async function loadOrders() {
    const list = document.getElementById('orders-list');
    if (!list) return;
    
    list.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando pedidos...</p></div>';
    
    try {
        const statusFilter = document.getElementById('order-status-filter')?.value || null;
        allOrders = await window.squareApi.getOrders(statusFilter);
        renderOrders(allOrders);
    } catch (error) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ${error.message}</p></div>`;
    }
}

function renderOrders(orders) {
    const list = document.getElementById('orders-list');
    if (!list) return;
    
    if (orders.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><p>No hay pedidos</p></div>';
        return;
    }
    
    list.innerHTML = orders.map(order => {
        const state = order.fulfillments?.[0]?.state || 'PROPOSED';
        const stateLabels = {
            'PROPOSED': { text: 'Pendiente', class: 'pending' },
            'RESERVED': { text: 'Procesando', class: 'processing' },
            'PREPARED': { text: 'Listo', class: 'ready' },
            'COMPLETED': { text: 'Completado', class: 'completed' }
        };
        
        const stateInfo = stateLabels[state] || stateLabels['PROPOSED'];
        const customerName = order.recipient_name || 'Cliente';
        const itemCount = order.line_items?.length || 0;
        const total = order.total_money?.amount ? (order.total_money.amount / 100).toFixed(2) : '0.00';
        
        return `
            <div class="order-card">
                <div class="order-info">
                    <div class="order-number">Pedido #${order.id.substring(0, 8)}</div>
                    <div class="order-details">
                        <span><i class="fas fa-user"></i> ${customerName}</span>
                        <span><i class="fas fa-box"></i> ${itemCount} artículos</span>
                        <span><i class="fas fa-dollar-sign"></i> $${total}</span>
                    </div>
                </div>
                <span class="order-status ${stateInfo.class}">${stateInfo.text}</span>
            </div>
        `;
    }).join('');
}

async function loadProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando productos...</p></div>';
    
    try {
        allProducts = await window.squareApi.getProducts();
        renderProducts(allProducts);
    } catch (error) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error: ${error.message}</p></div>`;
    }
}

function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-store"></i><p>No hay productos</p></div>';
        return;
    }
    
    grid.innerHTML = products.map(item => {
        const variation = item.item_data?.variations?.[0];
        const price = variation?.item_variation_data?.price_money?.amount || 0;
        
        return `
            <div class="product-card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${item.item_data.name}</div>
                        <div class="card-category">${item.item_data.categories?.[0]?.name || 'Sin categoría'}</div>
                    </div>
                </div>
                <div class="inventory-info">
                    <div style="font-size: 18px; font-weight: 600; color: var(--primary-color);">
                        ${formatMoney(price)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function createNewProduct() {
    const form = document.getElementById('product-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const productData = {
        name: document.getElementById('product-name').value,
        categoryId: document.getElementById('product-category-select').value || null,
        price: parseFloat(document.getElementById('product-price').value),
        inventory: parseInt(document.getElementById('product-inventory').value) || 0,
        sku: document.getElementById('product-sku').value || null
    };
    
    const saveBtn = document.getElementById('save-product-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    
    try {
        await window.squareApi.createProduct(productData);
        closeModal('product-modal');
        form.reset();
        loadProducts();
        loadInventory();
        alert('Producto creado correctamente');
    } catch (error) {
        alert('Error creando producto: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Crear Producto';
    }
}

// Utilidades
function formatMoney(amount) {
    return `$${(amount / 100).toFixed(2)}`;
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function updateConnectionUI(connected) {
    const statusEl = document.getElementById('connection-status');
    const connectBtn = document.getElementById('connect-btn');
    
    if (connected) {
        statusEl.className = 'connection-status connected';
        statusEl.innerHTML = '<i class="fas fa-circle"></i><span>Conectado</span>';
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fas fa-check"></i> Conectado';
            connectBtn.disabled = true;
            connectBtn.style.background = '#4caf50';
        }
    } else {
        statusEl.className = 'connection-status disconnected';
        statusEl.innerHTML = '<i class="fas fa-circle"></i><span>Desconectado</span>';
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fas fa-plug"></i> Conectar con Square';
            connectBtn.disabled = false;
            connectBtn.style.background = '';
        }
    }
}

function showError(message) {
    const inventoryGrid = document.getElementById('inventory-grid');
    if (inventoryGrid) {
        inventoryGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: var(--danger-color);"></i>
                <h3 style="margin: 20px 0 10px;">Error de Conexión</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">
                    ${message}
                </p>
            </div>
        `;
    }
}

function showWelcomeMessage() {
    const inventoryGrid = document.getElementById('inventory-grid');
    if (inventoryGrid) {
        inventoryGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-plug" style="font-size: 64px; color: var(--primary-color);"></i>
                <h3 style="margin: 20px 0 10px;">Conecta con Square</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">
                    Para comenzar a gestionar tu inventario y pedidos, necesitas conectar tu cuenta de Square.
                </p>
                <button class="btn-primary" onclick="window.squareOAuth?.initiate()">
                    <i class="fas fa-plug"></i> Conectar con Square
                </button>
            </div>
        `;
    }
}

// Hacer funciones globales para onclick
window.editInventory = editInventory;
