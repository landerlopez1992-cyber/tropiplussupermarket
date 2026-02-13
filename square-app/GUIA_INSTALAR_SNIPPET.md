# 📱 Guía: Instalar App de Conversión de Monedas en Square Register

## 🎯 Objetivo

Instalar un widget que muestre el **total en 2 monedas** (USD y CUP) durante el checkout en tu Square Register.

---

## 📋 Paso 1: Crear la App en Square Developer

### 1.1 Acceder a Square Developer

1. Ve a: **https://developer.squareup.com/**
2. Inicia sesión con tu cuenta de Square
3. Ve a **Dashboard** → **Applications**

### 1.2 Crear Nueva Aplicación

1. Haz clic en **"Create Application"** o **"Nueva Aplicación"**
2. Completa el formulario:
   - **Nombre:** `Tropiplus Dual Currency`
   - **Descripción:** `Muestra total en USD y CUP durante el checkout`
   - **Tipo:** Selecciona **"Snippet"** o **"Web App"**

### 1.3 Configurar Snippet

1. En la configuración de la app, busca **"Snippet"** o **"Checkout Widget"**
2. Sube el archivo: `snippet-dual-currency.html`
3. Configura:
   - **URL del snippet:** (si es web app, usa la URL de GitHub Pages)
   - **Permisos:** Solo lectura de checkout (no necesita escribir)

---

## 📋 Paso 2: Obtener Application ID y Access Token

### 2.1 Application ID

1. En la página de tu aplicación, copia el **Application ID**
2. Se ve así: `sq0idp-XXXXXXXXXXXXX`

### 2.2 Access Token (Opcional para Snippets)

- Los Snippets generalmente no necesitan Access Token
- Si lo pide, genera uno en **"OAuth"** o **"API Keys"**

---

## 📋 Paso 3: Instalar en Square Register

### 3.1 Desde Square Dashboard

1. Ve a: **https://squareup.com/dashboard**
2. Ve a **"Apps"** o **"Aplicaciones"**
3. Busca **"Tropiplus Dual Currency"** o el nombre que le diste
4. Haz clic en **"Install"** o **"Instalar"**

### 3.2 Desde Square Register

1. En el Square Register, ve a **Configuración**
2. Busca **"Apps"** o **"Aplicaciones"**
3. Busca tu app y haz clic en **"Instalar"**

---

## 📋 Paso 4: Configurar Tasa de Cambio

### 4.1 Desde el Admin Web

1. Ve a tu admin web: `admin.html`
2. Busca la sección **"Configuración de Monedas"**
3. Ingresa la tasa de cambio: **1 USD = X CUP**
4. Guarda

### 4.2 Actualizar el Snippet

El snippet lee la tasa de cambio de:
- `localStorage` (si está configurado en el admin)
- O directamente del código (cambiar `EXCHANGE_RATE` en `snippet-dual-currency.html`)

---

## 📋 Paso 5: Probar

### 5.1 Hacer una Venta de Prueba

1. En el Square Register, inicia una venta
2. Agrega productos al carrito
3. Ve al checkout
4. **Deberías ver el widget mostrando:**
   ```
   Total de la Venta
   $25.50 USD
   3,060.00 CUP
   ```

### 5.2 Verificar

- ✅ El widget aparece automáticamente
- ✅ Muestra el total en USD
- ✅ Muestra el total en CUP (convertido)
- ✅ Se actualiza cuando cambia el total

---

## 🔧 Configuración Avanzada

### Cambiar Tasa de Cambio

Edita `snippet-dual-currency.html`:

```javascript
const EXCHANGE_RATE = 120; // Cambia este valor
```

### Cambiar Colores

Edita el CSS en `snippet-dual-currency.html`:

```css
.dual-currency-container {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* Cambia los colores aquí */
}
```

---

## ❌ Si No Funciona

### Problema: El widget no aparece

**Solución:**
1. Verifica que la app esté instalada en Square Register
2. Verifica que el snippet esté correctamente configurado en Square Developer
3. Revisa la consola del navegador (si es web app) para errores

### Problema: No muestra el total correcto

**Solución:**
1. Verifica que el código esté obteniendo el total correctamente
2. Ajusta la función `getCheckoutTotal()` según tu versión de Square
3. Verifica la tasa de cambio

### Problema: No se actualiza automáticamente

**Solución:**
1. El código usa `MutationObserver` para detectar cambios
2. Si no funciona, aumenta el intervalo de actualización:
   ```javascript
   setInterval(updateDisplay, 500); // Actualizar cada 500ms
   ```

---

## 📝 Notas Importantes

1. **Snippets API:** Square puede tener restricciones sobre qué snippets se pueden usar
2. **Aprobación:** Si publicas en App Marketplace, puede requerir aprobación
3. **Privada:** Si solo es para ti, puedes instalarla directamente sin publicar

---

## 🚀 Alternativa: App Nativa

Si los Snippets no funcionan, puedes usar la **app Android nativa** que ya creamos:

1. Instala `pos_app_flutter` en el Register
2. Abre la app durante el checkout
3. Ingresa el total manualmente
4. La app muestra la conversión

---

## ✅ Checklist

- [ ] App creada en Square Developer
- [ ] Snippet configurado y subido
- [ ] App instalada en Square Register
- [ ] Tasa de cambio configurada
- [ ] Probado con una venta real
- [ ] Widget aparece correctamente
- [ ] Muestra ambos precios

---

¿Necesitas ayuda con algún paso específico?
