# APIs de RapidAPI para Obtener GTIN/UPC/EAN/ISBN

## 📋 Resumen

Este documento lista las APIs disponibles en RapidAPI que pueden ayudar a obtener códigos GTIN/UPC/EAN/ISBN para productos.

## ✅ API Recomendada: "Barcodes Data"

**"Barcodes Data" API** es perfecta para tu caso porque:
- ✅ **Busca por nombre de producto** (no solo por código de barras)
- ✅ **Retorna GTIN/UPC/EAN** en la respuesta
- ✅ Endpoint: `GET /?query={nombre_producto_o_barcode}`
- ✅ URL: `https://barcodes-data.p.rapidapi.com/`
- ✅ Host: `barcodes-data.p.rapidapi.com`

### Cómo funciona:
- El parámetro `query` puede ser:
  - Un código de barras (para obtener información del producto)
  - Un término de búsqueda/nombre de producto (para obtener el GTIN)

## 🔍 Otras APIs Recomendadas (Alternativas)

### 1. **Barcode Lookup API** (RapidAPI)
- **Endpoint**: Busca productos por nombre y retorna GTIN
- **URL**: `rapidapi.com/barcodelookup/api/barcodelookup`
- **Método**: `GET /products/search?query={nombre_producto}`
- **Respuesta**: Incluye `gtin`, `upc`, `ean`, `barcode`

### 2. **UPC Database API** (RapidAPI)
- **Endpoint**: Busca UPC por nombre de producto
- **URL**: `rapidapi.com/upcdatabase/api/upcdatabase`
- **Método**: `GET /search?query={nombre_producto}`
- **Respuesta**: Incluye `upc`, `gtin`

### 3. **Big Product Data** (RapidAPI)
- ⚠️ **Limitación**: Principalmente busca productos POR GTIN, no busca GTIN por nombre
- ✅ Útil para: validar/convertir GTIN-14 a GTIN-13
- ❌ **NO recomendada** para buscar GTIN por nombre de producto

## 🛠️ Cómo Configurar "Barcodes Data" API

1. **Obtén tu API Key de RapidAPI:**
   - Ve a [RapidAPI - Barcodes Data](https://rapidapi.com/herosAPI/api/barcodes-data)
   - Crea una cuenta o inicia sesión
   - Haz clic en "Subscribe to Test" (plan gratuito disponible)
   - Copia tu API Key (aparece en el header `x-rapidapi-key`)

2. **Configura en el código:**
   - Abre `js/admin.js`
   - Busca `RAPIDAPI_CONFIG` (alrededor de la línea 3778)
   - Cambia `enabled: true`
   - Pega tu API Key en `apiKey`
   - El `host` ya está configurado para "Barcodes Data"

## 📝 Ejemplo de Configuración

```javascript
const RAPIDAPI_CONFIG = {
    enabled: true,
    apiKey: '43db5773a3msh2a82d305d0dbf5ap16f958jsna677a7d7e263', // Tu API key aquí
    host: 'barcodes-data.p.rapidapi.com',
    baseUrl: 'https://barcodes-data.p.rapidapi.com/'
};
```

**Nota**: Reemplaza el API key de ejemplo con tu API key real de RapidAPI.

## 🔄 Flujo Actual

El sistema intenta obtener GTIN en este orden:

1. **Desde HTML de la página del producto** (meta tags, JSON-LD, texto visible)
2. **Desde Square Catalog** (si el producto ya existe)
3. **Desde API externa de RapidAPI** (si está configurada) ⬅️ **NUEVO**

## 💡 Recomendación

**Para la mayoría de casos, la extracción desde HTML es suficiente** porque:
- Muchos sitios de proveedores incluyen GTIN en sus metadatos
- Amazon, eBay, y otros grandes marketplaces siempre incluyen GTIN
- Es más rápido y no requiere API key

**Usa API externa solo si:**
- El proveedor no incluye GTIN en su HTML
- Necesitas validar/convertir GTIN (GTIN-14 a GTIN-13)
- Quieres información adicional del producto

## 🚀 Próximos Pasos

1. **Prueba primero sin API externa** - La extracción desde HTML debería funcionar para la mayoría de casos
2. **Si necesitas API externa:**
   - Elige una API de RapidAPI que busque por nombre
   - Configura tu API key
   - La función `lookupGtinFromExternalApi` ya está lista para usar
