/**
 * Entrega de remesas — pantalla empleado
 * Busca por código WU (PIN) / nombre / CI y marca entregado.
 */
(function () {
    'use strict';

    let delivering = false;
    let codePin = null;

    function $(id) {
        return document.getElementById(id);
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function requireEmployee() {
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        if (!user) {
            window.location.href = 'index.html';
            return null;
        }
        const ok = typeof isUserEmployee === 'function'
            ? isUserEmployee()
            : (user.isEmployee || user.isAdmin || user.role === 'empleado' || user.role === 'employee');
        if (!ok) {
            alert('Acceso solo para empleados.');
            window.location.href = 'index.html';
            return null;
        }
        return user;
    }

    function formatCode(code) {
        if (typeof window.formatRemesaCodeDisplay === 'function') {
            return window.formatRemesaCodeDisplay(code);
        }
        return String(code || '');
    }

    function moneyLine(remesa) {
        const currency = remesa.currency || 'USD';
        const amount = Number(remesa.amount_usd) || 0;
        if (currency === 'CUP' && remesa.amount_cup != null) {
            return {
                deliver: `${Number(remesa.amount_cup).toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CUP`,
                paid: `$${Number(remesa.total_paid || 0).toFixed(2)} USD pagados`
            };
        }
        return {
            deliver: `$${amount.toFixed(2)} USD`,
            paid: `$${Number(remesa.total_paid || 0).toFixed(2)} USD pagados (incl. comisión)`
        };
    }

    function statusLabel(status) {
        if (status === 'pending') return 'Pendiente de entrega';
        if (status === 'delivered') return 'Entregada';
        if (status === 'cancelled') return 'Cancelada';
        return status || '—';
    }

    function renderResults(list) {
        const box = $('remesa-results');
        if (!box) return;
        if (!list.length) {
            box.innerHTML = '<p class="remesa-empty">No se encontraron remesas con ese criterio.</p>';
            return;
        }

        box.innerHTML = list.map(r => {
            const money = moneyLine(r);
            const code = formatCode(r.confirmation_code || r.remittance_number);
            const created = r.created_at
                ? new Date(r.created_at).toLocaleString('es-ES', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                })
                : '—';
            const canDeliver = r.status === 'pending';
            return `
            <article class="remesa-card ${r.status === 'pending' ? 'is-pending' : ''}" data-id="${escapeHtml(r.id)}">
              <div class="remesa-card-top">
                <div>
                  <div class="remesa-code-label">Código de seguridad</div>
                  <div class="remesa-code">${escapeHtml(code)}</div>
                </div>
                <span class="remesa-status remesa-status-${escapeHtml(r.status || 'pending')}">${escapeHtml(statusLabel(r.status))}</span>
              </div>
              <div class="remesa-card-grid">
                <div>
                  <div class="remesa-field-label">Quien recoge</div>
                  <div class="remesa-field-value">${escapeHtml(r.recipient_name || '—')}</div>
                  ${r.recipient_id ? `<div class="remesa-field-sub">CI: ${escapeHtml(r.recipient_id)}</div>` : ''}
                </div>
                <div>
                  <div class="remesa-field-label">Remitente</div>
                  <div class="remesa-field-value">${escapeHtml(r.sender_name || '—')}</div>
                  ${r.sender_email ? `<div class="remesa-field-sub">${escapeHtml(r.sender_email)}</div>` : ''}
                </div>
                <div>
                  <div class="remesa-field-label">A entregar</div>
                  <div class="remesa-deliver-amount">${escapeHtml(money.deliver)}</div>
                  <div class="remesa-field-sub">${escapeHtml(money.paid)}</div>
                </div>
              </div>
              <div class="remesa-card-meta">Creada: ${escapeHtml(created)}${r.order_id ? ` · Orden Square: ${escapeHtml(String(r.order_id).slice(0, 16))}…` : ''}</div>
              <div class="remesa-card-actions">
                ${canDeliver ? `
                <button type="button" class="btn-primary remesa-deliver-btn" data-action="deliver" data-id="${escapeHtml(r.id)}" data-code="${escapeHtml(r.confirmation_code || '')}">
                  <i class="fas fa-check-circle"></i> Marcar entregado
                </button>
                ` : `
                <p class="svc-hint" style="margin:0;">${r.status === 'delivered' ? 'Ya fue entregada' + (r.delivered_at ? ' el ' + new Date(r.delivered_at).toLocaleString('es-ES') : '') + '.' : 'No se puede entregar.'}</p>
                `}
              </div>
            </article>`;
        }).join('');

        box.querySelectorAll('[data-action="deliver"]').forEach(btn => {
            btn.addEventListener('click', () => onDeliver(btn.dataset.id, btn.dataset.code, btn));
        });
    }

    async function runSearch(query) {
        const msg = $('remesa-search-msg');
        const q = String(query || '').trim();
        if (q.length < 2) {
            if (msg) msg.textContent = 'Ingresa el código completo, o al menos 2 letras del nombre / CI.';
            return;
        }
        if (msg) msg.textContent = 'Buscando…';
        if (typeof showLoadingModal === 'function') showLoadingModal('Buscando remesa…');
        try {
            if (typeof window.searchRemesasForEmployee !== 'function') {
                throw new Error('Búsqueda de remesas no disponible');
            }
            let results = await window.searchRemesasForEmployee(q, { onlyPending: true });
            if (!results.length) {
                results = await window.searchRemesasForEmployee(q, { onlyPending: false });
            }
            if (msg) {
                msg.textContent = results.length
                    ? `${results.length} resultado(s)`
                    : 'Sin resultados';
            }
            renderResults(results);
        } catch (e) {
            if (msg) msg.textContent = e.message || 'Error al buscar';
            renderResults([]);
        } finally {
            if (typeof hideLoadingModal === 'function') hideLoadingModal();
        }
    }

    function onSearchByCode() {
        const code = codePin ? codePin.getValue() : ($('remesa-search-code')?.value || '');
        if ($('remesa-search-code')) $('remesa-search-code').value = code;
        if (code.length < 6) {
            const msg = $('remesa-search-msg');
            if (msg) msg.textContent = 'Completa el código de 10 dígitos.';
            codePin?.focusFirstEmpty?.();
            return;
        }
        runSearch(code);
    }

    function onSearchByText() {
        const text = ($('remesa-search-text')?.value || '').trim();
        runSearch(text);
    }

    async function onDeliver(id, code, btn) {
        if (delivering || !id) return;
        const user = requireEmployee();
        if (!user) return;

        const ok = typeof showConfirm === 'function'
            ? await showConfirm(
                'Confirmar entrega',
                '¿Confirmas que verificaste la identidad del destinatario y entregaste el dinero?'
            )
            : window.confirm('¿Marcar remesa como entregada?');
        if (!ok) return;

        delivering = true;
        if (btn) btn.disabled = true;
        if (typeof showLoadingModal === 'function') showLoadingModal('Registrando entrega…');
        try {
            const deliveredBy = user.email || user.name || user.id || 'empleado';
            let result;
            if (typeof window.deliverRemesaById === 'function') {
                result = await window.deliverRemesaById(id, deliveredBy);
            } else if (typeof window.deliverRemesaFromSupabase === 'function') {
                result = await window.deliverRemesaFromSupabase(code, deliveredBy);
            } else {
                throw new Error('Función de entrega no disponible');
            }

            if (typeof showAlert === 'function') {
                await showAlert(
                    'Remesa entregada',
                    `Entrega registrada. Código ${formatCode(result.confirmation_code || code)}.`,
                    'success'
                );
            }
            const current = codePin?.getValue?.() || ($('remesa-search-text')?.value || '');
            if (current) await runSearch(current);
            else renderResults([result]);
        } catch (e) {
            if (typeof showAlert === 'function') {
                await showAlert('Error', e.message || 'No se pudo marcar como entregada', 'error');
            } else {
                alert(e.message || 'Error al entregar');
            }
            if (btn) btn.disabled = false;
        } finally {
            delivering = false;
            if (typeof hideLoadingModal === 'function') hideLoadingModal();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const user = requireEmployee();
        if (!user) return;
        const nameEl = $('user-account-text');
        if (nameEl) nameEl.textContent = user.name || user.email || 'Empleado';

        if (typeof window.mountRemesaCodePin === 'function' && $('remesa-code-pin')) {
            codePin = window.mountRemesaCodePin('remesa-code-pin', {
                instanceKey: 'remesa-code-pin',
                hiddenInputId: 'remesa-search-code',
                onEnter: () => onSearchByCode(),
                onComplete: () => onSearchByCode()
            });
        }

        $('remesa-search-btn')?.addEventListener('click', onSearchByCode);
        $('remesa-search-text-btn')?.addEventListener('click', onSearchByText);
        $('remesa-search-text')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onSearchByText();
            }
        });
        setTimeout(() => codePin?.focusFirstEmpty?.(), 100);
    });
})();
