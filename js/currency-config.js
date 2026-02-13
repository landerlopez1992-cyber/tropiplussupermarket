// Configuración de Monedas Múltiples
// Permite mostrar precios en 2 monedas simultáneamente

const CURRENCY_STORAGE_KEY = 'tropiplus_currency_config';

// Configuración por defecto
const DEFAULT_CURRENCY_CONFIG = {
    enabled: false,
    primaryCurrency: {
        code: 'USD',
        symbol: 'US$',
        name: 'Dólar Estadounidense'
    },
    secondaryCurrency: {
        code: 'CUP', // Moneda Nacional Cubana
        symbol: '$',
        name: 'Peso Cubano'
    },
    exchangeRate: 1.0, // Tasa de cambio: 1 USD = X CUP
    showBoth: true, // Mostrar ambas monedas
    primaryFirst: true // Mostrar moneda primaria primero
};

// Cargar configuración de moneda
function loadCurrencyConfig() {
    try {
        const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
        if (stored) {
            const config = JSON.parse(stored);
            return { ...DEFAULT_CURRENCY_CONFIG, ...config };
        }
    } catch (error) {
        console.error('Error cargando configuración de moneda:', error);
    }
    return DEFAULT_CURRENCY_CONFIG;
}

// Guardar configuración de moneda
function saveCurrencyConfig(config) {
    try {
        localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(config));
        return true;
    } catch (error) {
        console.error('Error guardando configuración de moneda:', error);
        return false;
    }
}

// Convertir precio de moneda primaria a secundaria
function convertToSecondaryCurrency(amountInPrimary) {
    const config = loadCurrencyConfig();
    if (!config.enabled || !config.exchangeRate) {
        return null;
    }
    return amountInPrimary * config.exchangeRate;
}

// Formatear precio en moneda primaria
function formatPrimaryCurrency(amount) {
    const config = loadCurrencyConfig();
    const symbol = config.primaryCurrency?.symbol || 'US$';
    return `${symbol}${amount.toFixed(2)}`;
}

// Formatear precio en moneda secundaria
function formatSecondaryCurrency(amount) {
    const config = loadCurrencyConfig();
    const symbol = config.secondaryCurrency?.symbol || '$';
    return `${symbol}${amount.toFixed(2)}`;
}

// Formatear precio con ambas monedas
function formatDualCurrency(amountInPrimary) {
    const config = loadCurrencyConfig();
    
    if (!config.enabled || !config.showBoth) {
        // Si no está habilitado, mostrar solo moneda primaria
        return formatPrimaryCurrency(amountInPrimary);
    }
    
    const secondaryAmount = convertToSecondaryCurrency(amountInPrimary);
    if (secondaryAmount === null) {
        return formatPrimaryCurrency(amountInPrimary);
    }
    
    const primaryFormatted = formatPrimaryCurrency(amountInPrimary);
    const secondaryFormatted = formatSecondaryCurrency(secondaryAmount);
    
    if (config.primaryFirst) {
        return `${primaryFormatted} / ${secondaryFormatted}`;
    } else {
        return `${secondaryFormatted} / ${primaryFormatted}`;
    }
}

// Formatear precio desde Square (centavos a dólares)
function formatSquarePriceDual(price) {
    if (!price) return '$0.00';
    const amount = (price.amount || price) / 100; // Convertir centavos a dólares
    return formatDualCurrency(amount);
}

// Formatear precio desde Square (solo primaria)
function formatSquarePricePrimary(price) {
    if (!price) return '$0.00';
    const amount = (price.amount || price) / 100;
    return formatPrimaryCurrency(amount);
}

// Exportar funciones
window.currencyConfig = {
    load: loadCurrencyConfig,
    save: saveCurrencyConfig,
    formatDual: formatDualCurrency,
    formatPrimary: formatPrimaryCurrency,
    formatSecondary: formatSecondaryCurrency,
    formatSquareDual: formatSquarePriceDual,
    formatSquarePrimary: formatSquarePricePrimary,
    convert: convertToSecondaryCurrency
};
