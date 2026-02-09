# Tropiplus Supermarket - E-commerce Web Application

Aplicación web de e-commerce completa para Tropiplus Supermarket, integrada con Square POS API para gestión de productos, categorías, pedidos y pagos.

## 🚀 Características

- **Integración completa con Square API**
  - Productos y categorías en tiempo real
  - Gestión de inventario
  - Procesamiento de pagos (tarjeta y efectivo)
  - Gestión de órdenes
  - Clientes y autenticación

- **Funcionalidades del Usuario**
  - Registro e inicio de sesión
  - Carrito de compras
  - Lista de deseos
  - Gestión de órdenes
  - Panel de cuenta de usuario
  - Gestión de destinatarios

- **Diseño Responsive**
  - Diseño moderno y elegante
  - Totalmente responsive
  - Optimizado para móviles y tablets

## 📋 Requisitos

- Node.js (v14 o superior)
- Cuenta de Square Developer
- Credenciales de Square API (Access Token, Application ID, Location ID)

## 🛠️ Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/landerlopez1992-cyber/tropiplussupermarket.git
cd tropiplussupermarket
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar credenciales de Square:
   - Editar `js/square-config.js` con tus credenciales de Square
   - O configurar variables de entorno

4. Iniciar el servidor proxy:
```bash
node server-proxy.js
```

5. Abrir en el navegador:
```
http://localhost:8080
```

## 📁 Estructura del Proyecto

```
supermarket23/
├── css/
│   └── style.css          # Estilos principales
├── js/
│   ├── square-config.js   # Configuración de Square API
│   ├── square-integration.js  # Integración con Square
│   ├── square-orders.js   # Gestión de órdenes
│   ├── auth.js            # Autenticación de usuarios
│   ├── main.js            # Funcionalidad principal
│   └── ...
├── images/                # Imágenes y assets
├── index.html             # Página principal
├── products.html          # Lista de productos
├── product.html           # Detalle de producto
├── cart.html              # Carrito de compras
├── checkout.html          # Proceso de pago
├── login.html             # Inicio de sesión
├── register.html          # Registro
├── account.html           # Panel de cuenta
├── server-proxy.js        # Servidor proxy para CORS
└── README.md
```

## 🔧 Configuración de Square API

1. Obtén tus credenciales desde [Square Developer Dashboard](https://developer.squareup.com/)
2. Edita `js/square-config.js`:
```javascript
const SQUARE_CONFIG = {
  applicationId: 'TU_APPLICATION_ID',
  accessToken: 'TU_ACCESS_TOKEN',
  locationId: 'TU_LOCATION_ID',
  environment: 'production' // o 'sandbox' para pruebas
};
```

## 🌐 Páginas Principales

- **Inicio**: `index.html` - Página principal con productos destacados
- **Productos**: `products.html` - Catálogo completo de productos
- **Detalle**: `product.html` - Detalle de producto individual
- **Carrito**: `cart.html` - Carrito de compras
- **Checkout**: `checkout.html` - Proceso de pago
- **Login**: `login.html` - Inicio de sesión
- **Registro**: `register.html` - Registro de nuevos usuarios
- **Cuenta**: `account.html` - Panel de usuario
- **Órdenes**: `account-orders.html` - Historial de órdenes
- **Contacto**: `contacto.html` - Información de contacto
- **Ayuda**: `ayuda.html` - Centro de ayuda

## 💳 Métodos de Pago

- **Tarjeta de crédito/débito**: Procesado a través de Square Web Payments SDK
- **Efectivo**: Pago al recoger en tienda (24 horas para recoger)

## 📦 Gestión de Inventario

- Inventario en tiempo real desde Square
- Productos agotados marcados automáticamente
- Actualización automática del inventario al crear órdenes

## 🎨 Diseño

- Colores principales:
  - Azul oscuro: `#1a237e`
  - Verde categorías: `#4caf50`
  - Amarillo botones: `#ffd54b`
  - Rojo logo: `#e53935`

## 📝 Notas Importantes

- **No se realizan envíos**: Solo recogida en tienda
- **Ubicación**: Real Campiña, Aguada de Pasajeros, Cienfuegos
- **Horarios**: Lunes-Viernes 8AM-8PM, Sábados 8AM-6PM, Domingos 9AM-4PM

## 🔒 Seguridad

- Los pagos se procesan de forma segura a través de Square Payments
- No se almacenan datos de tarjetas de crédito
- Autenticación de usuarios integrada con Square Customers API

## 📞 Contacto

- **Oficina Cuba**: Real Campiña, Aguada de Pasajeros, Cienfuegos
  - Teléfono: +5353284160
- **Oficina USA**: 14654 Orange Blvd, Loxahatchee, FL 33470
  - Teléfono: +1 (772) 985-1015
- **Email**: info@tropiplussupermarket.com

## 📄 Licencia

© 2026 Tropiplus Supermarket. Todos los derechos reservados.

Land Installation Service LLC dba Tropiplus Supermarket
