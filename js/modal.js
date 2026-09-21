// Sistema de modales personalizados para reemplazar alerts/confirm del navegador

function showModal(title, message, type = 'info', onAccept = null) {
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'custom-modal';

    const iconMap = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>',
        confirm: '<i class="fas fa-question-circle"></i>'
    };

    const icon = iconMap[type] || iconMap.info;
    const iconClass = `modal-icon-${type === 'confirm' ? 'warning' : type}`;

    modal.innerHTML = `
        <div class="custom-modal-content">
            <div class="custom-modal-header">
                <div class="${iconClass}">${icon}</div>
                <h3 class="custom-modal-title">${title}</h3>
                <button type="button" class="custom-modal-close" id="custom-modal-close" aria-label="Cerrar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="custom-modal-body">
                <p>${message}</p>
            </div>
            <div class="custom-modal-footer">
                <button type="button" class="custom-modal-btn custom-modal-btn-primary" id="custom-modal-accept">
                    Aceptar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);

    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            if (onAccept) onAccept();
        }, 300);
    };

    document.getElementById('custom-modal-close').addEventListener('click', closeModal);
    document.getElementById('custom-modal-accept').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * Modal de confirmación (reemplaza window.confirm).
 * @returns {Promise<boolean>}
 */
function showConfirm(title, message, options = {}) {
    const {
        confirmText = 'Aceptar',
        cancelText = 'Cancelar',
        type = 'confirm'
    } = options;

    return new Promise((resolve) => {
        const existingModal = document.getElementById('custom-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'custom-modal';
        modal.className = 'custom-modal';

        const iconMap = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>',
            confirm: '<i class="fas fa-question-circle"></i>'
        };
        const icon = iconMap[type] || iconMap.confirm;
        const iconClass = `modal-icon-${type === 'confirm' ? 'warning' : type}`;

        modal.innerHTML = `
            <div class="custom-modal-content">
                <div class="custom-modal-header">
                    <div class="${iconClass}">${icon}</div>
                    <h3 class="custom-modal-title">${title}</h3>
                    <button type="button" class="custom-modal-close" id="custom-modal-close" aria-label="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="custom-modal-body">
                    <p>${message}</p>
                </div>
                <div class="custom-modal-footer">
                    <button type="button" class="custom-modal-btn custom-modal-btn-secondary" id="custom-modal-cancel">
                        ${cancelText}
                    </button>
                    <button type="button" class="custom-modal-btn custom-modal-btn-primary" id="custom-modal-accept">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);

        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                resolve(value);
            }, 300);
        };

        document.getElementById('custom-modal-close').addEventListener('click', () => finish(false));
        document.getElementById('custom-modal-cancel').addEventListener('click', () => finish(false));
        document.getElementById('custom-modal-accept').addEventListener('click', () => finish(true));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) finish(false);
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escHandler);
                finish(false);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

/** Alias promise de showModal (solo Aceptar) */
function showAlert(title, message, type = 'info') {
    return new Promise((resolve) => {
        showModal(title, message, type, () => resolve());
    });
}

window.showModal = showModal;
window.showConfirm = showConfirm;
window.showAlert = showAlert;

/**
 * Overlay de carga centrado (mismo icono fa-spinner fa-spin, grande).
 */
function showLoadingModal(message = 'Cargando…') {
    hideLoadingModal();
    const el = document.createElement('div');
    el.id = 'app-loading-modal';
    el.className = 'app-loading-modal';
    el.innerHTML = `
        <div class="app-loading-modal-box">
            <i class="fas fa-spinner fa-spin app-loading-spinner" aria-hidden="true"></i>
            <p class="app-loading-text">${message}</p>
        </div>
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('active'));
}

function hideLoadingModal() {
    const el = document.getElementById('app-loading-modal');
    if (!el) return;
    el.classList.remove('active');
    setTimeout(() => el.remove(), 200);
}

window.showLoadingModal = showLoadingModal;
window.hideLoadingModal = hideLoadingModal;
