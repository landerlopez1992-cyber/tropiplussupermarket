// Products List Page
let currentCategory = null;
let currentPage = 1;
const productsPerPage = 20;
let filteredProducts = [];

document.addEventListener('DOMContentLoaded', async function() {
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('category');
    const categoryName = urlParams.get('name');
    const showSale = urlParams.get('sale');
    const showFreeShipping = urlParams.get('free_shipping');
    
    // Esperar a que se carguen los productos de Square
    await waitForSquareProducts();
    
    // Filtrar productos según los parámetros
    if (categoryId && categoryName) {
        currentCategory = { id: categoryId, name: decodeURIComponent(categoryName) };
        loadProductsByCategory(categoryId, currentCategory.name);
    } else if (showSale) {
        loadSaleProducts();
    } else if (showFreeShipping) {
        loadFreeShippingProducts();
    } else {
        loadAllProducts();
    }
    
    // Event listeners
    initFilters();
    initSort();
});

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

function loadAllProducts() {
    document.getElementById('category-title').textContent = 'Todos los productos';
    document.getElementById('page-title').textContent = 'Todos los productos - Tropiplus Supermarket';
    document.getElementById('breadcrumb-category').textContent = 'Todos los productos';
    
    filteredProducts = squareProducts.filter(product => {
        const itemData = product.item_data;
        if (!itemData) return false;
        const name = itemData.name?.toLowerCase() || '';
        return !name.includes('renta') && !name.includes('car rental');
    });
    
    renderProducts();
}

function loadProductsByCategory(categoryId, categoryName) {
    document.getElementById('category-title').textContent = categoryName;
    document.getElementById('page-title').textContent = `${categoryName} - Tropiplus Supermarket`;
    document.getElementById('breadcrumb-category').textContent = categoryName;
    
    filteredProducts = squareProducts.filter(product => {
        const itemData = product.item_data;
        if (!itemData || !itemData.categories) return false;
        return itemData.categories.some(cat => cat.id === categoryId);
    });
    
    renderProducts();
}

function loadSaleProducts() {
    document.getElementById('category-title').textContent = 'Productos rebajados';
    document.getElementById('page-title').textContent = 'Productos rebajados - Tropiplus Supermarket';
    document.getElementById('breadcrumb-category').textContent = 'Productos rebajados';
    
    // Filtrar productos con descuento (ejemplo: productos YEYA)
    filteredProducts = squareProducts.filter(product => {
        const itemData = product.item_data;
        return itemData && itemData.name?.toUpperCase().includes('YEYA');
    });
    
    renderProducts();
}

function loadFreeShippingProducts() {
    document.getElementById('category-title').textContent = 'Productos con envío gratis';
    document.getElementById('page-title').textContent = 'Productos con envío gratis - Tropiplus Supermarket';
    document.getElementById('breadcrumb-category').textContent = 'Productos con envío gratis';
    
    // Por ahora, mostrar todos los productos
    filteredProducts = squareProducts;
    
    renderProducts();
}

async function renderProducts() {
    const container = document.getElementById('products-grid');
    if (!container) {
        console.error('❌ Contenedor products-grid no encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'no-products-message';
        emptyMessage.innerHTML = `
            <div class="no-products-icon">
                <i class="fas fa-box-open"></i>
            </div>
            <h3 class="no-products-title">Categoría en abastecimiento</h3>
            <p class="no-products-text">Todavía no está disponible para comprar. Espere unos días.</p>
        `;
        container.appendChild(emptyMessage);
        updateProductsCount(0, 0, 0);
        return;
    }
    
    // Paginación
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = Math.min(startIndex + productsPerPage, filteredProducts.length);
    const productsToShow = filteredProducts.slice(startIndex, endIndex);
    
    for (const product of productsToShow) {
        const productCard = await createProductCard(product);
        container.appendChild(productCard);
    }
    
    updateProductsCount(startIndex + 1, endIndex, filteredProducts.length);
    renderPagination();
}

function updateProductsCount(start, end, total) {
    document.getElementById('showing-count').textContent = start;
    document.getElementById('total-count').textContent = end;
    document.getElementById('results-count').textContent = total;
}

function renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';
    
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    if (totalPages <= 1) return;
    
    // Botón anterior
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.className = 'pagination-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    paginationContainer.appendChild(prevBtn);
    
    // Números de página
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.onclick = () => {
                currentPage = i;
                renderProducts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            paginationContainer.appendChild(pageBtn);
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'pagination-dots';
            paginationContainer.appendChild(dots);
        }
    }
    
    // Botón siguiente
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.className = 'pagination-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    paginationContainer.appendChild(nextBtn);
}

function initFilters() {
    const warehouseFilter = document.getElementById('filter-warehouse');
    if (warehouseFilter) {
        warehouseFilter.addEventListener('change', () => {
            // Aplicar filtro (por implementar)
            renderProducts();
        });
    }
}

function initSort() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const sortType = sortSelect.value;
            sortProducts(sortType);
            renderProducts();
        });
    }
}

function sortProducts(sortType) {
    switch (sortType) {
        case 'price-low':
            filteredProducts.sort((a, b) => {
                const priceA = a.item_data?.variations?.[0]?.item_variation_data?.price_money?.amount || 0;
                const priceB = b.item_data?.variations?.[0]?.item_variation_data?.price_money?.amount || 0;
                return priceA - priceB;
            });
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => {
                const priceA = a.item_data?.variations?.[0]?.item_variation_data?.price_money?.amount || 0;
                const priceB = b.item_data?.variations?.[0]?.item_variation_data?.price_money?.amount || 0;
                return priceB - priceA;
            });
            break;
        case 'name':
            filteredProducts.sort((a, b) => {
                const nameA = a.item_data?.name || '';
                const nameB = b.item_data?.name || '';
                return nameA.localeCompare(nameB);
            });
            break;
        default:
            // Relevancia (orden original)
            break;
    }
}
