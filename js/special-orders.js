/**
 * Pedidos especiales + clientes por teléfono + garantía
 */
const SPECIAL_ORDERS_LOCAL_KEY = 'tropiparts_special_orders';
const SPECIAL_ORDERS_VIEWED_KEY = 'tropiparts_special_orders_viewed';
const SPECIAL_CUSTOMERS_LOCAL_KEY = 'tropiparts_special_customers';
const SHIPPING_RATE_PER_LB = 5; // temporal; luego Ajustes

const SPECIAL_STATUS = {
    created: 'Orden creada',
    processing: 'Procesando',
    ordered: 'Comprado',
    shipped: 'Enviado',
    received: 'Entregado',
    cancelled: 'Cancelado'
};

const WARRANTY_OPTIONS = [
    { value: '1', label: '1 año' },
    { value: '2', label: '2 años' },
    { value: '3', label: '3 años' },
    { value: '4', label: '4 años' },
    { value: '5', label: '5 años' },
    { value: '6', label: '6 años' },
    { value: '7', label: '7 años' },
    { value: '8', label: '8 años' },
    { value: '9', label: '9 años' },
    { value: '10', label: '10 años' },
    { value: 'lifetime', label: 'De por vida' }
];

function specialStatusLabel(s) {
    return SPECIAL_STATUS[s] || s || 'Orden creada';
}

/** Normaliza teléfono Cuba / internacional → solo dígitos (preferir con 53) */
function normalizePhone(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('53') && d.length >= 10) return d;
    if (d.length === 8) return '53' + d; // móvil Cuba sin código
    if (d.length === 10 && d.startsWith('5')) return '53' + d; // 5xxxxxxx raro
    return d;
}

function formatPhoneDisplay(phone) {
    const d = normalizePhone(phone);
    if (!d) return '';
    if (d.startsWith('53') && d.length === 10) {
        return `+53 ${d.slice(2, 6)} ${d.slice(6)}`;
    }
    return d.startsWith('53') ? `+${d}` : d;
}

function warrantyLabelFromValue(val) {
    if (val === 'lifetime' || val === 0 || val === '0') return 'De por vida';
    const n = parseInt(val, 10);
    if (!n) return '—';
    return n === 1 ? '1 año' : `${n} años`;
}

function computeWarrantyExpiry(purchaseIso, warrantyValue) {
    if (warrantyValue === 'lifetime' || warrantyValue === 0 || warrantyValue === '0') return null;
    const years = parseInt(warrantyValue, 10);
    if (!years) return null;
    const d = new Date(purchaseIso || Date.now());
    if (Number.isNaN(d.getTime())) return null;
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString();
}

