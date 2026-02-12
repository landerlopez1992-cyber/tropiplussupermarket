// Square OAuth Integration para App Marketplace
// Basado en: https://developer.squareup.com/docs/app-marketplace/build
// IMPORTANTE: Cada merchant debe autorizar la app para acceder a su cuenta de Square

const SQUARE_APP_CONFIG = {
    // Application ID de tu app en Square Developer Dashboard
    // ⚠️ ACTUALIZA ESTE VALOR con tu Application ID real
    applicationId: 'sq0idp-1soiZa2SKukDWOuzVG9QAA',
    
    // Redirect URI configurado en Square Developer Dashboard
    // Debe coincidir EXACTAMENTE con el configurado en Square
    redirectUri: window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/oauth-callback.html'),
    
    // Scopes necesarios para la app
    scopes: [
        'ORDERS_READ',
        'ORDERS_WRITE',
        'INVENTORY_READ',
        'INVENTORY_WRITE',
        'ITEMS_READ',
        'ITEMS_WRITE',
        'CUSTOMERS_READ',
        'CUSTOMERS_WRITE'
    ].join(' ')
};

// Estado de conexión
let squareConnection = {
    connected: false,
    accessToken: null,
    locationId: null,
    merchantId: null
};

// Verificar si hay tokens guardados
function checkStoredTokens() {
    const stored = localStorage.getItem('square_connection');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            if (data.accessToken && data.expiresAt && new Date(data.expiresAt) > new Date()) {
                squareConnection = {
                    connected: true,
                    accessToken: data.accessToken,
                    locationId: data.locationId,
                    merchantId: data.merchantId
                };
                updateConnectionUI(true);
                return true;
            } else {
                // Token expirado, limpiar
                localStorage.removeItem('square_connection');
            }
        } catch (error) {
            console.error('Error leyendo tokens guardados:', error);
        }
    }
    return false;
}

// Iniciar proceso de OAuth
function initiateSquareOAuth() {
    const state = generateRandomString(32);
    sessionStorage.setItem('square_oauth_state', state);
    
    const params = new URLSearchParams({
        client_id: SQUARE_APP_CONFIG.applicationId,
        response_type: 'code',
        scope: SQUARE_APP_CONFIG.scopes,
        session: 'false', // No usar sesión persistente
        state: state,
        redirect_uri: SQUARE_APP_CONFIG.redirectUri
    });
    
    const authUrl = `https://squareup.com/oauth2/authorize?${params.toString()}`;
    window.location.href = authUrl;
}

// Procesar callback de OAuth
function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (error) {
        console.error('Error en OAuth:', error);
        showError('Error al conectar con Square: ' + error);
        return;
    }
    
    if (!code || !state) {
        console.error('Faltan parámetros en el callback');
        return;
    }
    
    // Verificar state
    const storedState = sessionStorage.getItem('square_oauth_state');
    if (state !== storedState) {
        console.error('State no coincide - posible ataque CSRF');
        showError('Error de seguridad en la conexión');
        return;
    }
    
    sessionStorage.removeItem('square_oauth_state');
    
    // Intercambiar code por access token
    exchangeCodeForToken(code);
}

// Intercambiar código por access token
async function exchangeCodeForToken(code) {
    try {
        // IMPORTANTE: Este intercambio debe hacerse en el servidor por seguridad
        // El Application Secret NUNCA debe estar en el frontend
        const SUPABASE_OAUTH_URL = 'https://fbbvfzeyhhopdwzsooew.supabase.co/functions/v1/square-oauth';
        
        const response = await fetch(SUPABASE_OAUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                redirect_uri: SQUARE_APP_CONFIG.redirectUri
            })
        });
        
        if (!response.ok) {
            throw new Error('Error intercambiando código por token');
        }
        
        const data = await response.json();
        
        // Guardar tokens
        const connectionData = {
            accessToken: data.access_token,
            locationId: data.location_id || data.locations?.[0]?.id,
            merchantId: data.merchant_id,
            expiresAt: new Date(Date.now() + (data.expires_in * 1000)).toISOString()
        };
        
        localStorage.setItem('square_connection', JSON.stringify(connectionData));
        
        squareConnection = {
            connected: true,
            accessToken: connectionData.accessToken,
            locationId: connectionData.locationId,
            merchantId: connectionData.merchantId
        };
        
        updateConnectionUI(true);
        
        // Redirigir a la app principal
        window.location.href = window.location.origin + '/square-app/index.html';
        
    } catch (error) {
        console.error('Error intercambiando código:', error);
        showError('Error al completar la conexión con Square');
    }
}

// Actualizar UI de conexión
function updateConnectionUI(connected) {
    const statusEl = document.getElementById('connection-status');
    const connectBtn = document.getElementById('connect-btn');
    
    if (!statusEl || !connectBtn) return;
    
    if (connected) {
        statusEl.className = 'connection-status connected';
        statusEl.innerHTML = '<i class="fas fa-circle"></i><span>Conectado</span>';
        connectBtn.innerHTML = '<i class="fas fa-check"></i> Conectado';
        connectBtn.disabled = true;
        connectBtn.style.background = '#4caf50';
    } else {
        statusEl.className = 'connection-status disconnected';
        statusEl.innerHTML = '<i class="fas fa-circle"></i><span>Desconectado</span>';
        connectBtn.innerHTML = '<i class="fas fa-plug"></i> Conectar con Square';
        connectBtn.disabled = false;
        connectBtn.style.background = '';
    }
}

// Desconectar
function disconnectSquare() {
    localStorage.removeItem('square_connection');
    squareConnection = {
        connected: false,
        accessToken: null,
        locationId: null,
        merchantId: null
    };
    updateConnectionUI(false);
    location.reload();
}

// Generar string aleatorio para state
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Mostrar error
function showError(message) {
    alert(message); // En producción, usar un modal mejor
}

// Exportar funciones
window.squareOAuth = {
    initiate: initiateSquareOAuth,
    handleCallback: handleOAuthCallback,
    disconnect: disconnectSquare,
    getConnection: () => squareConnection
};
