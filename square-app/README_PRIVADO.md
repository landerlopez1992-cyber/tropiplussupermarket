# 🔒 App Privada - Solo para Uso Personal

## ⚠️ IMPORTANTE: Esta app es PRIVADA

Esta aplicación está configurada para **uso privado solamente**. No está diseñada para distribución pública en Square App Marketplace.

---

## 🔐 Configuración de Privacidad

### Archivo: `js/app-config.js`

```javascript
const APP_CONFIG = {
    // Location ID permitido - Solo tu tienda puede usar esta app
    allowedLocationId: 'L94DY3ZD6WS85',
    
    // Modo privado - Si es true, solo funciona con la configuración permitida
    privateMode: true,
};
```

### Cómo Funciona:

1. **Cuando alguien intenta usar la app:**
   - La app verifica el `locationId` de su cuenta de Square
   - Si NO coincide con `allowedLocationId` → **Acceso Denegado**
   - Si coincide → **Acceso Permitido**

2. **Protección:**
   - ✅ Solo tu Location ID puede usar la app
   - ✅ Otros merchants verán mensaje de "Acceso Restringido"
   - ✅ No pueden ver inventario, pedidos, ni remesas

---

## 🚫 NO Publicar en App Marketplace

**Si publicas esta app en Square App Marketplace:**
- ❌ Cualquier merchant podrá intentar usarla
- ❌ Verán el mensaje de "Acceso Restringido"
- ❌ Puede generar confusión y malas reseñas
- ❌ No es la intención de la app

**Recomendación:** **NO publiques** esta app en App Marketplace si quieres que sea privada.

---

## ✅ Cómo Usar la App (Privada)

### Opción 1: Acceso Directo (Recomendado)

1. **Abre el navegador en tu Square Register:**
   ```
   https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/
   ```

2. **Conecta con Square:**
   - Haz clic en "Conectar con Square"
   - Autoriza la aplicación
   - La app verifica automáticamente que eres tú

3. **Usa la app normalmente:**
   - Solo tu Location ID puede acceder
   - Otros verán "Acceso Restringido"

### Opción 2: Agregar a Favoritos

1. Guarda la URL en favoritos del navegador del Register
2. Acceso rápido desde el menú

---

## 🔧 Cambiar Configuración

Si necesitas cambiar el `allowedLocationId`:

1. Edita `js/app-config.js`
2. Cambia `allowedLocationId` a tu nuevo Location ID
3. Guarda y sube a GitHub

---

## 📝 Si Quieres Hacerla Pública en el Futuro

Si en el futuro quieres hacerla pública:

1. **Edita `js/app-config.js`:**
   ```javascript
   privateMode: false,  // Cambiar a false
   ```

2. **Asegúrate de que la app funcione con cualquier Location ID:**
   - Prueba con diferentes cuentas
   - Verifica que no haya hardcodeo de IDs
   - Asegúrate de que OAuth funcione correctamente

3. **Luego sí puedes publicar en App Marketplace**

---

## ✅ Ventajas de App Privada

- ✅ Solo tú puedes usarla
- ✅ No necesitas publicar en App Marketplace
- ✅ No necesitas aprobación de Square
- ✅ Control total sobre quién accede
- ✅ Puedes cambiarla cuando quieras sin afectar a otros

---

## 🎯 Conclusión

**Esta app está configurada como PRIVADA.**
- ✅ Úsala directamente desde el navegador
- ✅ No la publiques en App Marketplace
- ✅ Solo tu Location ID puede acceder
- ✅ Otros verán "Acceso Restringido"

¡Perfecto para uso personal! 🔒
