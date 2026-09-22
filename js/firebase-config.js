/**
 * Firebase Firestore — TropiParts (proyecto: tropiplus-supermarket-dm26hn)
 * Plan Spark (free). Square sigue por Vercel / localhost proxy.
 */
const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDArTzzEi7ADjWeBKLY0egJm1wKU3K-3vI',
    authDomain: 'tropiplus-supermarket-dm26hn.firebaseapp.com',
    projectId: 'tropiplus-supermarket-dm26hn',
    storageBucket: 'tropiplus-supermarket-dm26hn.firebasestorage.app',
    messagingSenderId: '765008437935',
    appId: '1:765008437935:web:ae008c7445e5e97e6bea5a'
};

const SUPABASE_CONFIG = {
    url: 'firebase://firestore',
    anonKey: FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith('PEGAR') ? FIREBASE_CONFIG.apiKey : null
};
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;

let _db = null;
let _firebaseReady = null;

function isFirebaseConfigured() {
    return FIREBASE_CONFIG.apiKey && !String(FIREBASE_CONFIG.apiKey).startsWith('PEGAR')
        && FIREBASE_CONFIG.projectId;
}

function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('No se pudo cargar ' + src));
        document.head.appendChild(s);
    });
}

async function ensureFirebase() {
    if (_db) return _db;
    if (_firebaseReady) return _firebaseReady;

    _firebaseReady = (async () => {
        if (!isFirebaseConfigured()) {
            throw new Error('FIREBASE_NO_CONFIG: Falta apiKey en js/firebase-config.js');
        }
        const v = '10.14.1';
        await loadScriptOnce(`https://www.gstatic.com/firebasejs/${v}/firebase-app-compat.js`);
        await loadScriptOnce(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore-compat.js`);
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        _db = firebase.firestore();
        console.log('✅ [Firebase] TropiParts Firestore:', FIREBASE_CONFIG.projectId);
        return _db;
    })();

    return _firebaseReady;
}

function nowIso() {
    return new Date().toISOString();
}

function generateConfirmationCode() {
    // Estilo Western Union MTCN: 10 dígitos
    let n = String(Math.floor(1 + Math.random() * 9));
    for (let i = 0; i < 9; i++) n += String(Math.floor(Math.random() * 10));
    return n;
}

/** Normaliza código de remesa (espacios/guiones → dígitos o REM-###### legado) */
function normalizeRemesaCode(raw) {
    const s = String(raw || '').trim().toUpperCase();
    if (!s) return '';
    const compact = s.replace(/\s+/g, '');
    const digits = compact.replace(/\D/g, '');
    if (/^REM-?\d{6,}$/i.test(compact)) {
        return 'REM-' + digits;
    }
    if (digits.length >= 6 && digits.length <= 12 && !/[A-Z]/.test(compact.replace(/REM-?/i, ''))) {
        return digits;
    }
    return compact;
}

/** Muestra código tipo Western Union: 123 456 7890 */
function formatRemesaCodeDisplay(code) {
    const normalized = normalizeRemesaCode(code);
    if (/^\d{10}$/.test(normalized)) {
        return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`;
    }
    return String(code || normalized || '');
}

async function checkConfirmationCodeExists(code) {
    const db = await ensureFirebase();
    const normalized = normalizeRemesaCode(code);
    const snap = await db.collection('remesas').where('confirmation_code', '==', normalized).limit(1).get();
    if (!snap.empty) return true;
    // Compatibilidad con códigos antiguos sin normalizar
    if (normalized !== code) {
        const snap2 = await db.collection('remesas').where('confirmation_code', '==', String(code).trim()).limit(1).get();
        if (!snap2.empty) return true;
    }
    return false;
}

async function getTvConfigsFromSupabase() {
    const db = await ensureFirebase();
    const snap = await db.collection('tv_configs').where('active', '==', true).get();
    const tvs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('📡 [Firebase] TVs:', tvs.length);
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
}

async function saveTvConfigsToSupabase(tvConfigs) {
    const db = await ensureFirebase();
    const batch = db.batch();
    const activeTvs = (Array.isArray(tvConfigs) ? tvConfigs : []).filter(tv => tv && tv.active !== false);
    for (const tv of activeTvs) {
        const id = tv.id || db.collection('tv_configs').doc().id;
        const ref = db.collection('tv_configs').doc(id);
        batch.set(ref, {
            id,
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
            active: true,
            ticker_enabled: tv.tickerEnabled !== false,
            ticker_speed: tv.tickerSpeed || 'normal',
            ticker_font_size: tv.tickerFontSize || '28px',
            ticker_text_color: tv.tickerTextColor || '#ffec67',
            ticker_bg_color: tv.tickerBgColor || '#000000',
            qr_id: tv.qrId || null,
            qr_url: tv.qrUrl || null,
            qr_size: tv.qrSize || 400,
            screen_orientation: tv.screenOrientation || 'landscape',
            updated_at: nowIso()
        }, { merge: true });
    }
    await batch.commit();
    console.log('✅ [Firebase] TVs guardados:', activeTvs.length);
    return activeTvs;
}

async function deleteTvConfigFromSupabase(tvId) {
    const db = await ensureFirebase();
    await db.collection('tv_configs').doc(tvId).delete();
    return true;
}

async function findRemesaDocByCode(confirmationCode) {
    const db = await ensureFirebase();
    const normalized = normalizeRemesaCode(confirmationCode);
    const candidates = [...new Set([
        normalized,
        String(confirmationCode || '').trim(),
        String(confirmationCode || '').trim().toUpperCase(),
        formatRemesaCodeDisplay(normalized)
    ].filter(Boolean))];

    for (const c of candidates) {
        const snap = await db.collection('remesas').where('confirmation_code', '==', c).limit(1).get();
        if (!snap.empty) return snap.docs[0];
    }
    // Fallback: escanear pendientes si el formato no coincide exacto
    try {
        const pending = await getAllRemesasFromSupabase('pending');
        const hit = pending.find(r => normalizeRemesaCode(r.confirmation_code) === normalized);
        if (hit) {
            return await db.collection('remesas').doc(hit.id).get().then(d => (d.exists ? d : null));
        }
    } catch (_) { /* ignore */ }
    return null;
}

async function saveRemesaToSupabase(remesaData) {
    const db = await ensureFirebase();
    let confirmationCode = generateConfirmationCode();
    for (let i = 0; i < 8; i++) {
        if (!(await checkConfirmationCodeExists(confirmationCode))) break;
        confirmationCode = generateConfirmationCode();
    }
    let amountCup = null;
    if (remesaData.currency === 'CUP' && remesaData.exchangeRate) {
        amountCup = remesaData.amount * remesaData.exchangeRate;
    }
    const ref = db.collection('remesas').doc();
    const payload = {
        id: ref.id,
        order_id: remesaData.orderId,
        remittance_number: confirmationCode,
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
        status: 'pending',
        created_at: nowIso(),
        updated_at: nowIso()
    };
    await ref.set(payload);
    return payload;
}

async function getAllRemesasFromSupabase(status = null) {
    const db = await ensureFirebase();
    let snap;
    try {
        let q = db.collection('remesas').orderBy('created_at', 'desc');
        if (status) q = db.collection('remesas').where('status', '==', status).orderBy('created_at', 'desc');
        snap = await q.get();
    } catch (e) {
        snap = await db.collection('remesas').get();
    }
    let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (status) rows = rows.filter(r => r.status === status);
    rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return rows;
}

async function getUserRemesasFromSupabase(customerId) {
    const db = await ensureFirebase();
    try {
        const snap = await db.collection('remesas')
            .where('sender_customer_id', '==', customerId)
            .orderBy('created_at', 'desc')
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        // Sin índice compuesto: filtrar y ordenar en cliente
        console.warn('[remesas] query con orderBy falló, fallback:', e?.message || e);
        const snap = await db.collection('remesas')
            .where('sender_customer_id', '==', customerId)
            .get();
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        return rows;
    }
}

/**
 * Busca remesas por código WU, nombre del receptor o CI.
 */
async function searchRemesasForEmployee(query, opts = {}) {
    const q = String(query || '').trim();
    if (!q || q.length < 2) return [];
    const onlyPending = opts.onlyPending !== false;
    let all = [];
    try {
        all = onlyPending
            ? await getAllRemesasFromSupabase('pending')
            : await getAllRemesasFromSupabase(null);
    } catch (e) {
        console.warn('[remesas] search load:', e);
        all = await getAllRemesasFromSupabase(null);
        if (onlyPending) all = all.filter(r => r.status === 'pending');
    }

    const code = normalizeRemesaCode(q);
    const qLower = q.toLowerCase();
    const qDigits = q.replace(/\D/g, '');

    return all.filter(r => {
        const cNorm = normalizeRemesaCode(r.confirmation_code || r.remittance_number || '');
        if (code && (cNorm === code || String(r.confirmation_code) === q || String(r.remittance_number) === q)) {
            return true;
        }
        if ((r.recipient_name || '').toLowerCase().includes(qLower)) return true;
        if ((r.sender_name || '').toLowerCase().includes(qLower)) return true;
        const ci = String(r.recipient_id || '').replace(/\D/g, '');
        if (qDigits.length >= 5 && ci && ci.includes(qDigits)) return true;
        if (qDigits.length >= 6 && String(r.order_id || '').includes(qDigits)) return true;
        return false;
    });
}

async function deliverRemesaFromSupabase(confirmationCode, deliveredBy) {
    const doc = await findRemesaDocByCode(confirmationCode);
    if (!doc || !doc.exists) throw new Error('Código de remesa no válido');
    const remesa = doc.data();
    if (remesa.status !== 'pending') {
        throw new Error(`Esta remesa ya fue ${remesa.status === 'delivered' ? 'entregada' : 'cancelada'}`);
    }
    const update = {
        status: 'delivered',
        delivered_at: nowIso(),
        delivered_by: deliveredBy || null,
        updated_at: nowIso()
    };
    await doc.ref.update(update);
    return { id: doc.id, ...remesa, ...update };
}

async function deliverRemesaById(remesaId, deliveredBy) {
    const db = await ensureFirebase();
    const ref = db.collection('remesas').doc(remesaId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Remesa no encontrada');
    const remesa = doc.data();
    if (remesa.status !== 'pending') {
        throw new Error(`Esta remesa ya fue ${remesa.status === 'delivered' ? 'entregada' : 'cancelada'}`);
    }
    const update = {
        status: 'delivered',
        delivered_at: nowIso(),
        delivered_by: deliveredBy || null,
        updated_at: nowIso()
    };
    await ref.update(update);
    return { id: doc.id, ...remesa, ...update };
}

async function cancelRemesaFromSupabase(remesaId) {
    const db = await ensureFirebase();
    const update = { status: 'cancelled', cancelled_at: nowIso(), updated_at: nowIso() };
    await db.collection('remesas').doc(remesaId).update(update);
    const doc = await db.collection('remesas').doc(remesaId).get();
    return { id: doc.id, ...doc.data() };
}

async function saveDeliveryOrderToSupabase(deliveryData) {
    const db = await ensureFirebase();
    const ref = db.collection('delivery_orders').doc();
    const payload = {
        id: ref.id,
        ...deliveryData,
        created_at: deliveryData.created_at || nowIso(),
        updated_at: nowIso()
    };
    await ref.set(payload);
    return payload;
}

async function getDeliveryOrdersFromSupabase(filterStatus = null) {
    try {
        const db = await ensureFirebase();
        let snap;
        if (filterStatus) {
            snap = await db.collection('delivery_orders').where('status', '==', filterStatus).orderBy('created_at', 'desc').get();
        } else {
            snap = await db.collection('delivery_orders').orderBy('created_at', 'desc').get();
        }
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error('❌ [Firebase] delivery_orders:', e);
        return [];
    }
}

async function updateDeliveryOrderStatus(orderId, newStatus) {
    const db = await ensureFirebase();
    const snap = await db.collection('delivery_orders').where('order_id', '==', orderId).limit(1).get();
    if (snap.empty) throw new Error('Orden no encontrada');
    const update = { status: newStatus, updated_at: nowIso() };
    await snap.docs[0].ref.update(update);
    return { id: snap.docs[0].id, ...snap.docs[0].data(), ...update };
}

async function getSuppliersFromSupabase() {
    try {
        const db = await ensureFirebase();
        const snap = await db.collection('suppliers').orderBy('created_at', 'desc').get();
        return snap.docs.map(d => {
            const s = d.data();
            return {
                id: d.id,
                name: s.name,
                address: s.address || '',
                url: s.url || '',
                notes: s.notes || '',
                createdAt: s.created_at,
                updatedAt: s.updated_at
            };
        });
    } catch (e) {
        return [];
    }
}

async function saveSupplierToSupabase(supplierData) {
    const db = await ensureFirebase();
    const payload = {
        name: supplierData.name,
        address: supplierData.address || null,
        url: supplierData.url || null,
        notes: supplierData.notes || null,
        updated_at: nowIso()
    };
    if (supplierData.id) {
        await db.collection('suppliers').doc(supplierData.id).set(payload, { merge: true });
        return { id: supplierData.id, ...payload };
    }
    payload.created_at = nowIso();
    const ref = await db.collection('suppliers').add(payload);
    return { id: ref.id, ...payload };
}

async function deleteSupplierFromSupabase(supplierId) {
    const db = await ensureFirebase();
    await db.collection('suppliers').doc(supplierId).delete();
    return true;
}

async function getProductSuppliersFromSupabase() {
    try {
        const db = await ensureFirebase();
        const snap = await db.collection('product_suppliers').get();
        return snap.docs.map(d => {
            const row = d.data();
            return {
                mappingKey: row.mapping_key || d.id,
                productId: row.product_id,
                variationId: row.variation_id,
                name: row.name || '',
                address: row.address || '',
                url: row.url || '',
                purchaseUrl: row.purchase_url || '',
                imageUrl: row.image_url || '',
                notes: row.notes || '',
                updatedAt: row.updated_at || row.created_at
            };
        });
    } catch (e) {
        return [];
    }
}

async function saveProductSupplierToSupabase(data) {
    const db = await ensureFirebase();
    const mappingKey = data.mappingKey || data.mapping_key || data.variationId || data.variation_id || data.productId || data.product_id;
    const productId = data.productId || data.product_id;
    if (!mappingKey || !productId) throw new Error('Faltan mappingKey o productId');
    const payload = {
        mapping_key: mappingKey,
        product_id: productId,
        variation_id: data.variationId || data.variation_id || null,
        name: data.name || null,
        address: data.address || null,
        url: data.url || null,
        purchase_url: data.purchaseUrl || data.purchase_url || null,
        image_url: data.imageUrl || data.image_url || null,
        notes: data.notes || null,
        updated_at: nowIso()
    };
    await db.collection('product_suppliers').doc(mappingKey).set(payload, { merge: true });
    return { id: mappingKey, ...payload };
}

async function getHomeBannersFromFirebase(activeOnly = false) {
    const db = await ensureFirebase();
    const snap = await db.collection('home_banners').get();
    let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (activeOnly) rows = rows.filter(b => b.active !== false);
    rows.sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
    return rows;
}

async function saveHomeBannerToFirebase(bannerData) {
    const db = await ensureFirebase();
    const id = bannerData.id || `banner_${Date.now()}`;
    const payload = {
        id,
        image_url: bannerData.image_url,
        display_order: bannerData.display_order || 1,
        redirect_url: bannerData.redirect_url || null,
        active: bannerData.active !== false,
        updated_at: nowIso()
    };
    await db.collection('home_banners').doc(id).set(payload, { merge: true });
    return payload;
}

async function deleteHomeBannerFromFirebase(bannerId) {
    const db = await ensureFirebase();
    await db.collection('home_banners').doc(bannerId).delete();
    return true;
}

async function getFeaturedCardsFromFirebase(activeOnly = false) {
    const db = await ensureFirebase();
    const snap = await db.collection('featured_cards').get();
    let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (activeOnly) rows = rows.filter(c => c.active !== false);
    rows.sort((a, b) => (a.display_order || 999) - (b.display_order || 999));
    return rows;
}

async function saveFeaturedCardToFirebase(cardData) {
    const db = await ensureFirebase();
    const id = cardData.id || `card_${Date.now()}`;
    const payload = {
        id,
        image_url: cardData.image_url,
        display_order: cardData.display_order || 1,
        redirect_url: cardData.redirect_url || null,
        active: cardData.active !== false,
        updated_at: nowIso()
    };
    await db.collection('featured_cards').doc(id).set(payload, { merge: true });
    return payload;
}

async function deleteFeaturedCardFromFirebase(cardId) {
    const db = await ensureFirebase();
    await db.collection('featured_cards').doc(cardId).delete();
    return true;
}

async function getSiteSettingFromFirebase(key) {
    const db = await ensureFirebase();
    const doc = await db.collection('site_settings').doc(key).get();
    if (!doc.exists) return null;
    return doc.data().value;
}

async function setSiteSettingToFirebase(key, value) {
    const db = await ensureFirebase();
    await db.collection('site_settings').doc(key).set({ key, value: String(value), updated_at: nowIso() }, { merge: true });
    return true;
}

async function saveSpecialOrderToFirebase(orderData) {
    const db = await ensureFirebase();
    const ref = orderData.id ? db.collection('special_orders').doc(orderData.id) : db.collection('special_orders').doc();
    const payload = {
        id: ref.id,
        ...orderData,
        updated_at: nowIso(),
        created_at: orderData.created_at || nowIso()
    };
    await ref.set(payload, { merge: true });
    return payload;
}

async function getSpecialOrdersFromFirebase(status = null) {
    const db = await ensureFirebase();
    let snap;
    try {
        if (status) {
            snap = await db.collection('special_orders').where('status', '==', status).orderBy('created_at', 'desc').get();
        } else {
            snap = await db.collection('special_orders').orderBy('created_at', 'desc').get();
        }
    } catch (e) {
        snap = await db.collection('special_orders').get();
    }
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return rows;
}

async function updateSpecialOrderStatusFirebase(orderId, status, extra = {}) {
    const db = await ensureFirebase();
    await db.collection('special_orders').doc(orderId).set({
        status,
        ...extra,
        updated_at: nowIso()
    }, { merge: true });
    return true;
}

window.getTvConfigsFromSupabase = getTvConfigsFromSupabase;
window.saveTvConfigsToSupabase = saveTvConfigsToSupabase;
window.deleteTvConfigFromSupabase = deleteTvConfigFromSupabase;
window.saveRemesaToSupabase = saveRemesaToSupabase;
window.getAllRemesasFromSupabase = getAllRemesasFromSupabase;
window.getUserRemesasFromSupabase = getUserRemesasFromSupabase;
window.deliverRemesaFromSupabase = deliverRemesaFromSupabase;
window.cancelRemesaFromSupabase = cancelRemesaFromSupabase;
window.generateConfirmationCode = generateConfirmationCode;
window.normalizeRemesaCode = normalizeRemesaCode;
window.formatRemesaCodeDisplay = formatRemesaCodeDisplay;
window.searchRemesasForEmployee = searchRemesasForEmployee;
window.deliverRemesaById = deliverRemesaById;
window.saveDeliveryOrderToSupabase = saveDeliveryOrderToSupabase;
window.getDeliveryOrdersFromSupabase = getDeliveryOrdersFromSupabase;
window.updateDeliveryOrderStatus = updateDeliveryOrderStatus;
window.getSuppliersFromSupabase = getSuppliersFromSupabase;
window.saveSupplierToSupabase = saveSupplierToSupabase;
window.deleteSupplierFromSupabase = deleteSupplierFromSupabase;
window.getProductSuppliersFromSupabase = getProductSuppliersFromSupabase;
window.saveProductSupplierToSupabase = saveProductSupplierToSupabase;
window.getHomeBannersFromFirebase = getHomeBannersFromFirebase;
window.saveHomeBannerToFirebase = saveHomeBannerToFirebase;
window.deleteHomeBannerFromFirebase = deleteHomeBannerFromFirebase;
window.getFeaturedCardsFromFirebase = getFeaturedCardsFromFirebase;
window.saveFeaturedCardToFirebase = saveFeaturedCardToFirebase;
window.deleteFeaturedCardFromFirebase = deleteFeaturedCardFromFirebase;
window.getSiteSettingFromFirebase = getSiteSettingFromFirebase;
window.setSiteSettingToFirebase = setSiteSettingToFirebase;
window.saveSpecialOrderToFirebase = saveSpecialOrderToFirebase;
window.getSpecialOrdersFromFirebase = getSpecialOrdersFromFirebase;
window.updateSpecialOrderStatusFirebase = updateSpecialOrderStatusFirebase;

async function saveSpecialCustomerToFirebase(customer) {
    const db = await ensureFirebase();
    const phone = String(customer.phone || '').replace(/\D/g, '');
    if (!phone) throw new Error('Teléfono requerido');
    const ref = db.collection('special_customers').doc(customer.id || ('cust_' + phone));
    const payload = {
        id: ref.id,
        ...customer,
        phone,
        updated_at: nowIso(),
        created_at: customer.created_at || nowIso()
    };
    await ref.set(payload, { merge: true });
    return payload;
}

async function getSpecialCustomerByPhoneFirebase(phoneRaw) {
    const db = await ensureFirebase();
    const phone = String(phoneRaw || '').replace(/\D/g, '');
    if (!phone) return null;
    try {
        const byId = await db.collection('special_customers').doc('cust_' + phone).get();
        if (byId.exists) return { id: byId.id, ...byId.data() };
    } catch (_) { /* continue */ }
    try {
        const snap = await db.collection('special_customers').where('phone', '==', phone).limit(1).get();
        if (!snap.empty) {
            const d = snap.docs[0];
            return { id: d.id, ...d.data() };
        }
    } catch (e) {
        console.warn('[firebase] getSpecialCustomerByPhone:', e);
    }
    return null;
}

window.saveSpecialCustomerToFirebase = saveSpecialCustomerToFirebase;
window.getSpecialCustomerByPhoneFirebase = getSpecialCustomerByPhoneFirebase;
window.ensureFirebase = ensureFirebase;
window.isFirebaseConfigured = isFirebaseConfigured;