function formatDateShort(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Restante de garantía relativo a purchase_date / warranty_expires_at */
function getWarrantyInfo(order, now = new Date()) {
    const o = order || {};
    const purchase = o.purchase_date || o.created_at;
    const lifetime = o.warranty_lifetime === true || o.warranty_years === 'lifetime' || o.warranty_years === 0;
    const label = o.warranty_label || warrantyLabelFromValue(lifetime ? 'lifetime' : o.warranty_years);
    if (lifetime) {
        return {
            label,
            lifetime: true,
            expired: false,
            purchase_date: purchase,
            expires_at: null,
            remaining_label: 'De por vida',
            total_label: label,
            remaining_ms: Infinity
        };
    }
    let expires = o.warranty_expires_at;
    if (!expires && o.warranty_years) {
        expires = computeWarrantyExpiry(purchase, o.warranty_years);
    }
    if (!expires) {
        return {
            label: label || '—',
            lifetime: false,
            expired: false,
            purchase_date: purchase,
            expires_at: null,
            remaining_label: 'Sin garantía registrada',
            total_label: label || '—',
            remaining_ms: null
        };
    }
    const end = new Date(expires);
    const start = purchase ? new Date(purchase) : null;
    const rem = end.getTime() - now.getTime();
    const expired = rem <= 0;
    let remaining_label;
    if (expired) {
        remaining_label = 'Vencida';
    } else {
        const days = Math.ceil(rem / (24 * 60 * 60 * 1000));
        if (days >= 365) {
            const y = Math.floor(days / 365);
            const m = Math.floor((days % 365) / 30);
            remaining_label = m > 0 ? `${y} año${y > 1 ? 's' : ''} y ${m} mes${m > 1 ? 'es' : ''}` : `${y} año${y > 1 ? 's' : ''}`;
        } else if (days >= 30) {
            const m = Math.floor(days / 30);
            remaining_label = `${m} mes${m > 1 ? 'es' : ''}`;
        } else {
            remaining_label = `${days} día${days !== 1 ? 's' : ''}`;
        }
    }
    return {
        label,
        lifetime: false,
        expired,
        purchase_date: purchase,
        expires_at: expires,
        remaining_label,
        total_label: label,
        remaining_ms: rem,
        start,
        end
    };
}

function orderItemTotal(o) {
    if (o.total_amount != null) return Number(o.total_amount) || 0;
    return (Number(o.product_price) || 0) * (Number(o.quantity) || 1);
}

function orderShipCost(o) {
    if (o.shipping_cost > 0) return Number(o.shipping_cost);
    return calcShippingCost(o.shipping_lb, o.shipping_extra || 0);
}

function orderGrandTotal(o) {
    return Math.round((orderItemTotal(o) + orderShipCost(o)) * 100) / 100;
}

/** Normaliza campos (aliases) y asegura product_image / precio / garantía */
function normalizeSpecialOrder(o) {
    if (!o || typeof o !== 'object') return o;
    const img = o.product_image || o.image || o.image_url || o.productImage || '';
    const price = o.product_price != null ? o.product_price
        : (o.price != null ? o.price : null);
    const qty = o.quantity != null ? o.quantity : 1;
    let total = o.total_amount;
    if (total == null && price != null) total = Math.round(Number(price) * Number(qty) * 100) / 100;
    const phone = normalizePhone(o.customer_phone || o.phone || '');
    const lifetime = o.warranty_lifetime === true || o.warranty_years === 'lifetime';
    const wYears = lifetime ? 'lifetime' : (o.warranty_years != null ? o.warranty_years : null);
    const purchase = o.purchase_date || o.created_at || null;
    let expires = o.warranty_expires_at || null;
    if (!expires && wYears && wYears !== 'lifetime') {
        expires = computeWarrantyExpiry(purchase, wYears);
    }
    return {
        ...o,
        product_name: o.product_name || o.name || 'Producto',
        product_image: typeof img === 'string' ? img.trim() : '',
        product_price: price != null ? Number(price) : 0,
        quantity: Number(qty) || 1,
        total_amount: total != null ? Number(total) : 0,
        product_url: o.product_url || o.source_url || o.url || '',
        product_sku: o.product_sku || o.sku || '',
        payment_method: o.payment_method || o.pay_method || null,
        status: o.status || 'processing',
        customer_phone: phone,
        customer_given_name: o.customer_given_name || o.given_name || '',
        customer_family_name: o.customer_family_name || o.family_name || '',
        customer_name: o.customer_name
            || [o.customer_given_name || o.given_name, o.customer_family_name || o.family_name].filter(Boolean).join(' ').trim()
            || '',
        warranty_years: wYears,
        warranty_lifetime: lifetime,
        warranty_label: o.warranty_label || (wYears != null ? warrantyLabelFromValue(wYears) : null),
        purchase_date: purchase,
        warranty_expires_at: expires
    };
}

function calcShippingCost(lb, extra) {
    const w = parseFloat(lb) || 0;
    const e = parseFloat(extra) || 0;
    return Math.round((w * SHIPPING_RATE_PER_LB + e) * 100) / 100;
}

function readSpecialOrdersLocal() {
    try { return JSON.parse(localStorage.getItem(SPECIAL_ORDERS_LOCAL_KEY) || '[]'); }
    catch (_) { return []; }
}

function writeSpecialOrdersLocal(orders) {
    localStorage.setItem(SPECIAL_ORDERS_LOCAL_KEY, JSON.stringify(orders));
}

function upsertSpecialOrderLocal(record) {
    const list = readSpecialOrdersLocal().filter(o => o.id !== record.id);
    list.unshift({ ...record, updated_at: new Date().toISOString() });
    writeSpecialOrdersLocal(list);
}

function readCustomersLocal() {
    try { return JSON.parse(localStorage.getItem(SPECIAL_CUSTOMERS_LOCAL_KEY) || '[]'); }
    catch (_) { return []; }
}

function writeCustomersLocal(list) {
    localStorage.setItem(SPECIAL_CUSTOMERS_LOCAL_KEY, JSON.stringify(list));
}

function upsertCustomerLocal(customer) {
    const phone = normalizePhone(customer.phone);
    if (!phone) return customer;
    const list = readCustomersLocal().filter(c => normalizePhone(c.phone) !== phone);
    const row = {
        ...customer,
        phone,
        id: customer.id || ('cust_' + phone),
        updated_at: new Date().toISOString()
    };
    list.unshift(row);
    writeCustomersLocal(list);
    return row;
}

function getViewedSpecialOrderIds() {
    try { return JSON.parse(localStorage.getItem(SPECIAL_ORDERS_VIEWED_KEY) || '[]'); }
    catch (_) { return []; }
}

function markSpecialOrderViewed(id) {
    const ids = new Set(getViewedSpecialOrderIds());
    ids.add(id);
    localStorage.setItem(SPECIAL_ORDERS_VIEWED_KEY, JSON.stringify([...ids]));
}

function isSpecialOrderNew(order) {
    if (order.admin_viewed === true) return false;
    return !getViewedSpecialOrderIds().includes(order.id);
}

async function loadAllSpecialOrders() {
    let remote = [];
    try {
        if (typeof window.getSpecialOrdersFromFirebase === 'function' && window.isFirebaseConfigured?.()) {
            remote = await window.getSpecialOrdersFromFirebase(null);
        }
    } catch (e) {
        console.warn('[special-orders] Firebase list:', e);
    }
    const local = readSpecialOrdersLocal();
    const byId = new Map();
    const mergeBest = (a, b) => {
        const x = normalizeSpecialOrder(a || {});
        const y = normalizeSpecialOrder(b || {});
        const newer = String(y.updated_at || y.created_at || '') >= String(x.updated_at || x.created_at || '') ? y : x;
        const older = newer === y ? x : y;
        return normalizeSpecialOrder({
            ...older,
            ...newer,
            product_image: newer.product_image || older.product_image || '',
            product_price: (newer.product_price > 0 ? newer.product_price : older.product_price) || 0,
            total_amount: (newer.total_amount > 0 ? newer.total_amount : older.total_amount) || 0,
            payment_method: newer.payment_method || older.payment_method || null,
            product_url: newer.product_url || older.product_url || '',
            product_sku: newer.product_sku || older.product_sku || '',
            customer_phone: newer.customer_phone || older.customer_phone || '',
            customer_name: newer.customer_name || older.customer_name || '',
            warranty_years: newer.warranty_years != null ? newer.warranty_years : older.warranty_years,
            warranty_label: newer.warranty_label || older.warranty_label,
            warranty_expires_at: newer.warranty_expires_at || older.warranty_expires_at
        });
    };
    [...remote, ...local].forEach(o => {
        if (!o?.id) return;
        const prev = byId.get(o.id);
        byId.set(o.id, prev ? mergeBest(prev, o) : normalizeSpecialOrder(o));
    });
    return Array.from(byId.values()).sort((a, b) =>
        String(b.created_at || '').localeCompare(String(a.created_at || ''))
    );
}

async function findCustomerByPhone(phoneRaw) {
    const phone = normalizePhone(phoneRaw);
    if (!phone) return null;

    const local = readCustomersLocal().find(c => normalizePhone(c.phone) === phone);
    if (local) return local;

    try {
        if (typeof window.getSpecialCustomerByPhoneFirebase === 'function' && window.isFirebaseConfigured?.()) {
            const remote = await window.getSpecialCustomerByPhoneFirebase(phone);
            if (remote) {
                upsertCustomerLocal(remote);
                return remote;
            }
        }
    } catch (e) {
        console.warn('[special-orders] customer firebase:', e);
    }

    // Inferir desde órdenes previas
    const orders = await loadAllSpecialOrders();
    const fromOrder = orders.find(o => normalizePhone(o.customer_phone) === phone);
    if (fromOrder) {
        return {
            phone,
            given_name: fromOrder.customer_given_name || '',
            family_name: fromOrder.customer_family_name || '',
            name: fromOrder.customer_name || ''
        };
    }
    return null;
}

async function saveSpecialCustomer(customer) {
    const phone = normalizePhone(customer.phone);
    if (!phone) throw new Error('Teléfono requerido');
    const row = {
        id: customer.id || ('cust_' + phone),
        phone,
        given_name: (customer.given_name || '').trim(),
        family_name: (customer.family_name || '').trim(),
        name: (customer.name || `${customer.given_name || ''} ${customer.family_name || ''}`).trim(),
        created_at: customer.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    upsertCustomerLocal(row);
    try {
        if (typeof window.saveSpecialCustomerToFirebase === 'function' && window.isFirebaseConfigured?.()) {
            const saved = await window.saveSpecialCustomerToFirebase(row);
            if (saved) upsertCustomerLocal(saved);
            return saved || row;
        }
    } catch (e) {
        console.warn('[special-orders] save customer:', e);
    }
    return row;
}

async function findOrdersByPhone(phoneRaw) {
    const phone = normalizePhone(phoneRaw);
    if (!phone) return [];
    const all = await loadAllSpecialOrders();
    return all
        .filter(o => normalizePhone(o.customer_phone) === phone && o.status !== 'cancelled')
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

/**
 * Si falta foto/precio y hay URL de producto, re-detecta y parchea Firestore/local.
 */
async function backfillSpecialOrderMedia(order) {
    const o = normalizeSpecialOrder(order);
    if (!o?.id || !o.product_url) return o;
    const needsImg = !o.product_image;
    const needsPrice = !(o.product_price > 0);
    if (!needsImg && !needsPrice) return o;
    try {
        const res = await fetch('/api/product-from-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: o.product_url })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return o;
        const patch = {};
        const img = data.image || data.image_url || '';
        if (needsImg && img) patch.product_image = img;
        if (needsPrice && data.price != null && Number(data.price) > 0) {
            patch.product_price = Number(data.price);
            const qty = o.quantity || 1;
            patch.total_amount = Math.round(Number(data.price) * qty * 100) / 100;
        }
        if (data.sku && !o.product_sku) patch.product_sku = data.sku;
        if (!Object.keys(patch).length) return o;
        return patchSpecialOrder(o.id, patch);
    } catch (e) {
        console.warn('[special-orders] backfill media:', e);
        return o;
    }
}

async function persistSpecialOrder(record) {
    record = normalizeSpecialOrder(record);
    upsertSpecialOrderLocal(record);
    try {
        if (typeof window.saveSpecialOrderToFirebase === 'function' && window.isFirebaseConfigured?.()) {
            const saved = await window.saveSpecialOrderToFirebase(record);
            if (saved?.id) {
                record.id = saved.id;
                upsertSpecialOrderLocal(record);
            }
        }
    } catch (e) {
        console.warn('[special-orders] Firebase save:', e);
    }
    return record;
}

async function patchSpecialOrder(id, patch) {
    const all = await loadAllSpecialOrders();
    const cur = all.find(o => o.id === id) || { id };
    const next = { ...cur, ...patch, id, updated_at: new Date().toISOString() };
    return persistSpecialOrder(next);
}

function buildWarrantySelectHtml(selected = '1', id = 'svc-warranty') {
    const opts = WARRANTY_OPTIONS.map(o =>
        `<option value="${o.value}" ${String(selected) === String(o.value) ? 'selected' : ''}>${o.label}</option>`
    ).join('');
    return `<select id="${id}" class="svc-warranty-select">${opts}</select>`;
}

window.SPECIAL_ORDERS_LOCAL_KEY = SPECIAL_ORDERS_LOCAL_KEY;
window.SHIPPING_RATE_PER_LB = SHIPPING_RATE_PER_LB;
window.WARRANTY_OPTIONS = WARRANTY_OPTIONS;
window.specialStatusLabel = specialStatusLabel;
window.normalizeSpecialOrder = normalizeSpecialOrder;
window.normalizePhone = normalizePhone;
window.formatPhoneDisplay = formatPhoneDisplay;
window.warrantyLabelFromValue = warrantyLabelFromValue;
window.computeWarrantyExpiry = computeWarrantyExpiry;
window.formatDateShort = formatDateShort;
window.getWarrantyInfo = getWarrantyInfo;
window.orderItemTotal = orderItemTotal;
window.orderShipCost = orderShipCost;
window.orderGrandTotal = orderGrandTotal;
window.calcShippingCost = calcShippingCost;
window.loadAllSpecialOrders = loadAllSpecialOrders;
window.persistSpecialOrder = persistSpecialOrder;
window.patchSpecialOrder = patchSpecialOrder;
window.backfillSpecialOrderMedia = backfillSpecialOrderMedia;
window.markSpecialOrderViewed = markSpecialOrderViewed;
window.isSpecialOrderNew = isSpecialOrderNew;
window.getViewedSpecialOrderIds = getViewedSpecialOrderIds;
window.findCustomerByPhone = findCustomerByPhone;
window.saveSpecialCustomer = saveSpecialCustomer;
window.findOrdersByPhone = findOrdersByPhone;
window.buildWarrantySelectHtml = buildWarrantySelectHtml;
