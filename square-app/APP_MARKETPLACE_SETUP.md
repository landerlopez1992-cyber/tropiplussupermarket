# 🏪 Configuración para Square App Marketplace

Esta aplicación está diseñada para ser publicada en **Square App Marketplace** y ser instalada directamente en terminales POS de Square/Clover.

## 📋 Requisitos para Publicar

### 1. Crear App en Square Developer Dashboard

1. Ve a: https://developer.squareup.com/apps
2. Haz clic en **"Create App"**
3. Completa la información:
   - **App Name**: Tropiplus Supermarket
   - **Description**: Gestión simplificada de inventario y pedidos para comercios
   - **Category**: Inventory Management
   - **App Type**: Web Application

### 2. Configurar OAuth

En la configuración de tu app:

1. Ve a **"OAuth"** en el menú lateral
2. Agrega el **Redirect URI**:
   ```
   https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/oauth-callback.html
   ```
   (O tu dominio personalizado si lo tienes)

3. Selecciona los **Scopes** necesarios:
   - ✅ `ORDERS_READ`
   - ✅ `ORDERS_WRITE`
   - ✅ `INVENTORY_READ`
   - ✅ `INVENTORY_WRITE`
   - ✅ `ITEMS_READ`
   - ✅ `ITEMS_WRITE`
   - ✅ `CUSTOMERS_READ`
   - ✅ `CUSTOMERS_WRITE`

4. Guarda y copia:
   - **Application ID** (Application ID)
   - **Application Secret** (Application Secret) - ⚠️ NUNCA lo expongas en el frontend

### 3. Configurar Supabase Edge Function para OAuth

La función `square-oauth` debe estar configurada con:

**Secrets en Supabase Dashboard:**
- `SQUARE_APPLICATION_ID`: Tu Application ID
- `SQUARE_APPLICATION_SECRET`: Tu Application Secret
- `SQUARE_ENVIRONMENT`: `production` o `sandbox`

### 4. Actualizar Application ID en el código

Edita `square-app/js/square-oauth.js`:

```javascript
const SQUARE_APP_CONFIG = {
    applicationId: 'TU_APPLICATION_ID_AQUI', // ← Reemplaza
    redirectUri: 'https://tu-dominio.com/square-app/oauth-callback.html',
    // ...
};
```

### 5. Interfaz Optimizada para POS

La app ya incluye:
- ✅ Diseño táctil (botones grandes)
- ✅ Navegación simple
- ✅ Colores de alto contraste
- ✅ Fuentes grandes y legibles
- ✅ Optimizada para pantallas de 7-10 pulgadas

## 🚀 Proceso de Instalación para Merchants

1. **Merchant va a Square App Marketplace**
2. **Busca "Tropiplus Supermarket"**
3. **Hace clic en "Install"**
4. **Autoriza la app** (OAuth flow)
5. **La app se instala** en su terminal POS
6. **Puede acceder** desde el menú de aplicaciones del POS

## 📱 Cómo Funciona

1. **Primera vez**: Merchant autoriza la app → OAuth flow
2. **Access Token** se guarda en `localStorage` (encriptado)
3. **App usa el token** para hacer llamadas a Square API
4. **Token se renueva** automáticamente cuando expira

## 🔒 Seguridad

- ✅ OAuth flow completo (cada merchant autoriza su cuenta)
- ✅ Access tokens almacenados localmente (no en servidor)
- ✅ Application Secret solo en Supabase (nunca en frontend)
- ✅ HTTPS obligatorio para producción

## 📝 Checklist para Publicar

- [ ] App creada en Square Developer Dashboard
- [ ] OAuth configurado con Redirect URI correcto
- [ ] Scopes seleccionados
- [ ] Application ID actualizado en código
- [ ] Supabase Edge Function configurada con Secrets
- [ ] App probada en sandbox
- [ ] App probada en producción
- [ ] Documentación completa
- [ ] Screenshots para App Marketplace
- [ ] Descripción y categoría definidas
- [ ] Submit para revisión en Square

## 🎯 Próximos Pasos

1. Completar configuración OAuth
2. Probar en sandbox
3. Crear screenshots para App Marketplace
4. Escribir descripción de la app
5. Submit para revisión de Square
6. Una vez aprobada, estará disponible en App Marketplace

## 📚 Referencias

- [Square App Marketplace Guide](https://developer.squareup.com/docs/app-marketplace/build)
- [Square OAuth API](https://developer.squareup.com/docs/oauth-api/overview)
- [Square Developer Dashboard](https://developer.squareup.com/apps)
