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
        // Intentar obtener de Supabase
        const anonKey = window.SUPABASE_CONFIG?.anonKey || localStorage.getItem('supabase_anon_key');
        if (anonKey && anonKey !== 'null' && anonKey !== 'placeholder') {
            const response = await fetch(
                `${window.SUPABASE_CONFIG?.url || 'https://your-project.supabase.co'}/rest/v1/site_settings?key=eq.maintenance_mode&select=value`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': anonKey,
                        'Authorization': `Bearer ${anonKey}`
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.length > 0 && data[0].value === 'true') {
                    return true;
                }
            }
        }
        
        // Fallback a localStorage
        const localMaintenance = localStorage.getItem('tropiplus_maintenance_mode');
        return localMaintenance === 'true';
    } catch (error) {
        console.warn('Error obteniendo modo mantenimiento, usando localStorage:', error);
        const localMaintenance = localStorage.getItem('tropiplus_maintenance_mode');
        return localMaintenance === 'true';
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
