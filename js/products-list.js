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
        // Filtrar productos que no deben mostrarse
        if (name.includes('renta') || name.includes('car rental')) return false;
        if (name.includes('remesa')) return false; // Ocultar Remesa del catálogo
        return true;
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
        const name = itemData.name?.toLowerCase() || '';
        // Filtrar Remesa del catálogo
        if (name.includes('remesa')) return false;
        return itemData.categories.some(cat => cat.id === categoryId);
    });
    
    renderProducts();
}

function loadSaleProducts() {
    document.getElementById('category-title').textContent = 'Productos rebajados';
    document.getElementById('page-title').textContent = 'Productos rebajados - Tropiplus Supermarket';
    document.getElementById('breadcrumb-category').textContent = 'Productos rebajados';
    
    // Filtrar productos - excluir Remesa
    filteredProducts = squareProducts.filter(product => {
        const itemData = product.item_data;
        if (!itemData) return false;
        const name = itemData.name?.toLowerCase() || '';
        if (name.includes('remesa')) return false; // Ocultar Remesa
        return true;
    });
    
    renderProducts();
}

function loadFreeShippingProducts() {
    document.getElementById('category-title').textContent = 'Productos con envío gratis';
    document.getElementById('page-title').textContent = 'Productos con envío gratis - Tropiplus Supermarket';
    document.getElementById('breadcrumb-category').textContent = 'Productos con envío gratis';
    
    // Filtrar productos - excluir Remesa
    filteredProducts = squareProducts.filter(product => {
        const itemData = product.item_data;
        if (!itemData) return false;
        const name = itemData.name?.toLowerCase() || '';
        if (name.includes('remesa')) return false; // Ocultar Remesa
        return true;
    });
    
    renderProducts();
}

function loadSearchResults(query) {
    document.getElementById('category-title').textContent = `Resultados de búsqueda: "${query}"`;
    document.getElementById('page-title').textContent = `Búsqueda: "${query}" - Tropiplus Supermarket`;
    document.getElementById('breadcrumb-category').textContent = `Búsqueda: "${query}"`;
    
    // Intentar obtener resultados guardados en localStorage
    const savedResults = localStorage.getItem('tropiplus_search_results');
    if (savedResults) {
        try {
            filteredProducts = JSON.parse(savedResults);
            localStorage.removeItem('tropiplus_search_results');
            renderProducts();
            return;
        } catch (e) {
            console.error('Error parsing search results:', e);
        }
    }
    
    // Si no hay resultados guardados, buscar en tiempo real
    const searchTerm = query.toLowerCase().trim();
    filteredProducts = squareProducts.filter(product => {
        const itemData = product.item_data;
        if (!itemData) return false;
        const name = itemData.name?.toLowerCase() || '';
        // Excluir Remesa de las búsquedas
        if (name.includes('remesa')) return false;
        // Buscar coincidencias
        return name.includes(searchTerm);
    });
    
    renderProducts();
}

async function loadBuyAgainProducts() {
    document.getElementById('category-title').textContent = 'Comprar de nuevo';
    document.getElementById('page-title').textContent = 'Comprar de nuevo - Tropiplus Supermarket';
    document.getElementById('breadcrumb-category').textContent = 'Comprar de nuevo';
    
    // Verificar si el usuario está logueado
    if (typeof isUserLoggedIn !== 'function' || !isUserLoggedIn()) {
        showModal('Iniciar sesión requerido', 'Debes iniciar sesión para ver tus compras anteriores.', 'info');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    try {
        const user = getCurrentUser();
        if (!user || !user.id) {
            throw new Error('Usuario no encontrado');
        }
        
        // Obtener órdenes del usuario desde Square
        const orders = await getCustomerOrders(user.id);
        
        // Extraer todos los productos únicos de las órdenes completadas
        const purchasedProductIds = new Set();
        const purchasedProducts = [];
        
        orders.forEach(order => {
            // Solo considerar órdenes completadas y pagadas
            // Usar función helper si está disponible, sino verificar directamente
            let isPaid = false;
            if (typeof isOrderPaidSuccessfully === 'function') {
                isPaid = isOrderPaidSuccessfully(order);
            } else {
                // Fallback: verificar tenders
                isPaid = order.tenders && order.tenders.some(t => 
                    t.state === 'CAPTURED' || t.state === 'COMPLETED'
                );
            }
            
            if ((order.state === 'COMPLETED' || order.state === 'OPEN') && isPaid) {
                if (order.line_items) {
                    order.line_items.forEach(item => {
                        // Ignorar remesas y recargas de tarjetas
                        if (item.note && (item.note.includes('Remesa') || item.note.includes('Recarga Tarjeta'))) {
                            return;
                        }
                        
                        // Ignorar CUSTOM_AMOUNT items (remesas, etc.)
                        if (item.item_type === 'CUSTOM_AMOUNT') {
                            return;
                        }
                        
                        // Obtener el catalog_object_id (variation ID)
                        if (item.catalog_object_id) {
                            purchasedProductIds.add(item.catalog_object_id);
                        }
                    });
                }
            }
        });
        
        // Buscar los productos correspondientes en squareProducts
        purchasedProductIds.forEach(variationId => {
            // Buscar el producto que contiene esta variación
            const product = squareProducts.find(p => {
                const itemData = p.item_data;
                if (!itemData || !itemData.variations) return false;
                return itemData.variations.some(v => v.id === variationId);
            });
            
            if (product) {
                // Verificar que no esté duplicado
                if (!purchasedProducts.find(p => p.id === product.id)) {
                    purchasedProducts.push(product);
                }
            }
        });
        
        filteredProducts = purchasedProducts;
        
        if (filteredProducts.length === 0) {
            document.getElementById('products-grid').innerHTML = `
                <div class="no-products-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <div class="no-products-icon" style="font-size: 64px; color: var(--gray-text); margin-bottom: 20px;">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <h3 class="no-products-title" style="font-size: 24px; color: var(--black); margin-bottom: 10px;">
                        No tienes compras anteriores
                    </h3>
                    <p class="no-products-text" style="font-size: 16px; color: var(--gray-text);">
                        Cuando realices tu primera compra, los productos aparecerán aquí para que puedas comprarlos nuevamente.
                    </p>
                    <a href="products.html" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: var(--green-categories); color: white; text-decoration: none; border-radius: 4px; font-weight: 500;">
                        Ver todos los productos
                    </a>
                </div>
            `;
        } else {
            renderProducts();
        }
    } catch (error) {
        console.error('Error cargando compras anteriores:', error);
        showModal('Error', 'No se pudieron cargar tus compras anteriores. Por favor, intenta de nuevo.', 'error');
    }
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
