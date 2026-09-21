/**
 * Inputs numéricos estilo PIN (casillas) — teléfonos Cuba + códigos remesa
 */
(function () {
    'use strict';

    const instances = new Map();

    function onlyDigits(s) {
        return String(s || '').replace(/\D/g, '');
    }

    /**
     * @param {HTMLElement|string} mountEl
     * @param {object} opts
     * @param {number} opts.digits
     * @param {string} [opts.prefix] — ej. '+53' (no editable)
     * @param {string} [opts.hiddenInputId]
     * @param {string} [opts.groupSize] — agrupar visualmente cada N (ej. 4)
     * @param {Function} [opts.onChange]
     * @param {Function} [opts.onComplete]
     */
    function mountDigitPin(mountEl, opts = {}) {
        const root = typeof mountEl === 'string' ? document.getElementById(mountEl) : mountEl;
        if (!root) return null;

        const digits = Math.max(4, Math.min(16, Number(opts.digits) || 8));
        const prefix = opts.prefix != null ? String(opts.prefix) : '';
        const groupSize = Number(opts.groupSize) || 0;

        root.classList.add('digit-pin');
        root.innerHTML = '';

        if (prefix) {
            const pre = document.createElement('span');
            pre.className = 'digit-pin-prefix';
            pre.textContent = prefix;
            pre.setAttribute('aria-hidden', 'true');
            root.appendChild(pre);
        }

        const boxesWrap = document.createElement('div');
        boxesWrap.className = 'digit-pin-boxes';
        boxesWrap.setAttribute('role', 'group');
        boxesWrap.setAttribute('aria-label', opts.ariaLabel || 'Código numérico');

        const inputs = [];
        for (let i = 0; i < digits; i++) {
            if (groupSize > 0 && i > 0 && i % groupSize === 0) {
                const gap = document.createElement('span');
                gap.className = 'digit-pin-gap';
                gap.setAttribute('aria-hidden', 'true');
                boxesWrap.appendChild(gap);
            }
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.inputMode = 'numeric';
            inp.autocomplete = 'one-time-code';
            inp.maxLength = 1;
            inp.className = 'digit-pin-box';
            inp.setAttribute('aria-label', `Dígito ${i + 1}`);
            inp.dataset.index = String(i);
            boxesWrap.appendChild(inp);
            inputs.push(inp);
        }
        root.appendChild(boxesWrap);

        let hidden = null;
        if (opts.hiddenInputId) {
            hidden = document.getElementById(opts.hiddenInputId);
            if (!hidden) {
                hidden = document.createElement('input');
                hidden.type = 'hidden';
                hidden.id = opts.hiddenInputId;
                root.appendChild(hidden);
            }
        }

        function getRaw() {
            return inputs.map(i => onlyDigits(i.value).slice(0, 1)).join('');
        }

        function syncHidden() {
            const v = getRaw();
            if (hidden) hidden.value = v;
            if (typeof opts.onChange === 'function') opts.onChange(v);
            if (v.length === digits && typeof opts.onComplete === 'function') {
                opts.onComplete(v);
            }
            inputs.forEach((inp, idx) => {
                inp.classList.toggle('filled', !!inp.value);
                inp.classList.toggle('active', document.activeElement === inp);
            });
            return v;
        }

        function setValue(raw) {
            let d = onlyDigits(raw);
            // Si viene con 53… de Cuba, quedarse con los últimos `digits`
            if (prefix.includes('53') && d.startsWith('53') && d.length > digits) {
                d = d.slice(-digits);
            }
            d = d.slice(0, digits);
            inputs.forEach((inp, i) => {
                inp.value = d[i] || '';
            });
            syncHidden();
        }

        function clear() {
            inputs.forEach(inp => { inp.value = ''; });
            syncHidden();
        }

        function focus(index = 0) {
            const i = Math.max(0, Math.min(digits - 1, index));
            inputs[i]?.focus();
            inputs[i]?.select();
        }

        function focusFirstEmpty() {
            const idx = inputs.findIndex(i => !i.value);
            focus(idx === -1 ? digits - 1 : idx);
        }

        inputs.forEach((inp, i) => {
            inp.addEventListener('input', (e) => {
                const d = onlyDigits(e.target.value).slice(-1);
                e.target.value = d;
                if (d && i < digits - 1) inputs[i + 1].focus();
                syncHidden();
            });

            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    if (!inp.value && i > 0) {
                        inputs[i - 1].value = '';
                        inputs[i - 1].focus();
                        syncHidden();
                        e.preventDefault();
                    }
                } else if (e.key === 'ArrowLeft' && i > 0) {
                    inputs[i - 1].focus();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight' && i < digits - 1) {
                    inputs[i + 1].focus();
                    e.preventDefault();
                } else if (e.key === 'Enter' && typeof opts.onEnter === 'function') {
                    e.preventDefault();
                    opts.onEnter(getRaw());
                }
            });

            inp.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasted = onlyDigits((e.clipboardData || window.clipboardData).getData('text'));
                if (!pasted) return;
                let local = pasted;
                if (prefix.includes('53') && local.startsWith('53') && local.length > digits) {
                    local = local.slice(-digits);
                }
                setValue(local);
                focusFirstEmpty();
            });

            inp.addEventListener('focus', () => {
                inp.select();
                syncHidden();
            });
        });

        const api = {
            root,
            getValue: getRaw,
            setValue,
            clear,
            focus,
            focusFirstEmpty,
            isComplete: () => getRaw().length === digits,
            digitCount: digits
        };

        const key = opts.instanceKey || opts.hiddenInputId || root.id || String(Math.random());
        instances.set(key, api);
        root._digitPin = api;
        syncHidden();
        return api;
    }

    /** Teléfono Cuba: +53 + 8 dígitos */
    function mountPhonePinCuba(mountEl, opts = {}) {
        return mountDigitPin(mountEl, {
            digits: 8,
            prefix: '+53',
            ariaLabel: 'Teléfono Cuba',
            groupSize: 4,
            ...opts
        });
    }

    /** Código remesa Western Union: 10 dígitos */
    function mountRemesaCodePin(mountEl, opts = {}) {
        return mountDigitPin(mountEl, {
            digits: 10,
            prefix: '',
            ariaLabel: 'Código de remesa',
            groupSize: 3,
            ...opts
        });
    }

    function getDigitPin(keyOrEl) {
        if (!keyOrEl) return null;
        if (typeof keyOrEl === 'string') {
            return instances.get(keyOrEl) || document.getElementById(keyOrEl)?._digitPin || null;
        }
        return keyOrEl._digitPin || null;
    }

    /** Valor listo para normalizePhone (8 dígitos o con 53) */
    function getCubaPhoneFromPin(keyOrEl) {
        const api = getDigitPin(keyOrEl);
        if (!api) return '';
        const d = api.getValue();
        if (d.length === 8) return '53' + d;
        return d;
    }

    window.mountDigitPin = mountDigitPin;
    window.mountPhonePinCuba = mountPhonePinCuba;
    window.mountRemesaCodePin = mountRemesaCodePin;
    window.getDigitPin = getDigitPin;
    window.getCubaPhoneFromPin = getCubaPhoneFromPin;
})();
