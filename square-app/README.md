# Tropiplus Supermarket - Square App

Aplicación simplificada para gestionar inventario, pedidos y productos de Square desde una interfaz fácil de usar.

## Características

- ✅ **Gestión de Inventario**: Ver y actualizar inventario de productos fácilmente
- ✅ **Pedidos y Remesas**: Ver todos los pedidos con filtros por estado
- ✅ **Gestión de Productos**: Agregar nuevos productos directamente
- ✅ **Interfaz Simplificada**: Más fácil que la interfaz nativa de Square
- ✅ **Conexión OAuth**: Conexión segura con tu cuenta de Square

## Configuración

### 1. Crear App en Square Developer Dashboard

1. Ve a [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Crea una nueva aplicación
3. Configura OAuth:
   - **Redirect URI**: `https://tu-dominio.com/square-app/oauth-callback.html`
   - **Scopes necesarios**:
     - `ORDERS_READ`
     - `ORDERS_WRITE`
     - `INVENTORY_READ`
     - `INVENTORY_WRITE`
     - `ITEMS_READ`
     - `ITEMS_WRITE`
     - `CUSTOMERS_READ`
     - `CUSTOMERS_WRITE`

### 2. Configurar Application ID

Edita `js/square-oauth.js` y actualiza:
```javascript
applicationId: 'TU_APPLICATION_ID_AQUI'
```

### 3. Configurar Proxy OAuth (Backend)

Necesitas crear un endpoint seguro para intercambiar el código OAuth por access token.

**Opción A: Supabase Edge Function**

Crea una función en Supabase que haga el intercambio:

```javascript
// supabase/functions/square-oauth/index.js
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { code, redirect_uri } = await req.json()
  
  const response = await fetch('https://connect.squareup.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: Deno.env.get('SQUARE_APPLICATION_ID'),
      client_secret: Deno.env.get('SQUARE_APPLICATION_SECRET'),
      code,
      redirect_uri,
      grant_type: 'authorization_code'
    })
  })
  
  const data = await response.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Opción B: Vercel/Netlify Function**

Similar estructura pero adaptada a la plataforma.

## Uso

1. Abre `index.html` en tu navegador
2. Haz clic en "Conectar con Square"
3. Autoriza la aplicación en Square
4. Comienza a gestionar tu inventario y pedidos

## Estructura de Archivos

```
square-app/
├── index.html              # Página principal
├── oauth-callback.html     # Callback de OAuth
├── css/
│   └── app.css            # Estilos
├── js/
│   ├── square-oauth.js    # Manejo de OAuth
│   ├── square-api.js      # Cliente de Square API
│   └── app.js             # Lógica principal
└── README.md              # Esta guía
```

## Notas Importantes

- ⚠️ El intercambio de código OAuth **debe hacerse en el servidor** por seguridad
- ⚠️ Nunca expongas tu `client_secret` en el código del cliente
- ⚠️ Los access tokens expiran, la app maneja la renovación automáticamente

## Referencias

- [Square OAuth Documentation](https://developer.squareup.com/docs/oauth-api/overview)
- [Square App Marketplace](https://developer.squareup.com/docs/app-marketplace/build)
- [Square API Reference](https://developer.squareup.com/reference/square)
