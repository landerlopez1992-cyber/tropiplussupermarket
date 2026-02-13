// Configuración privada de la app
// Esta app está diseñada para uso privado, no para distribución pública

const APP_CONFIG = {
    // Location ID permitido - Solo tu tienda puede usar esta app
    allowedLocationId: 'L94DY3ZD6WS85',
    
    // Merchant ID permitido (opcional - si lo tienes)
    allowedMerchantId: null, // Agregar si quieres restricción adicional
    
    // Modo privado - Si es true, solo funciona con la configuración permitida
    privateMode: true,
    
    // Mensaje de error si alguien intenta usar la app sin autorización
    accessDeniedMessage: 'Esta aplicación es de uso privado y no está disponible para otros comercios.'
};

// Verificar si el merchant tiene acceso
function checkAccess(locationId, merchantId = null) {
    if (!APP_CONFIG.privateMode) {
        return { allowed: true };
    }
    
    // Verificar Location ID
    if (locationId !== APP_CONFIG.allowedLocationId) {
        return {
            allowed: false,
            message: APP_CONFIG.accessDeniedMessage
        };
    }
    
    // Verificar Merchant ID si está configurado
    if (APP_CONFIG.allowedMerchantId && merchantId && merchantId !== APP_CONFIG.allowedMerchantId) {
        return {
            allowed: false,
            message: APP_CONFIG.accessDeniedMessage
        };
    }
    
    return { allowed: true };
}

// Exportar configuración
window.APP_CONFIG = APP_CONFIG;
window.checkAccess = checkAccess;
