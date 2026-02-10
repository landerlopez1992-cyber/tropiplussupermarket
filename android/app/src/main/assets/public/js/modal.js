// Sistema de modales personalizados para reemplazar alerts del navegador

function showModal(title, message, type = 'info', onAccept = null) {
    // Remover modal existente si hay uno
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'custom-modal';
    
    const iconMap = {
        'success': '<i class="fas fa-check-circle"></i>',
        'error': '<i class="fas fa-exclamation-circle"></i>',
        'warning': '<i class="fas fa-exclamation-triangle"></i>',
        'info': '<i class="fas fa-info-circle"></i>'
    };
    
    const icon = iconMap[type] || iconMap['info'];
    const iconClass = `modal-icon-${type}`;
    
    modal.innerHTML = `
        <div class="custom-modal-content">
            <div class="custom-modal-header">
                <div class="${iconClass}">${icon}</div>
                <h3 class="custom-modal-title">${title}</h3>
                <button class="custom-modal-close" id="custom-modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="custom-modal-body">
                <p>${message}</p>
            </div>
            <div class="custom-modal-footer">
                <button class="custom-modal-btn custom-modal-btn-primary" id="custom-modal-accept">
                    Aceptar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Mostrar modal
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    // Cerrar modal
    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            if (onAccept) onAccept();
        }, 300);
    };
    
    document.getElementById('custom-modal-close').addEventListener('click', closeModal);
    document.getElementById('custom-modal-accept').addEventListener('click', closeModal);
    
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Cerrar con ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Hacer función disponible globalmente
window.showModal = showModal;
