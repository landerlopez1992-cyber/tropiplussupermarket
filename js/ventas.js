/**
 * Ventas — almanaque de recaudación (último mes)
 * Fuentes: Square Orders + special_orders (Servicio)
 */
(function () {
    'use strict';

    const MAX_HISTORY_DAYS = 30;

    /** @type {Record<string, { cash: number, card: number, count: number, items: Array }>} */
    let salesByDay = {};
    let selectedDayKey = null;
    let viewYear = 0;
    let viewMonth = 0; // 0-11
    let rangeStart = null;
    let rangeEnd = null;

    function $(id) {
        return document.getElementById(id);
    }

    function requireEmployee() {
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        if (!user) {
            window.location.href = 'index.html';
            return null;
        }
        const ok = typeof isUserEmployee === 'function'
            ? isUserEmployee()
            : (user.isEmployee || user.isAdmin || user.role === 'empleado' || user.role === 'employee' || user.role === 'servicio');
        if (!ok) {
            alert('Acceso solo para empleados.');
            window.location.href = 'index.html';
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

    function dayKeyFromDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function dayKeyFromIso(iso) {
        if (!iso) return null;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return null;
        return dayKeyFromDate(d);
    }

    function parseDayKey(key) {
        const [y, m, d] = String(key).split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function startOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }

    function endOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    }

    function setStatus(msg, isError) {
        const el = $('ventas-status');
        if (!el) return;
        el.textContent = msg || '';
        el.classList.toggle('is-error', !!isError);
        el.style.display = msg ? 'block' : 'none';
    }

    function ensureDayBucket(key) {
        if (!salesByDay[key]) {
            salesByDay[key] = { cash: 0, card: 0, count: 0, items: [] };
        }
        return salesByDay[key];
    }

    function addSale(key, method, amount, item) {
        if (!key || !(amount > 0)) return;
        const bucket = ensureDayBucket(key);
        const m = String(method || 'CARD').toUpperCase() === 'CASH' ? 'cash' : 'card';
        bucket[m] += amount;
        bucket.count += 1;
        bucket.items.push(item);
    }

    function squareOrderAmount(order) {
        if (order.total_money && typeof order.total_money.amount === 'number') {
            return order.total_money.amount / 100;
        }
        if (order.net_amounts?.total_money?.amount != null) {
            return order.net_amounts.total_money.amount / 100;
        }
        const items = order.line_items || [];
        return items.reduce((sum, li) => {
            if (li.total_money?.amount != null) return sum + li.total_money.amount / 100;
            const unit = li.base_price_money?.amount || 0;
            const qty = parseFloat(li.quantity) || 1;
            return sum + (unit * qty) / 100;
        }, 0);
    }

    function isSquareOrderCollected(order) {
        if (!order || order.state === 'CANCELED') return false;

        const tenders = order.tenders || [];
        if (tenders.length) {
            return tenders.some((t) => {
                const state = t.state || '';
                if (state === 'FAILED' || state === 'CANCELED') return false;
                return state === 'CAPTURED' || state === 'COMPLETED' || !!t.payment_id;
            });
        }

        // Cash a veces se registra sin tender todavía; contar si metadata indica CASH
        const method = (order.metadata && order.metadata.payment_method) || '';
        return String(method).toUpperCase() === 'CASH' && order.state !== 'CANCELED';
    }

    function squarePaymentMethod(order) {
        const meta = order.metadata && order.metadata.payment_method;
        if (meta) {
            const m = String(meta).toUpperCase();
            if (m === 'CASH' || m === 'CARD') return m;
        }
        const tenders = order.tenders || [];
        if (tenders.some((t) => t.type === 'CASH' || t.type === 'EXTERNAL' || t.type === 'WALLET')) {
            // EXTERNAL se usa como fallback de cash en esta app
            if (tenders.some((t) => t.type === 'CASH' || t.type === 'EXTERNAL')) return 'CASH';
        }
        if (tenders.some((t) => t.type === 'CARD')) return 'CARD';
        return 'CARD';
    }

    function squareSourceLabel(order) {
        const source = (order.metadata && order.metadata.source) || '';
        if (source === 'web_app') return 'Online / web';
        const note = (order.line_items || []).map((i) => i.note || i.name || '').join(' ');
        if (/especial|servicio|CUSTOM/i.test(note) || source === 'servicio') return 'Servicio';
        return order.source?.name || 'Square';
    }

    function ingestSquareOrders(orders) {
        const seenIds = new Set();
        (orders || []).forEach((order) => {
            if (!order || !order.id || seenIds.has(order.id)) return;
            seenIds.add(order.id);
            if (!isSquareOrderCollected(order)) return;

            const key = dayKeyFromIso(order.created_at);
            if (!key) return;
            if (rangeStart && parseDayKey(key) < startOfDay(rangeStart)) return;

            const amount = squareOrderAmount(order);
            const method = squarePaymentMethod(order);
            addSale(key, method, amount, {
                id: order.id,
                source: squareSourceLabel(order),
                method,
                amount,
                label: (order.line_items && order.line_items[0] && (order.line_items[0].name || order.line_items[0].note)) || 'Orden Square',
                at: order.created_at
            });
        });
        return seenIds;
    }

    async function ingestSpecialOrders(squareIds) {
        let rows = [];
        try {
            if (typeof window.loadAllSpecialOrders === 'function') {
                rows = await window.loadAllSpecialOrders();
            } else if (typeof window.getSpecialOrdersFromFirebase === 'function' && window.isFirebaseConfigured?.()) {
                rows = await window.getSpecialOrdersFromFirebase(null);
            } else {
                const raw = localStorage.getItem('tropiparts_special_orders');
                rows = raw ? JSON.parse(raw) : [];
            }
        } catch (e) {
            console.warn('No se pudieron cargar special_orders:', e);
            rows = [];
        }

        (rows || []).forEach((o) => {
            if (!o || o.status === 'cancelled') return;
            if (!o.product_paid) return;
            // Evitar doble conteo si ya está en Square
            if (o.square_order_id && squareIds.has(o.square_order_id)) return;

            const key = dayKeyFromIso(o.created_at || o.updated_at);
            if (!key) return;
            if (rangeStart && parseDayKey(key) < startOfDay(rangeStart)) return;
            if (rangeEnd && parseDayKey(key) > endOfDay(rangeEnd)) return;

            const productAmount = Number(o.total_amount) || (Number(o.product_price) || 0) * (Number(o.quantity) || 1);
            const method = String(o.payment_method || 'CASH').toUpperCase() === 'CASH' ? 'CASH' : 'CARD';
            if (productAmount > 0) {
                addSale(key, method, productAmount, {
                    id: o.id,
                    source: 'Servicio',
                    method,
                    amount: productAmount,
                    label: o.product_name || 'Pedido especial',
                    at: o.created_at
                });
            }

            if (o.shipping_paid && Number(o.shipping_cost) > 0) {
                const shipMethod = String(o.shipping_payment_method || method).toUpperCase() === 'CASH' ? 'CASH' : 'CARD';
                const shipKey = dayKeyFromIso(o.updated_at || o.created_at) || key;
                addSale(shipKey, shipMethod, Number(o.shipping_cost), {
                    id: o.id + '-ship',
                    source: 'Servicio (envío)',
                    method: shipMethod,
                    amount: Number(o.shipping_cost),
                    label: 'Envío · ' + (o.product_name || 'pedido'),
                    at: o.updated_at || o.created_at
                });
            }
        });
    }

    async function loadSales() {
        setStatus('Cargando ventas…');
        salesByDay = {};

        const now = new Date();
        rangeEnd = endOfDay(now);
        rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (MAX_HISTORY_DAYS - 1)));

        viewYear = now.getFullYear();
        viewMonth = now.getMonth();

        try {
            let squareOrders = [];
            if (typeof searchOrdersByDateRange === 'function') {
                squareOrders = await searchOrdersByDateRange(rangeStart.toISOString(), rangeEnd.toISOString());
            }
            const squareIds = ingestSquareOrders(squareOrders);
            await ingestSpecialOrders(squareIds);

            setStatus('');
            renderCalendar();
            if (!selectedDayKey) {
                selectedDayKey = dayKeyFromDate(now);
            }
            selectDay(selectedDayKey);
        } catch (e) {
            console.error(e);
            setStatus('Error al cargar ventas: ' + (e.message || 'desconocido'), true);
            renderCalendar();
        }
    }

    function canShowDay(key) {
        const d = parseDayKey(key);
        if (Number.isNaN(d.getTime())) return false;
        if (d > endOfDay(new Date())) return false;
        if (rangeStart && d < startOfDay(rangeStart)) return false;
        return true;
    }

    function monthLabel(year, month) {
        const d = new Date(year, month, 1);
        return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }

    function renderCalendar() {
        const label = $('ventas-month-label');
        const grid = $('ventas-calendar-grid');
        if (label) label.textContent = monthLabel(viewYear, viewMonth);
        if (!grid) return;

        const first = new Date(viewYear, viewMonth, 1);
        // Monday-based index: Mon=0 … Sun=6
        let startPad = (first.getDay() + 6) % 7;
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const todayKey = dayKeyFromDate(new Date());

        const cells = [];
        for (let i = 0; i < startPad; i++) {
            cells.push('<div class="ventas-day empty"></div>');
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const bucket = salesByDay[key];
            const inRange = canShowDay(key);
            const total = bucket ? bucket.cash + bucket.card : 0;
            const classes = ['ventas-day'];
            if (!inRange) classes.push('disabled');
            if (key === todayKey) classes.push('today');
            if (key === selectedDayKey) classes.push('selected');
            if (total > 0) classes.push('has-sales');

            const tip = inRange && total > 0
                ? `${formatMoney(total)} · ${bucket.count} venta(s)`
                : (inRange ? 'Sin ventas' : 'Fuera del historial');

            cells.push(
                `<button type="button" class="${classes.join(' ')}" data-day="${key}" ${inRange ? '' : 'disabled'} title="${escapeHtml(tip)}">` +
                `<span class="ventas-day-num">${day}</span>` +
                (total > 0 ? `<span class="ventas-day-dot"></span>` : '') +
                `</button>`
            );
        }

        grid.innerHTML = cells.join('');
        grid.querySelectorAll('.ventas-day[data-day]:not([disabled])').forEach((btn) => {
            btn.addEventListener('click', () => selectDay(btn.getAttribute('data-day')));
        });

        updateMonthNav();
    }

    function updateMonthNav() {
        const prev = $('ventas-prev-month');
        const next = $('ventas-next-month');
        if (!rangeStart) return;

        const viewStart = new Date(viewYear, viewMonth, 1);
        const viewEnd = new Date(viewYear, viewMonth + 1, 0);
        const now = new Date();

        // Prev disabled if entire previous month is before rangeStart
        const prevMonthEnd = new Date(viewYear, viewMonth, 0);
        if (prev) prev.disabled = prevMonthEnd < startOfDay(rangeStart);

        // Next disabled if next month starts after today
        const nextMonthStart = new Date(viewYear, viewMonth + 1, 1);
        if (next) next.disabled = nextMonthStart > endOfDay(now) || nextMonthStart > endOfDay(rangeEnd || now);

        void viewStart;
        void viewEnd;
    }

    function selectDay(key) {
        if (!key || !canShowDay(key)) return;
        selectedDayKey = key;
        renderCalendar();

        const d = parseDayKey(key);
        const title = $('ventas-day-title');
        const subtitle = $('ventas-day-subtitle');
        if (title) {
            title.textContent = d.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }

        const bucket = salesByDay[key] || { cash: 0, card: 0, count: 0, items: [] };
        const cash = bucket.cash || 0;
        const card = bucket.card || 0;
        const grand = cash + card;

        const cashEl = $('ventas-cash-total');
        const cardEl = $('ventas-card-total');
        const grandEl = $('ventas-grand-total');
        if (cashEl) cashEl.textContent = formatMoney(cash);
        if (cardEl) cardEl.textContent = formatMoney(card);
        if (grandEl) grandEl.textContent = formatMoney(grand);

        if (subtitle) {
            subtitle.textContent = bucket.count
                ? `${bucket.count} cobro(s) ese día`
                : 'No hay cobros registrados este día';
        }

        const meta = $('ventas-day-meta');
        if (meta) {
            meta.innerHTML = bucket.count
                ? `<span class="svc-pay-badge cash">Cash ${formatMoney(cash)}</span>` +
                  `<span class="svc-pay-badge card">Tarjeta ${formatMoney(card)}</span>`
                : '';
        }

        const list = $('ventas-day-orders');
        if (!list) return;
        if (!bucket.items.length) {
            list.innerHTML = '<p class="ventas-empty">Sin movimientos este día.</p>';
            return;
        }

        const sorted = bucket.items.slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
        list.innerHTML = sorted.map((item) => {
            const time = item.at
                ? new Date(item.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                : '';
            const badgeClass = item.method === 'CASH' ? 'cash' : 'card';
            const badgeText = item.method === 'CASH' ? 'Cash' : 'Tarjeta';
            return (
                `<article class="ventas-order-row">` +
                `<div class="ventas-order-main">` +
                `<strong>${escapeHtml(item.label)}</strong>` +
                `<span class="ventas-order-meta">${escapeHtml(item.source)}${time ? ' · ' + time : ''}</span>` +
                `</div>` +
                `<div class="ventas-order-side">` +
                `<span class="svc-pay-badge ${badgeClass}">${badgeText}</span>` +
                `<strong>${formatMoney(item.amount)}</strong>` +
                `</div>` +
                `</article>`
            );
        }).join('');
    }

    function shiftMonth(delta) {
        const d = new Date(viewYear, viewMonth + delta, 1);
        viewYear = d.getFullYear();
        viewMonth = d.getMonth();
        renderCalendar();
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!requireEmployee()) return;

        const now = new Date();
        viewYear = now.getFullYear();
        viewMonth = now.getMonth();

        $('ventas-prev-month')?.addEventListener('click', () => shiftMonth(-1));
        $('ventas-next-month')?.addEventListener('click', () => shiftMonth(1));
        $('ventas-refresh')?.addEventListener('click', () => loadSales());

        loadSales();
    });
})();
