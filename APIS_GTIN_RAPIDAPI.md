# APIs de RapidAPI para Obtener GTIN/UPC/EAN/ISBN

## 📋 Resumen

Este documento lista las APIs disponibles en RapidAPI que pueden ayudar a obtener códigos GTIN/UPC/EAN/ISBN para productos.

## ⚠️ Limitación Importante

**"Big Product Data" API** (que estás viendo en RapidAPI) **principalmente busca productos POR GTIN**, no busca GTIN por nombre de producto. Es decir:
- ✅ Puede validar/convertir GTIN-14 a GTIN-13
- ✅ Puede buscar información de un producto si ya tienes su GTIN
- ❌ **NO puede buscar GTIN basándose solo en el nombre del producto**

## 🔍 APIs Recomendadas para Buscar GTIN por Nombre

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

### 3. **Product Data API** (RapidAPI)
- Varias APIs con nombres similares
- Busca en RapidAPI por: "product search", "product lookup", "barcode search"

## 🛠️ Cómo Configurar

1. **Obtén tu API Key de RapidAPI:**
   - Ve a [RapidAPI](https://rapidapi.com)
   - Crea una cuenta o inicia sesión
   - Suscríbete a la API que elijas (muchas tienen plan gratuito)
   - Copia tu API Key

2. **Configura en el código:**
   - Abre `js/admin.js`
   - Busca `RAPIDAPI_CONFIG`
   - Cambia `enabled: true`
   - Pega tu API Key en `apiKey`
   - Ajusta el `host` según la API que uses

## 📝 Ejemplo de Configuración

```javascript
const RAPIDAPI_CONFIG = {
    enabled: true,
    apiKey: 'tu-api-key-aqui',
    host: 'barcodelookup.p.rapidapi.com', // O la API que elijas
};
```

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
