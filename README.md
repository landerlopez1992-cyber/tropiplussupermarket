# Supermarket23 - Clon Exacto

Sitio web clonado exactamente de supermarket23.com con integración completa de Square POS.

## 🚀 Iniciar el Proyecto

```bash
cd supermarket23
node server-proxy.js
```

Luego abre: **http://localhost:8080**

## 📁 Estructura del Proyecto

```
supermarket23/
├── index.html              # Página principal (estructura idéntica)
├── css/
│   └── style.css          # Estilos exactos del sitio original
├── js/
│   ├── main.js            # Funcionalidad principal
│   ├── square-config.js   # Configuración de Square
│   └── square-integration.js # Integración con Square POS
├── images/                # Imágenes y assets
├── server-proxy.js        # Servidor proxy para Square API
└── README.md
```

## ✅ Características Implementadas

### Diseño Visual
- ✅ Header superior amarillo idéntico
- ✅ Header principal con logo, búsqueda y carrito
- ✅ Barra de categorías amarilla con scroll horizontal
- ✅ Hero banner púrpura con gradiente
- ✅ Sección "Más vendidos en la última hora"
- ✅ Banners promocionales (ECOFLOW, Puré de papas, Maicena)
- ✅ Sección "Nuevos combos YEYA"
- ✅ Categorías de interés
- ✅ Recomendaciones para ti
- ✅ Footer azul oscuro completo
- ✅ Carrito lateral deslizable

### Funcionalidad
- ✅ Integración completa con Square POS
- ✅ Carga dinámica de productos y categorías
- ✅ Carrito de compras funcional
- ✅ Búsqueda de productos
- ✅ Carousels con navegación
- ✅ Scroll horizontal de categorías
- ✅ Selector de cantidad
- ✅ Responsive design

## 🎨 Colores y Estilos

- **Amarillo Principal**: `#ffd54c`
- **Rojo**: `#e53935`
- **Púrpura Hero**: `#667eea` → `#764ba2`
- **Azul Footer**: `#1a237e`
- **Fuente**: Roboto

## 🔧 Configuración

Las credenciales de Square ya están configuradas en `js/square-config.js`:
- Application ID: `sq0idp-1soiZa2SKukDWOuzVG9QAA`
- Location ID: `L94DY3ZD6WS85`
- Environment: `production`

## 📱 Responsive

El sitio es completamente responsive y se adapta a:
- Desktop (1400px+)
- Tablet (768px - 1024px)
- Mobile (< 768px)

## 🆘 Solución de Problemas

Si no se cargan los productos:
1. Verifica que el servidor proxy esté corriendo
2. Revisa la consola del navegador (F12)
3. Verifica las credenciales de Square en `js/square-config.js`
