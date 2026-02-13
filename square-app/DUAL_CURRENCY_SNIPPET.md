# 💱 App de Conversión de Monedas para Square POS

## 🎯 Objetivo

Mostrar el **total en 2 monedas** (USD y CUP) durante el checkout en Square Register, para que el cajero sepa cuánto cobrar si el cliente paga en CUP.

---

## 📋 Solución: Square Snippets API

Square tiene una API llamada **Snippets API** que permite agregar widgets personalizados durante el checkout.

### Cómo funciona:

1. **Se instala como app en Square App Marketplace**
2. **Aparece como widget durante el checkout**
3. **Muestra el total en 2 monedas automáticamente**

---

## 🔧 Implementación

### Opción 1: Snippets API (Recomendado)

**Ventajas:**
- ✅ Se integra directamente en el checkout de Square
- ✅ Aparece automáticamente cuando hay un total
- ✅ No requiere modificar el POS

**Desventajas:**
- ⚠️ Requiere publicar en Square App Marketplace
- ⚠️ Necesita aprobación de Square

### Opción 2: App Nativa Android (Alternativa)

**Ventajas:**
- ✅ Control total
- ✅ No requiere aprobación de Square
- ✅ Se instala directamente en el Register

**Desventajas:**
- ⚠️ No se integra en el checkout de Square
- ⚠️ El cajero tendría que abrir la app manualmente

---

## 🚀 Implementación con Snippets API

### Archivos necesarios:

1. **`snippet.html`** - Widget que se muestra en el checkout
2. **`snippet-config.js`** - Configuración de tasa de cambio
3. **Registro en Square Developer** - Para publicar el snippet

### Ejemplo de código:

```html
<!-- snippet.html -->
<div id="dual-currency-display">
  <div class="currency-primary">
    Total: ${{total_amount}}
  </div>
  <div class="currency-secondary">
    Total: {{total_cup}} CUP
  </div>
</div>

<script>
  // Obtener total del checkout
  const total = window.Square?.checkout?.total || 0;
  const exchangeRate = 120; // 1 USD = 120 CUP (configurable)
  const totalCUP = (total / 100) * exchangeRate;
  
  // Mostrar ambos precios
  document.getElementById('dual-currency-display').innerHTML = `
    <div style="padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 10px 0;">
      <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">
        Total: $${(total / 100).toFixed(2)} USD
      </div>
      <div style="font-size: 20px; color: #666;">
        Total: ${totalCUP.toFixed(2)} CUP
      </div>
    </div>
  `;
</script>
```

---

## 📝 Pasos para Implementar

### 1. Crear el Snippet

- Archivo HTML con el widget
- JavaScript para calcular conversión
- CSS para estilos

### 2. Registrar en Square Developer

- Crear nueva aplicación
- Configurar como "Snippet"
- Subir el código HTML

### 3. Configurar Tasa de Cambio

- Agregar campo en admin para tasa de cambio
- Guardar en localStorage o BD
- Usar en el snippet

### 4. Publicar (Opcional)

- Si quieres que sea privada, no publicar
- Solo instalar en tu cuenta

---

## ⚙️ Configuración de Tasa de Cambio

Necesitamos agregar en el admin:

```javascript
// En admin.html
<div class="currency-config">
  <h3>Configuración de Monedas</h3>
  <label>Tasa de Cambio (1 USD = X CUP):</label>
  <input type="number" id="exchange-rate" value="120" step="0.01">
  <button onclick="saveExchangeRate()">Guardar</button>
</div>
```

---

## 🎯 Resultado Final

Cuando el cajero está cobrando:

```
┌─────────────────────────────┐
│  Total de la Venta          │
├─────────────────────────────┤
│  $25.50 USD                 │
│  3,060.00 CUP               │
└─────────────────────────────┘
```

El cajero ve ambos precios y sabe cuánto cobrar en CUP.

---

## ❓ ¿Quieres que lo implemente?

Puedo crear:
1. ✅ El snippet HTML/JS para Square
2. ✅ La configuración en el admin para tasa de cambio
3. ✅ La documentación para registrarlo en Square Developer

¿Procedo con la implementación?
