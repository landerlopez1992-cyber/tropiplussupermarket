/**
 * Servicio — pedidos especiales
 * Flujo: teléfono → cliente → producto + garantía → Cash|Square → crear
 * Localizar: historial + garantía restante por teléfono
 */
(function () {
    'use strict';

    let squarePayments = null;
    let squareCard = null;
    let paying = false;
    let statusFilter = '';
    let activeCustomer = null; // { phone, given_name, family_name, name }

    function $(id) { return document.getElementById(id); }

    function requireEmployee() {
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        if (!user) {
            window.location.href = 'index.html';
            return null;
        }
        const ok = typeof isUserEmployee === 'function'
            ? isUserEmployee()
            : (user.isEmployee === true || user.isAdmin === true ||
               user.role === 'empleado' || user.role === 'employee' || user.role === 'admin');
        if (!ok) {
            if (typeof showAlert === 'function') {
                showAlert('Acceso restringido', 'Acceso solo para empleados de servicio.', 'warning')
                    .then(() => { window.location.href = 'index.html'; });
            } else {
                window.location.href = 'index.html';
            }
            return null;
        }
        return user;
    }

    function formatMoney(n) {
        return '$' + (Number(n) || 0).toFixed(2);
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function setError(msg) {
        const el = $('svc-error');
        if (!el) return;
        el.style.display = msg ? 'block' : 'none';
        el.textContent = msg || '';
        el.style.color = '#c62828';
    }

    function setPayMsg(msg, ok) {
        const el = $('svc-pay-msg');
        if (!el) return;
        el.style.display = msg ? 'block' : 'none';
        el.textContent = msg || '';
        el.style.color = ok ? '#15803d' : '#c62828';
    }

    function setCustomerMsg(msg, ok) {
        const el = $('svc-customer-msg');
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = ok ? '#15803d' : '#64748b';
    }

    async function fetchProductFromUrl(url) {
        const res = await fetch('/api/product-from-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo detectar el producto');
        return data;
    }

    let phonePinCreate = null;
    let phonePinLocate = null;

    function getCreatePhoneRaw() {
        if (phonePinCreate) return phonePinCreate.getValue();
        if (typeof window.getCubaPhoneFromPin === 'function') {
            return window.getCubaPhoneFromPin('svc-phone-pin') || '';
        }
        return ($('svc-phone')?.value || '').trim();
    }

    function getLocatePhoneRaw() {
        if (phonePinLocate) return phonePinLocate.getValue();
        if (typeof window.getCubaPhoneFromPin === 'function') {
            return window.getCubaPhoneFromPin('svc-locate-phone-pin') || '';
        }
        return ($('svc-locate-phone')?.value || '').trim();
    }

    function syncPhoneHidden(which) {
        if (which === 'create' || !which) {
            const v = getCreatePhoneRaw();
            if ($('svc-phone')) $('svc-phone').value = v.length === 8 ? '53' + v : v;
        }
        if (which === 'locate' || !which) {
            const v = getLocatePhoneRaw();
            if ($('svc-locate-phone')) $('svc-locate-phone').value = v.length === 8 ? '53' + v : v;
        }
    }

    function initPhonePins() {
        if (typeof window.mountPhonePinCuba !== 'function') return;
        if ($('svc-phone-pin') && !phonePinCreate) {
            phonePinCreate = window.mountPhonePinCuba('svc-phone-pin', {
                instanceKey: 'svc-phone-pin',
                hiddenInputId: 'svc-phone',
                onEnter: () => onPhoneLookup(),
                onChange: () => syncPhoneHidden('create')
            });
        }
        if ($('svc-locate-phone-pin') && !phonePinLocate) {
            phonePinLocate = window.mountPhonePinCuba('svc-locate-phone-pin', {
                instanceKey: 'svc-locate-phone-pin',
                hiddenInputId: 'svc-locate-phone',
                onEnter: () => onLocateSearch(),
                onChange: () => syncPhoneHidden('locate')
            });
        }
    }

    function openModal() {
        const m = $('svc-create-modal');
        if (m) m.style.display = 'flex';
        resetModal();
        showCustomerStep();
    }

    function closeModal() {
        const m = $('svc-create-modal');
        if (m) m.style.display = 'none';
        destroySquareCard();
        resetModal();
    }

    function resetModal() {
        paying = false;
        activeCustomer = null;
        ['svc-phone', 'svc-given-name', 'svc-family-name', 'svc-url', 'svc-name', 'svc-price',
            'svc-sku', 'svc-image', 'svc-notes'].forEach(id => {
            if ($(id)) $(id).value = '';
        });
        if (phonePinCreate) phonePinCreate.clear();
        if ($('svc-qty')) $('svc-qty').value = '1';
        if ($('svc-warranty')) $('svc-warranty').value = '';
        const wHint = $('svc-warranty-hint');
        if (wHint) { wHint.textContent = ''; }
        const preview = $('svc-preview');
        if (preview) preview.style.display = 'none';
        const pay = $('svc-pay-step');
        if (pay) pay.style.display = 'none';
        const cardPanel = $('svc-card-panel');
        if (cardPanel) cardPanel.style.display = 'none';
        const fields = $('svc-customer-fields');
        if (fields) fields.style.display = 'none';
        if ($('svc-submit')) $('svc-submit').style.display = 'none';
        setError('');
        setPayMsg('');
        setCustomerMsg('');
        setTimeout(() => phonePinCreate?.focusFirstEmpty?.(), 80);
    }

    function showCustomerStep() {
        if ($('svc-step-customer')) $('svc-step-customer').style.display = 'block';
        if ($('svc-step-product')) $('svc-step-product').style.display = 'none';
        if ($('svc-submit')) $('svc-submit').style.display = 'none';
    }

    function showProductStep() {
        if ($('svc-step-customer')) $('svc-step-customer').style.display = 'none';
        if ($('svc-step-product')) $('svc-step-product').style.display = 'block';
        if ($('svc-submit')) $('svc-submit').style.display = '';
        const chip = $('svc-customer-chip');
        if (chip && activeCustomer) {
            chip.innerHTML = `<i class="fas fa-user"></i> ${escapeHtml(activeCustomer.name || '')} · ${escapeHtml(window.formatPhoneDisplay?.(activeCustomer.phone) || activeCustomer.phone)}`;
        }
    }

    async function onPhoneLookup() {
        syncPhoneHidden('create');
        const raw = getCreatePhoneRaw();
        const phone = window.normalizePhone?.(raw.length === 8 ? '53' + raw : raw) || raw.replace(/\D/g, '');
        if (!phone || phone.length < 8) {
            setCustomerMsg('Ingresa los 8 dígitos del teléfono (+53).');
            phonePinCreate?.focusFirstEmpty?.();
            return;
        }
        setCustomerMsg('Buscando…');
        if (typeof showLoadingModal === 'function') showLoadingModal('Buscando cliente…');
        const fields = $('svc-customer-fields');
        if (fields) fields.style.display = 'block';
        try {
            const found = await window.findCustomerByPhone(phone);
            if (found) {
                activeCustomer = {
                    phone: window.normalizePhone(found.phone || phone),
                    given_name: found.given_name || '',
                    family_name: found.family_name || '',
                    name: found.name || `${found.given_name || ''} ${found.family_name || ''}`.trim()
                };
                if ($('svc-given-name')) $('svc-given-name').value = activeCustomer.given_name;
                if ($('svc-family-name')) $('svc-family-name').value = activeCustomer.family_name;
                if (phonePinCreate) phonePinCreate.setValue(activeCustomer.phone);
                syncPhoneHidden('create');
                setCustomerMsg(`Cliente encontrado: ${activeCustomer.name || activeCustomer.phone}`, true);
            } else {
                activeCustomer = { phone, given_name: '', family_name: '', name: '' };
                if ($('svc-given-name')) $('svc-given-name').value = '';
                if ($('svc-family-name')) $('svc-family-name').value = '';
                setCustomerMsg('Cliente nuevo: completa nombre y apellido.');
            }
        } catch (e) {
            setCustomerMsg(e.message || 'Error al buscar');
        } finally {
            if (typeof hideLoadingModal === 'function') hideLoadingModal();
        }
    }

    async function onCustomerContinue() {
        syncPhoneHidden('create');
        const raw = getCreatePhoneRaw();
        const phone = window.normalizePhone?.(raw.length === 8 ? '53' + raw : ($('svc-phone')?.value || '').trim()) || '';
        const given = ($('svc-given-name')?.value || '').trim();
        const family = ($('svc-family-name')?.value || '').trim();
        if (!phone || phone.length < 8) {
            setError('Teléfono requerido.');
            return;
        }
        if (!given || !family) {
            setError('Nombre y apellido son obligatorios.');
            return;
        }
        setError('');
        activeCustomer = {
            phone,
            given_name: given,
            family_name: family,
            name: `${given} ${family}`.trim()
        };
        try {
            await window.saveSpecialCustomer(activeCustomer);
        } catch (e) {
            console.warn('[servicio] save customer:', e);
        }
        showProductStep();
    }

    function getFormTotals() {
        const price = parseFloat($('svc-price')?.value) || 0;
        const qty = Math.max(1, parseInt($('svc-qty')?.value, 10) || 1);
        return { price, qty, total: Math.round(price * qty * 100) / 100 };
    }

    function validateForm() {
        if (!activeCustomer?.phone) {
            setError('Primero registra el cliente por teléfono.');
            showCustomerStep();
            return false;
        }
        const name = ($('svc-name')?.value || '').trim();
        const { price, total } = getFormTotals();
        const warranty = ($('svc-warranty')?.value || '').trim();
        if (!name) {
            setError('Indica el nombre del producto.');
            return false;
        }
        if (!(price > 0)) {
            setError('Indica un precio válido.');
            return false;
        }
        if (!(total > 0)) {
            setError('Total inválido.');
            return false;
        }
        if (!warranty) {
            setError('Selecciona la garantía.');
            return false;
        }
        setError('');
        return true;
    }

    async function onDetect() {
        const url = ($('svc-url')?.value || '').trim();
        if (!url) {
            setError('Pega la URL del producto.');
            return;
        }
        const btn = $('svc-fetch-url');
        if (btn) btn.disabled = true;
        setError('');
        if (typeof showLoadingModal === 'function') {
            showLoadingModal('Detectando producto…');
        }
        try {
            const p = await fetchProductFromUrl(url);
            if (p.name && $('svc-name')) $('svc-name').value = p.name;
            if (p.price != null && Number(p.price) > 0 && $('svc-price')) {
                $('svc-price').value = String(p.price);
            }
            if (p.sku && $('svc-sku')) $('svc-sku').value = p.sku;
            const img = (p.image || p.image_url || '').trim();
            if (img && $('svc-image')) $('svc-image').value = img;

            // Garantía desde AutoZone si vino en el scrape
            const wHint = $('svc-warranty-hint');
            if (p.warranty && $('svc-warranty')) {
                $('svc-warranty').value = String(p.warranty);
                if (wHint) {
                    wHint.textContent = p.warranty_raw
                        ? `Detectada desde AutoZone: ${p.warranty_raw}`
                        : 'Garantía detectada desde la URL.';
                    wHint.style.color = '#15803d';
                }
            } else if (wHint) {
                wHint.textContent = 'No se detectó garantía en la URL — selecciona manualmente.';
                wHint.style.color = '#b45309';
            }

            const preview = $('svc-preview');
            if (preview) {
                preview.style.display = 'flex';
                if ($('svc-preview-img')) {
                    $('svc-preview-img').src = img || '';
                    $('svc-preview-img').style.display = img ? 'block' : 'none';
                    $('svc-preview-img').onerror = function () { this.style.display = 'none'; };
                }
                if ($('svc-preview-name')) $('svc-preview-name').textContent = p.name || '—';
                if ($('svc-preview-price')) {
                    const pr = p.price != null ? Number(p.price) : parseFloat($('svc-price')?.value);
                    $('svc-preview-price').textContent = pr > 0 ? formatMoney(pr) : (p.warning || 'Completa el precio');
                }
            }
            if (p.warning) setError(p.warning);
            else if (p.partial) setError('Detección parcial: completa precio/foto a mano.');
        } catch (e) {
            setError(e.message || 'Error al detectar');
        } finally {
            if (typeof hideLoadingModal === 'function') hideLoadingModal();
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-search"></i> Detectar';
            }
        }
    }

    function onSubmitClick() {
        if (!validateForm()) return;
        const { total } = getFormTotals();
        const pay = $('svc-pay-step');
        if (pay) pay.style.display = 'block';
        if ($('svc-pay-amount')) $('svc-pay-amount').textContent = formatMoney(total);
        if ($('svc-card-panel')) $('svc-card-panel').style.display = 'none';
        if ($('svc-submit')) $('svc-submit').style.display = 'none';
        setPayMsg('');
        pay?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function destroySquareCard() {
        try {
            if (squareCard) {
                await squareCard.destroy();
                squareCard = null;
            }
        } catch (_) { /* ignore */ }
        const container = $('svc-card-container');
        if (container) container.innerHTML = '';
    }

    async function initSquareCard() {
        await destroySquareCard();
        if (typeof Square === 'undefined') throw new Error('SDK de Square no cargado');
        if (!window.SQUARE_CONFIG?.applicationId || !window.SQUARE_CONFIG?.locationId) {
            throw new Error('Square no configurado');
        }
        squarePayments = Square.payments(SQUARE_CONFIG.applicationId, SQUARE_CONFIG.locationId);
        squareCard = await squarePayments.card({
            style: { '.input-container': { borderColor: '#e0e0e0', borderRadius: '6px' } }
        });
        await squareCard.attach('#svc-card-container');
    }

    async function onPayCardOpen() {
        setPayMsg('');
        const panel = $('svc-card-panel');
        if (panel) panel.style.display = 'block';
        try {
            await initSquareCard();
            setPayMsg('Ingresa la tarjeta y confirma el cobro.', true);
        } catch (e) {
            setPayMsg(e.message || 'No se pudo abrir el formulario de tarjeta');
            if (panel) panel.style.display = 'none';
        }
    }

    function buildRecord(user, paymentMethod, squareOrderId, paymentId) {
        const { price, qty, total } = getFormTotals();
        const now = new Date().toISOString();
        const id = 'so_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const imageUrl = ($('svc-image')?.value || '').trim()
            || ($('svc-preview-img')?.getAttribute('src') || '').trim();
        const warrantyVal = ($('svc-warranty')?.value || '1').trim();
        const lifetime = warrantyVal === 'lifetime';
        const purchase_date = now;
        const warranty_expires_at = lifetime
            ? null
            : window.computeWarrantyExpiry?.(purchase_date, warrantyVal);
        const warranty_label = window.warrantyLabelFromValue?.(warrantyVal) || warrantyVal;

        const record = {
            id,
            status: 'processing',
            product_name: ($('svc-name')?.value || '').trim(),
            product_price: price,
            quantity: qty,
            total_amount: total,
            product_image: imageUrl,
            image: imageUrl,
            image_url: imageUrl,
            product_sku: ($('svc-sku')?.value || '').trim(),
            product_url: ($('svc-url')?.value || '').trim(),
            notes: ($('svc-notes')?.value || '').trim(),
            payment_method: paymentMethod,
            product_paid: true,
            product_payment_id: paymentId || null,
            shipping_lb: null,
            shipping_extra: 0,
            shipping_cost: 0,
            shipping_paid: false,
            shipping_payment_method: null,
            admin_viewed: false,
            created_by: user.email || user.id || 'empleado',
            created_at: now,
            updated_at: now,
            square_order_id: squareOrderId || null,
            customer_phone: activeCustomer.phone,
            customer_given_name: activeCustomer.given_name,
            customer_family_name: activeCustomer.family_name,
            customer_name: activeCustomer.name,
            warranty_years: lifetime ? 'lifetime' : parseInt(warrantyVal, 10),
            warranty_lifetime: lifetime,
            warranty_label,
            purchase_date,
            warranty_expires_at
        };
        return window.normalizeSpecialOrder ? window.normalizeSpecialOrder(record) : record;
    }

    async function createViaSquare(paymentMethod, paymentToken) {
        const { price, qty } = getFormTotals();
        const name = ($('svc-name')?.value || '').trim();
        const cartItems = [{
            name,
            price,
            quantity: qty,
            type: 'special_order',
            catalogObjectId: null,
            variationId: null
        }];
        if (typeof createSquareOrder !== 'function') {
            throw new Error('createSquareOrder no disponible');
        }
        const order = await createSquareOrder(cartItems, null, paymentMethod, paymentToken, 'pickup', null);
        return { squareOrderId: order?.id || null };
    }

    async function onPayCash() {
        if (paying) return;
        if (!validateForm()) return;
        const user = requireEmployee();
        if (!user) return;
        paying = true;
        setPayMsg('Registrando pago Cash…', true);
        try {
            let squareOrderId = null;
            try {
                const r = await createViaSquare('CASH', null);
                squareOrderId = r.squareOrderId;
            } catch (e) {
                console.warn('[servicio] Square CASH falló, guardando local:', e);
            }
            const record = buildRecord(user, 'CASH', squareOrderId, null);
            await window.persistSpecialOrder(record);
            await window.saveSpecialCustomer?.(activeCustomer);
            closeModal();
            await renderOrders();
        } catch (e) {
            setPayMsg(e.userMessage || e.message || 'Error al cobrar Cash');
        } finally {
            paying = false;
        }
    }

    async function onPayCardConfirm() {
        if (paying || !squareCard) return;
        if (!validateForm()) return;
        const user = requireEmployee();
        if (!user) return;
        paying = true;
        const btn = $('svc-pay-card-confirm');
        if (btn) btn.disabled = true;
        if (typeof showLoadingModal === 'function') showLoadingModal('Procesando pago…');
        setPayMsg('Procesando tarjeta…', true);
        try {
            const result = await squareCard.tokenize();
            if (result.status !== 'OK') {
                throw new Error(result.errors?.[0]?.message || 'Tokenización fallida');
            }
            const r = await createViaSquare('CARD', result.token);
            const record = buildRecord(user, 'CARD', r.squareOrderId, null);
            await window.persistSpecialOrder(record);
            await window.saveSpecialCustomer?.(activeCustomer);
            setPayMsg('Pago exitoso. Orden creada.', true);
            closeModal();
            await renderOrders();
        } catch (e) {
            setPayMsg(e.userMessage || e.message || 'Error al cobrar con tarjeta. La orden no se creó.');
        } finally {
            paying = false;
            if (typeof hideLoadingModal === 'function') hideLoadingModal();
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Cobrar con tarjeta'; }
        }
    }

    function paymentBadge(method) {
        if (method === 'CASH') {
            return '<span class="svc-pay-badge cash"><i class="fas fa-money-bill-wave"></i> Cash</span>';
        }
        if (method === 'CARD') {
            return '<span class="svc-pay-badge card"><i class="fas fa-credit-card"></i> Square</span>';
        }
        if (method === 'WARRANTY' || method === 'GARANTIA') {
            return '<span class="svc-pay-badge warranty"><i class="fas fa-shield-alt"></i> Garantía</span>';
        }
        return '<span class="svc-pay-badge">—</span>';
    }

    function statusClass(s) {
        return 'svc-status svc-status-' + (s || 'processing');
    }

    function orderImageUrl(o) {
        return (o.product_image || o.image || o.image_url || '').trim();
    }

    function renderOrderCard(o) {
        o = window.normalizeSpecialOrder?.(o) || o;
        const status = o.status || 'processing';
        const itemTotal = window.orderItemTotal?.(o) ?? ((o.product_price || 0) * (o.quantity || 1));
        const shipCost = window.orderShipCost?.(o) || 0;
        const grandTotal = window.orderGrandTotal?.(o) ?? (itemTotal + shipCost);
        const canDeliver = status === 'shipped';
        const img = orderImageUrl(o);
        const hasShip = shipCost > 0 || (o.shipping_lb != null && o.shipping_lb > 0);
        const needShipPay = status === 'shipped' && !o.shipping_paid && shipCost > 0;
        const w = window.getWarrantyInfo?.(o) || {};
        const purchaseLabel = window.formatDateShort?.(o.purchase_date || o.created_at) || '—';

        return `
        <article class="svc-order-card" data-id="${escapeHtml(o.id)}">
            <div class="svc-order-media">
                ${img
                    ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.style.display='flex');"><div class="svc-img-fallback" style="display:none;width:96px;height:96px;background:#f5f5f5;align-items:center;justify-content:center;color:#999;"><i class="fas fa-box"></i></div>`
                    : '<div style="width:96px;height:96px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;color:#999;"><i class="fas fa-box"></i></div>'}
            </div>
            <div style="flex:1;">
                <div class="svc-order-top">
                    <h3>${escapeHtml(o.product_name || 'Producto')}</h3>
                    <span class="${statusClass(status)}">${escapeHtml(window.specialStatusLabel?.(status) || status)}</span>
                </div>
                ${o.customer_name || o.customer_phone ? `
                <div class="svc-meta"><i class="fas fa-user"></i> ${escapeHtml(o.customer_name || '')} · ${escapeHtml(window.formatPhoneDisplay?.(o.customer_phone) || o.customer_phone || '')}</div>
                ` : ''}
                ${o.is_warranty_replacement || o.replaced_order_id ? `
                <div class="svc-meta"><span class="svc-pay-badge warranty"><i class="fas fa-shield-alt"></i> Reemplazo garantía</span> · Artículo ya pagado · Solo falta envío</div>
                ` : ''}
                <div class="svc-meta">Artículo: ${formatMoney(itemTotal)} · Cant. ${o.quantity || 1} · ${paymentBadge(o.payment_method)}</div>
                ${hasShip ? `
                <div class="svc-meta">Envío: ${formatMoney(shipCost)}${o.shipping_lb ? ` (${o.shipping_lb} lb)` : ''}${o.shipping_paid ? ' · cobrado' : ' · pendiente'}</div>
                <div class="svc-meta" style="font-weight:700;color:#111;font-size:15px;">Total: ${formatMoney(grandTotal)}</div>
                ` : `
                <div class="svc-meta" style="font-weight:700;color:#111;">Total artículo: ${formatMoney(itemTotal)}</div>
                `}
                ${o.warranty_label ? `
                <div class="svc-meta svc-warranty-line">
                    <i class="fas fa-shield-alt"></i> Garantía: <strong>${escapeHtml(o.warranty_label)}</strong>
                    · Compra: ${escapeHtml(purchaseLabel)}
                    ${w.lifetime ? '' : ` · Resta: <strong>${escapeHtml(w.remaining_label || '—')}</strong>`}
                    ${w.expired ? ' <span style="color:#c62828;">(vencida)</span>' : ''}
                </div>
                ` : ''}
                ${o.product_sku ? `<div class="svc-meta">SKU: ${escapeHtml(o.product_sku)}</div>` : ''}
                ${o.notes ? `<div class="svc-meta">${escapeHtml(o.notes)}</div>` : ''}
                <div class="svc-actions svc-actions-main">
                    ${status !== 'cancelled' && status !== 'received' ? `
                    <button type="button" class="svc-btn svc-btn-cancel" data-action="cancel" data-id="${escapeHtml(o.id)}">Cancelar</button>
                    <button type="button" class="svc-btn svc-btn-print" data-action="print" data-id="${escapeHtml(o.id)}">Imprimir</button>
                    ` : (status === 'received' || status === 'cancelled' ? `
                    <button type="button" class="svc-btn svc-btn-print" data-action="print" data-id="${escapeHtml(o.id)}">Imprimir</button>
                    ` : '')}
                    ${needShipPay ? `
                    <button type="button" class="svc-btn svc-btn-ship-cash" data-action="ship-cash" data-id="${escapeHtml(o.id)}">
                        <i class="fas fa-money-bill-wave"></i> Cobrar envío Cash ${formatMoney(shipCost)}
                    </button>
                    <button type="button" class="svc-btn svc-btn-ship-card" data-action="ship-card" data-id="${escapeHtml(o.id)}">
                        <i class="fas fa-credit-card"></i> Cobrar envío Square
                    </button>
                    ` : ''}
                    ${canDeliver
                        ? `<button type="button" class="svc-btn svc-btn-done" data-action="deliver" data-id="${escapeHtml(o.id)}">Entregado</button>`
                        : ''}
                </div>
            </div>
        </article>`;
    }

    async function renderOrders() {
        const list = $('servicio-orders-list');
        if (!list) return;
        list.innerHTML = '<p class="svc-loading">Cargando pedidos…</p>';
        try {
            let orders = await window.loadAllSpecialOrders();
            const repaired = [];
            for (const o of orders) {
                if ((!orderImageUrl(o) || !(o.product_price > 0)) && o.product_url && typeof window.backfillSpecialOrderMedia === 'function') {
                    repaired.push(window.backfillSpecialOrderMedia(o));
                }
            }
            if (repaired.length) {
                await Promise.all(repaired);
                orders = await window.loadAllSpecialOrders();
            }
            if (statusFilter) {
                orders = orders.filter(o => (o.status || 'processing') === statusFilter);
            }
            if (!orders.length) {
                list.innerHTML = '<p class="svc-loading">No hay pedidos en este filtro.</p>';
                return;
            }
            list.innerHTML = orders.map(renderOrderCard).join('');
            list.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
            });
        } catch (e) {
            list.innerHTML = `<p class="svc-error">Error: ${escapeHtml(e.message)}</p>`;
        }
    }

    async function handleAction(action, id) {
        if (action === 'cancel') {
            const ok = typeof showConfirm === 'function'
                ? await showConfirm('Cancelar orden', '¿Cancelar esta orden?', { confirmText: 'Sí, cancelar', type: 'warning' })
                : true;
            if (!ok) return;
            await window.patchSpecialOrder(id, { status: 'cancelled' });
            await renderOrders();
        } else if (action === 'ship-cash' || action === 'ship-card') {
            await chargeEmployeeShipping(id, action === 'ship-cash' ? 'CASH' : 'CARD');
        } else if (action === 'deliver') {
            const ok = typeof showConfirm === 'function'
                ? await showConfirm(
                    'Entregar',
                    '¿El producto ya llegó a tienda y se entrega al cliente? Se marcará como Entregado.',
                    { confirmText: 'Entregado', type: 'confirm' }
                )
                : true;
            if (!ok) return;
            await window.patchSpecialOrder(id, { status: 'received' });
            await renderOrders();
            if (locateViewPhone) await refreshCustomerScreen();
        } else if (action === 'print') {
            printOrder(id);
        }
    }

    async function chargeEmployeeShipping(id, method) {
        const orders = await window.loadAllSpecialOrders();
        const o = window.normalizeSpecialOrder?.(orders.find(x => x.id === id)) || orders.find(x => x.id === id);
        if (!o) return;
        if (o.status !== 'shipped') {
            if (typeof showAlert === 'function') {
                await showAlert('Estado', 'El pedido debe estar Enviado para cobrar el envío.', 'warning');
            }
            return;
        }
        if (o.shipping_paid) {
            if (typeof showAlert === 'function') {
                await showAlert('Envío', 'El envío ya está cobrado. Ya puedes marcar Entregado.', 'info');
            }
            return;
        }
        const cost = window.orderShipCost?.(o) || Number(o.shipping_cost) || 0;
        if (!(cost > 0)) {
            if (typeof showAlert === 'function') {
                await showAlert('Envío', 'El admin aún no cargó el peso/costo de envío.', 'warning');
            }
            return;
        }
        const label = method === 'CASH' ? 'Cash' : 'Square';
        const ok = typeof showConfirm === 'function'
            ? await showConfirm(
                `Cobrar envío ${label}`,
                `Cobrar envío ${formatMoney(cost)} con ${label} a ${o.customer_name || 'cliente'}?`,
                { confirmText: 'Cobrar', type: 'confirm' }
            )
            : true;
        if (!ok) return;

        if (typeof showLoadingModal === 'function') showLoadingModal('Registrando cobro de envío…');
        try {
            await window.patchSpecialOrder(id, {
                shipping_cost: cost,
                shipping_lb: o.shipping_lb,
                shipping_extra: o.shipping_extra || 0,
                shipping_paid: true,
                shipping_payment_method: method
            });
            if (typeof showAlert === 'function') {
                await showAlert('Envío cobrado', `Envío ${formatMoney(cost)} registrado (${label}). Ahora puedes marcar Entregado.`, 'success');
            }
            await renderOrders();
            if (locateViewPhone) await refreshCustomerScreen();
        } catch (e) {
            if (typeof showAlert === 'function') {
                await showAlert('Error', e.message || 'No se pudo cobrar el envío', 'error');
            }
        } finally {
            if (typeof hideLoadingModal === 'function') hideLoadingModal();
        }
    }

    function receiptMoney(n) {
        return '$' + (Number(n) || 0).toFixed(2);
    }

    function receiptPad(left, right, width = 32) {
        const L = String(left || '');
        const R = String(right || '');
        const space = Math.max(1, width - L.length - R.length);
        return escapeHtml(L + ' '.repeat(space) + R);
    }

    function receiptPayLabel(method) {
        const m = String(method || '').toUpperCase();
        if (m === 'CASH') return 'EFECTIVO';
        if (m === 'CARD') return 'TARJETA';
        if (m === 'WARRANTY' || m === 'GARANTIA') return 'GARANTIA';
        return m || '—';
    }

    async function printOrder(id) {
        const orders = await window.loadAllSpecialOrders();
        const o = window.normalizeSpecialOrder?.(orders.find(x => x.id === id)) || orders.find(x => x.id === id);
        if (!o) return;

        const qty = Number(o.quantity) || 1;
        const unit = Number(o.product_price) || 0;
        const itemTotal = window.orderItemTotal?.(o) || Math.round(unit * qty * 100) / 100;
        const shipCost = window.orderShipCost?.(o) || 0;
        const grand = window.orderGrandTotal?.(o) || (itemTotal + shipCost);
        const w = window.getWarrantyInfo?.(o) || {};
        const purchaseLabel = window.formatDateShort?.(o.purchase_date || o.created_at) || '—';
        const now = new Date();
        const printedAt = now.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
        const ticketNo = String(o.id || '').replace(/^so_/, '').slice(0, 12).toUpperCase();
        const isWarranty = !!(o.is_warranty_replacement || o.replaced_order_id || o.payment_method === 'WARRANTY');
        const productPaid = o.product_paid !== false;
        const shipPaid = !!o.shipping_paid;
        const phone = window.formatPhoneDisplay?.(o.customer_phone) || o.customer_phone || '—';
        const sku = o.product_sku ? String(o.product_sku) : '';
        const statusLabel = window.specialStatusLabel?.(o.status) || o.status || '';

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Recibo TropiParts</title>
<style>
  @page {
    size: 80mm auto;
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
  }
  body {
    width: 80mm;
    max-width: 80mm;
    margin: 0 auto;
    padding: 3mm 3mm 6mm;
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    line-height: 1.3;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .brand {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 0 0 2px;
  }
  .sub {
    font-size: 10px;
    margin: 0;
  }
  .rule {
    border: none;
    border-top: 1px dashed #000;
    margin: 6px 0;
  }
  .rule-dbl {
    border: none;
    border-top: 2px solid #000;
    margin: 6px 0;
  }
  .mono {
    white-space: pre;
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    margin: 1px 0;
  }
  .item-name {
    font-weight: 700;
    font-size: 11px;
    margin: 4px 0 2px;
    word-break: break-word;
  }
  .muted { font-size: 10px; }
  .total-line {
    font-size: 13px;
    font-weight: 900;
    margin: 4px 0;
  }
  .badge {
    display: inline-block;
    border: 1px solid #000;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 700;
    margin: 4px 0;
    text-transform: uppercase;
  }
  .foot {
    margin-top: 8px;
    font-size: 9px;
  }
  @media print {
    html, body {
      width: 80mm;
    }
  }
</style>
</head>
<body>
  <div class="center">
    <p class="brand">TROPIPARTS</p>
    <p class="sub">Real Campiña · Aguada de Pasajeros</p>
    <p class="sub">Cienfuegos, Cuba</p>
    <p class="sub">(772) 985-1015</p>
  </div>

  <hr class="rule">

  <div class="center bold">RECIBO DE VENTA</div>
  <div class="center muted">Pedido especial / Servicio</div>
  ${isWarranty ? '<div class="center"><span class="badge">Reemplazo por garantía</span></div>' : ''}

  <hr class="rule">

  <div class="mono">${receiptPad('Ticket', '#' + ticketNo)}</div>
  <div class="mono">${receiptPad('Fecha', printedAt)}</div>
  <div class="mono">${receiptPad('Estado', String(statusLabel).slice(0, 14))}</div>

  <hr class="rule">

  <div class="mono">${receiptPad('Cliente', '')}</div>
  <div class="bold">${escapeHtml(o.customer_name || 'Cliente')}</div>
  <div class="mono">${receiptPad('Tel', phone)}</div>

  <hr class="rule">

  <div class="center bold">*** ARTICULOS ***</div>
  <div class="item-name">${escapeHtml(o.product_name || 'Producto')}</div>
  ${sku ? `<div class="mono muted">SKU: ${escapeHtml(sku)}</div>` : ''}
  <div class="mono">${receiptPad(qty + ' x ' + receiptMoney(unit), receiptMoney(itemTotal))}</div>
  ${shipCost > 0
    ? `<div class="mono">${receiptPad('Envio a Cuba' + (shipPaid ? '' : ' *'), receiptMoney(shipCost))}</div>`
    : `<div class="mono muted">${receiptPad('Envio a Cuba', 'POR COTIZAR')}</div>`}

  <hr class="rule">

  ${isWarranty ? `
  <div class="mono">${receiptPad('Subtotal', receiptMoney(itemTotal + shipCost))}</div>
  <div class="mono">${receiptPad('Credito garantia', '-' + receiptMoney(itemTotal))}</div>
  <hr class="rule-dbl">
  <div class="mono total-line">${receiptPad('TOTAL A PAGAR', receiptMoney(shipCost))}</div>
  <div class="center muted">Producto cubierto por garantia</div>
  ` : `
  <div class="mono">${receiptPad('Subtotal', receiptMoney(itemTotal))}</div>
  ${shipCost > 0 ? `<div class="mono">${receiptPad('Envio', receiptMoney(shipCost))}</div>` : ''}
  <hr class="rule-dbl">
  <div class="mono total-line">${receiptPad('TOTAL', receiptMoney(grand))}</div>
  `}
  <div class="mono">${receiptPad('Pago', receiptPayLabel(o.payment_method))}</div>
  <div class="mono">${receiptPad('Articulo', productPaid ? 'PAGADO' : 'PENDIENTE')}</div>
  ${shipCost > 0 ? `<div class="mono">${receiptPad('Envio', shipPaid ? 'PAGADO' : 'PENDIENTE')}</div>` : ''}

  <hr class="rule">

  <div class="center bold">GARANTIA</div>
  <div class="mono">${receiptPad('Cobertura', String(o.warranty_label || w.label || '—').slice(0, 16))}</div>
  <div class="mono">${receiptPad('Compra', purchaseLabel)}</div>
  ${w.lifetime
    ? '<div class="mono">' + receiptPad('Vigencia', 'DE POR VIDA') + '</div>'
    : `<div class="mono">${receiptPad('Vence', window.formatDateShort?.(w.expires_at) || '—')}</div>
       <div class="mono">${receiptPad('Restante', String(w.remaining_label || '—').slice(0, 16))}</div>`}

  <hr class="rule">

  <div class="center foot">
    Conserve este recibo.<br>
    Es su comprobante de compra<br>
    y garantia del producto.<br><br>
    ¡Gracias por su compra!<br>
    www.tropiparts.com
  </div>

  <hr class="rule">
  <div class="center muted">${escapeHtml(String(o.id || ''))}</div>
</body>
</html>`;

        let iframe = document.getElementById('svc-print-frame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'svc-print-frame';
            iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
            document.body.appendChild(iframe);
        }
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (e) {
                console.error('Print error', e);
            }
        }, 300);
    }

    /* —— Localizar / cliente / reemplazo por garantía —— */
    let locateViewPhone = null;
    let locateViewCustomer = null;
    let replacing = false;

    function openLocate() {
        const m = $('svc-locate-modal');
        if (m) m.style.display = 'flex';
        if ($('svc-locate-msg')) $('svc-locate-msg').textContent = '';
        if (phonePinLocate) phonePinLocate.clear();
        setTimeout(() => phonePinLocate?.focusFirstEmpty?.() || $('svc-locate-phone-pin')?.querySelector('input')?.focus(), 50);
    }

    function closeLocate() {
        const m = $('svc-locate-modal');
        if (m) m.style.display = 'none';
    }

    function showCustomerScreen() {
        const screen = $('svc-customer-screen');
        const main = document.querySelector('.servicio-main');
        if (screen) screen.style.display = 'block';
        if (main) main.style.display = 'none';
        document.body.classList.add('svc-customer-view-open');
    }

    function hideCustomerScreen() {
        const screen = $('svc-customer-screen');
        const main = document.querySelector('.servicio-main');
        if (screen) screen.style.display = 'none';
        if (main) main.style.display = '';
        document.body.classList.remove('svc-customer-view-open');
        locateViewPhone = null;
        locateViewCustomer = null;
    }

    function canWarrantyReplace(order) {
        const o = window.normalizeSpecialOrder?.(order) || order;
        if (!o || o.status === 'cancelled') return false;
        const w = window.getWarrantyInfo?.(o);
        if (!w) return false;
        if (w.expired) return false;
        if (w.lifetime) return true;
        if (w.remaining_ms != null && w.remaining_ms > 0) return true;
        // Tiene años de garantía registrados y no vencida
        if (o.warranty_lifetime || o.warranty_years) return true;
        return false;
    }

    function renderCustomerHistory(orders) {
        const box = $('svc-customer-history');
        if (!box) return;
        if (!orders.length) {
            box.innerHTML = '<p class="svc-hint" style="text-align:center;">Cliente registrado sin pedidos aún.</p>';
            return;
        }
        box.innerHTML = orders.map(raw => {
            const o = window.normalizeSpecialOrder?.(raw) || raw;
            const img = orderImageUrl(o);
            const itemTotal = window.orderItemTotal?.(o) || 0;
            const ship = window.orderShipCost?.(o) || 0;
            const grand = window.orderGrandTotal?.(o) || itemTotal;
            const w = window.getWarrantyInfo?.(o) || {};
            const purchaseLabel = window.formatDateShort?.(o.purchase_date || o.created_at) || '—';
            const replaceOk = canWarrantyReplace(o);
            const isReplacement = !!o.is_warranty_replacement || !!o.replaced_order_id;
            return `
            <article class="svc-locate-card" data-order-id="${escapeHtml(o.id)}">
              ${img
                ? `<img src="${escapeHtml(img)}" alt="" referrerpolicy="no-referrer">`
                : '<div class="svc-locate-ph"><i class="fas fa-box"></i></div>'}
              <div class="svc-locate-card-body">
                <strong>${escapeHtml(o.product_name || 'Producto')}</strong>
                <div class="svc-meta">${escapeHtml(window.specialStatusLabel?.(o.status) || o.status)} · ${escapeHtml(purchaseLabel)}${isReplacement ? ' · <em>Reemplazo garantía</em>' : ''}</div>
                <div class="svc-meta">Artículo ${formatMoney(itemTotal)}${o.product_paid ? ' <span class="svc-pay-badge warranty">Pagado</span>' : ''}${ship > 0 ? ` + Envío ${formatMoney(ship)}${o.shipping_paid ? '' : ' (pendiente)'}` : ''} = <strong>Total ${formatMoney(grand)}</strong></div>
                <div class="svc-warranty-box ${w.expired ? 'expired' : ''}">
                  Garantía: <strong>${escapeHtml(o.warranty_label || w.total_label || '—')}</strong>
                  ${w.lifetime
                    ? ' · De por vida'
                    : ` · Resta: <strong>${escapeHtml(w.remaining_label || '—')}</strong>
                       · Vence: ${escapeHtml(window.formatDateShort?.(w.expires_at) || '—')}`}
                </div>
                <div class="svc-locate-card-actions">
                  ${o.status === 'shipped' && !o.shipping_paid && ship > 0 ? `
                  <button type="button" class="svc-btn svc-btn-ship-cash" data-action="ship-cash" data-id="${escapeHtml(o.id)}">
                    <i class="fas fa-money-bill-wave"></i> Cobrar envío Cash ${formatMoney(ship)}
                  </button>
                  <button type="button" class="svc-btn svc-btn-ship-card" data-action="ship-card" data-id="${escapeHtml(o.id)}">
                    <i class="fas fa-credit-card"></i> Cobrar envío Square
                  </button>
                  ` : ''}
                  ${o.status === 'shipped' ? `
                  <button type="button" class="svc-btn svc-btn-done" data-action="deliver" data-id="${escapeHtml(o.id)}">
                    <i class="fas fa-check"></i> Entregado
                  </button>
                  ` : ''}
                  ${replaceOk ? `
                  <button type="button" class="svc-btn-replace" data-action="replace" data-id="${escapeHtml(o.id)}">
                    <i class="fas fa-exchange-alt"></i> Reemplazar
                  </button>
                  <p class="svc-replace-note">Producto cubierto por garantía — solo se cobrará el envío.</p>
                  ` : (w.expired ? '<p class="svc-replace-note">Garantía vencida — no se puede reemplazar.</p>' : '')}
                </div>
              </div>
            </article>`;
        }).join('');

        box.querySelectorAll('[data-action="replace"]').forEach(btn => {
            btn.addEventListener('click', () => onWarrantyReplace(btn.dataset.id, btn));
        });
        box.querySelectorAll('[data-action="ship-cash"], [data-action="ship-card"], [data-action="deliver"]').forEach(btn => {
            btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
        });
    }

    async function openCustomerScreen(phone, customer, orders) {
        locateViewPhone = phone;
        locateViewCustomer = customer;
        const name = customer?.name
            || `${customer?.given_name || ''} ${customer?.family_name || ''}`.trim()
            || orders[0]?.customer_name
            || 'Cliente';
        if ($('svc-customer-name')) $('svc-customer-name').textContent = name;
        if ($('svc-customer-phone')) {
            $('svc-customer-phone').textContent = window.formatPhoneDisplay?.(phone) || phone;
        }
        if ($('svc-customer-stats')) {
            $('svc-customer-stats').textContent = `${orders.length} compra(s) registrada(s)`;
        }
        renderCustomerHistory(orders);
        closeLocate();
        showCustomerScreen();
    }

    async function refreshCustomerScreen() {
        if (!locateViewPhone) return;
        const orders = await window.findOrdersByPhone(locateViewPhone);
        const customer = locateViewCustomer || await window.findCustomerByPhone(locateViewPhone);
        await openCustomerScreen(locateViewPhone, customer, orders);
    }

    async function onLocateSearch() {
        syncPhoneHidden('locate');
        const raw = getLocatePhoneRaw();
        const phone = window.normalizePhone?.(raw.length === 8 ? '53' + raw : raw) || '';
        const msg = $('svc-locate-msg');
        if (!phone || phone.length < 8) {
            if (msg) msg.textContent = 'Ingresa los 8 dígitos del teléfono (+53).';
            phonePinLocate?.focusFirstEmpty?.();
            return;
        }
        if (msg) msg.textContent = 'Buscando…';
        if (typeof showLoadingModal === 'function') showLoadingModal('Buscando compras…');
        try {
            const customer = await window.findCustomerByPhone(phone);
            const orders = await window.findOrdersByPhone(phone);
            if (!customer && !orders.length) {
                if (msg) msg.textContent = 'No hay cliente ni compras con ese teléfono.';
                return;
            }
            await openCustomerScreen(phone, customer, orders);
        } catch (e) {
            if (msg) msg.textContent = e.message || 'Error al buscar';
        } finally {
            if (typeof hideLoadingModal === 'function') hideLoadingModal();
        }
    }

    function buildWarrantyReplacement(original, user) {
        const o = window.normalizeSpecialOrder?.(original) || original;
        const now = new Date().toISOString();
        const id = 'so_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const noteBase = (o.notes || '').trim();
        const replaceNote = `Reemplazo por garantía del pedido ${o.id}`;
        const record = {
            id,
            status: 'processing',
            product_name: o.product_name,
            product_price: Number(o.product_price) || 0,
            quantity: Number(o.quantity) || 1,
            total_amount: window.orderItemTotal?.(o) || Number(o.total_amount) || 0,
            product_image: o.product_image || o.image || '',
            image: o.product_image || o.image || '',
            image_url: o.product_image || o.image_url || '',
            product_sku: o.product_sku || '',
            product_url: o.product_url || '',
            notes: noteBase ? `${noteBase} | ${replaceNote}` : replaceNote,
            payment_method: 'WARRANTY',
            product_paid: true,
            product_payment_id: `warranty:${o.id}`,
            shipping_lb: null,
            shipping_extra: 0,
            shipping_cost: 0,
            shipping_paid: false,
            shipping_payment_method: null,
            admin_viewed: false,
            created_by: user.email || user.id || 'empleado',
            created_at: now,
            updated_at: now,
            square_order_id: null,
            customer_phone: o.customer_phone,
            customer_given_name: o.customer_given_name || '',
            customer_family_name: o.customer_family_name || '',
            customer_name: o.customer_name || '',
            // Conservar garantía original (misma cobertura)
            warranty_years: o.warranty_years,
            warranty_lifetime: o.warranty_lifetime,
            warranty_label: o.warranty_label,
            purchase_date: o.purchase_date || o.created_at,
            warranty_expires_at: o.warranty_expires_at,
            is_warranty_replacement: true,
            replaced_order_id: o.id
        };
        return window.normalizeSpecialOrder ? window.normalizeSpecialOrder(record) : record;
    }

    async function onWarrantyReplace(orderId, btn) {
        if (replacing || !orderId) return;
        const user = requireEmployee();
        if (!user) return;

        const ok = typeof showConfirm === 'function'
            ? await showConfirm(
                'Reemplazo por garantía',
                'Se creará un pedido nuevo con el producto ya pagado. El cliente solo pagará el envío cuando Admin lo cobre. ¿Continuar?'
            )
            : window.confirm('¿Crear reemplazo por garantía? El producto queda pagado; solo se cobrará el envío.');
        if (!ok) return;

        replacing = true;
        if (btn) btn.disabled = true;
        if (typeof showLoadingModal === 'function') showLoadingModal('Creando reemplazo…');
        try {
            const all = await window.loadAllSpecialOrders();
            const original = all.find(o => o.id === orderId);
            if (!original) throw new Error('Pedido original no encontrado');
            if (!canWarrantyReplace(original)) throw new Error('Este pedido no tiene garantía vigente');

            const record = buildWarrantyReplacement(original, user);
            await window.persistSpecialOrder(record);

            if (typeof showAlert === 'function') {
                await showAlert(
                    'Reemplazo creado',
                    'Pedido nuevo listo. Artículo marcado como pagado (garantía). El envío se cobrará después en Admin.',
                    'success'
                );
            }

            await refreshCustomerScreen();
            await renderOrders();
        } catch (e) {
            if (typeof showAlert === 'function') {
                await showAlert('Error', e.message || 'No se pudo crear el reemplazo', 'error');
            } else {
                alert(e.message || 'No se pudo crear el reemplazo');
            }
            if (btn) btn.disabled = false;
        } finally {
            replacing = false;
            if (typeof hideLoadingModal === 'function') hideLoadingModal();
        }
    }

    function bind() {
        $('btn-open-create-order')?.addEventListener('click', openModal);
        $('special-order-close')?.addEventListener('click', closeModal);
        $('svc-modal-close')?.addEventListener('click', closeModal);
        $('svc-cancel')?.addEventListener('click', closeModal);
        $('svc-create-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'svc-create-modal') closeModal();
        });
        $('svc-phone-lookup')?.addEventListener('click', onPhoneLookup);
        $('svc-customer-continue')?.addEventListener('click', onCustomerContinue);
        $('svc-fetch-url')?.addEventListener('click', onDetect);
        $('svc-submit')?.addEventListener('click', onSubmitClick);
        $('svc-pay-cash')?.addEventListener('click', onPayCash);
        $('svc-pay-card')?.addEventListener('click', onPayCardOpen);
        $('svc-pay-card-confirm')?.addEventListener('click', onPayCardConfirm);

        $('btn-locate-customer')?.addEventListener('click', openLocate);
        $('svc-locate-close')?.addEventListener('click', closeLocate);
        $('svc-locate-cancel')?.addEventListener('click', closeLocate);
        $('svc-locate-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'svc-locate-modal') closeLocate();
        });
        $('svc-locate-search')?.addEventListener('click', onLocateSearch);
        $('svc-customer-back')?.addEventListener('click', () => {
            hideCustomerScreen();
            renderOrders();
        });

        document.querySelectorAll('.svc-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.svc-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                statusFilter = btn.dataset.status || '';
                renderOrders();
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const user = requireEmployee();
        if (!user) return;
        const nameEl = $('user-account-text');
        if (nameEl) nameEl.textContent = user.name || user.email || 'Empleado';
        initPhonePins();
        bind();
        renderOrders();
    });
})();
