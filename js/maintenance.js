// Sistema de Mantenimiento
// Solo se muestra en index.html (home)

document.addEventListener('DOMContentLoaded', function() {
    // Solo verificar mantenimiento en index.html
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        checkMaintenanceMode();
    }
});

async function checkMaintenanceMode() {
    try {
        // Verificar si el usuario es admin (si está logueado)
        const userSession = localStorage.getItem('square_user_session');
        if (userSession) {
            try {
                const session = JSON.parse(userSession);
                if (session.user?.role === 'admin') {
                    // Admin puede ver el sitio normalmente
                    return;
                }
            } catch (e) {
                // Continuar con verificación normal
            }
        }
        
        // Obtener estado de mantenimiento
        const maintenanceEnabled = await getMaintenanceMode();
        
        if (maintenanceEnabled) {
            showMaintenanceModal();
        }
    } catch (error) {
        console.error('Error verificando modo mantenimiento:', error);
    }
}

async function getMaintenanceMode() {
    try {
        if (typeof window.getSiteSettingFromFirebase === 'function' && window.isFirebaseConfigured?.()) {
            const value = await window.getSiteSettingFromFirebase('maintenance_mode');
            if (value !== null && value !== undefined) {
                return value === 'true' || value === true;
            }
        }
        return localStorage.getItem('tropiparts_maintenance_mode') === 'true';
    } catch (error) {
        console.warn('Error modo mantenimiento:', error);
        return localStorage.getItem('tropiparts_maintenance_mode') === 'true';
    }
}

function showMaintenanceModal() {
    const modal = document.getElementById('maintenance-modal');
    if (modal) {
        modal.style.display = 'flex';
        // NO prevenir scroll - permitir acceso al header
        // document.body.style.overflow = 'hidden'; // COMENTADO
    }
}

function hideMaintenanceModal() {
    const modal = document.getElementById('maintenance-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Si el usuario hace login exitosamente, ocultar el modal
window.addEventListener('storage', function(e) {
    if (e.key === 'square_user_session' && e.newValue) {
        try {
            const session = JSON.parse(e.newValue);
            if (session.user?.role === 'admin') {
                hideMaintenanceModal();
            }
        } catch (e) {
            // Ignorar errores de parsing
        }
    }
});
