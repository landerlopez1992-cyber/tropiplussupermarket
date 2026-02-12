# Guía de Configuración - Tropiplus Supermarket Square App

## Paso 1: Crear App en Square Developer Dashboard

1. Ve a https://developer.squareup.com/apps
2. Haz clic en "Create App"
3. Completa la información:
   - **App Name**: Tropiplus Supermarket
   - **Description**: Gestión simplificada de inventario y pedidos para Clover POS
   - **Category**: Inventory Management

## Paso 2: Configurar OAuth

1. En la configuración de tu app, ve a "OAuth"
2. Agrega el **Redirect URI**:
   ```
   https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/oauth-callback.html
   ```
3. Selecciona los siguientes **Scopes**:
   - ✅ `ORDERS_READ`
   - ✅ `ORDERS_WRITE`
   - ✅ `INVENTORY_READ`
   - ✅ `INVENTORY_WRITE`
   - ✅ `ITEMS_READ`
   - ✅ `ITEMS_WRITE`
   - ✅ `CUSTOMERS_READ`
   - ✅ `CUSTOMERS_WRITE`

4. Guarda los cambios y copia tu **Application ID** y **Application Secret**

## Paso 3: Configurar Supabase Edge Function

1. Ve a tu Supabase Dashboard: https://supabase.com/dashboard
2. Navega a **Edge Functions**
3. Crea una nueva función llamada `square-oauth`
4. Copia el código de `supabase/functions/square-oauth/index.ts`
5. Configura las **Secrets** (Settings > Edge Functions > Secrets):
   - `SQUARE_APPLICATION_ID`: Tu Application ID de Square
   - `SQUARE_APPLICATION_SECRET`: Tu Application Secret de Square
   - `SQUARE_ENVIRONMENT`: `production` o `sandbox`

## Paso 4: Actualizar Application ID en el código

Edita `square-app/js/square-oauth.js`:

```javascript
const SQUARE_APP_CONFIG = {
    applicationId: 'TU_APPLICATION_ID_AQUI', // ← Reemplaza esto
    // ...
};
```

## Paso 5: Desplegar

1. Sube todos los archivos a GitHub
2. Asegúrate de que GitHub Pages esté habilitado
3. La app estará disponible en:
   ```
   https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/
   ```

## Paso 6: Probar la Conexión

1. Abre la app en tu navegador
2. Haz clic en "Conectar con Square"
3. Autoriza la aplicación
4. Deberías ver "Conectado" en verde

## Solución de Problemas

### Error: "No se pudo intercambiar código por token"
- Verifica que las Secrets en Supabase estén configuradas correctamente
- Verifica que el Redirect URI en Square coincida exactamente

### Error: "Invalid redirect_uri"
- El Redirect URI en Square debe coincidir EXACTAMENTE con el de tu app
- Incluye el protocolo completo: `https://...`

### La app no carga
- Verifica que todos los archivos estén en GitHub
- Verifica que GitHub Pages esté habilitado
- Revisa la consola del navegador para errores

## Características de la App

### Inventario
- Ver todos los productos con su inventario actual
- Actualizar inventario fácilmente
- Filtrar por categoría y buscar productos
- Indicadores visuales de stock (Agotado/Bajo/Disponible)

### Pedidos
- Ver todos los pedidos y remesas
- Filtrar por estado (Pendiente/Procesando/Listo/Completado)
- Ver detalles de cada pedido

### Productos
- Agregar nuevos productos fácilmente
- Ver todos los productos
- Gestionar categorías

## Seguridad

⚠️ **IMPORTANTE**: 
- El `Application Secret` NUNCA debe estar en el código del cliente
- Solo debe estar en las Secrets de Supabase
- El intercambio OAuth siempre se hace en el servidor (Supabase Edge Function)
