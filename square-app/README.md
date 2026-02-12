# Tropiplus Supermarket - Square App

Aplicación simplificada para gestionar inventario, pedidos y productos de Square desde una interfaz fácil de usar.

## Características

- ✅ **Gestión de Inventario**: Ver y actualizar inventario de productos fácilmente
- ✅ **Pedidos y Remesas**: Ver todos los pedidos con filtros por estado
- ✅ **Gestión de Productos**: Agregar nuevos productos directamente
- ✅ **Interfaz Simplificada**: Más fácil que la interfaz nativa de Square
- ✅ **Sin Configuración Adicional**: Usa el proxy de Square API ya configurado en el proyecto

## Configuración

**¡No se requiere configuración adicional!** 

La app usa automáticamente el proxy de Square API que ya está configurado en el proyecto (`square-config.js` y el proxy de Supabase). Solo necesitas:

1. Asegurarte de que `square-config.js` esté configurado correctamente con tu `accessToken` y `locationId`
2. Abrir la app en tu navegador

## Uso

1. Abre `square-app/index.html` en tu navegador o accede a:
   ```
   https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/
   ```
2. La app se conecta automáticamente usando el proxy existente
3. Comienza a gestionar tu inventario y pedidos

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
