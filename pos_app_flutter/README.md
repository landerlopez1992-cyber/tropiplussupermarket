# Tropiplus POS - App Nativa para Terminal POS

App Android nativa para instalar directamente en terminales POS de Square/Clover.

## 🎯 Funcionalidades

- ✅ **Ver Inventario**: Visualizar todos los productos con su stock actual desde Square API
- ✅ **Actualizar Inventario**: Modificar cantidades de productos (NO agregar nuevos) - se actualiza en Square API
- ✅ **Ver Pedidos**: Lista de pedidos para recoger o entregar a domicilio desde Square API
- ✅ **Ver Remesas**: Remesas entrantes creadas desde la web - se leen desde Supabase/Square

## 📱 Características

- App Android nativa (APK)
- Se instala directamente en el terminal POS
- Interfaz táctil optimizada
- **NO requiere login** - Clover ya tiene sesión abierta
- Conecta con Square API para productos/inventario/pedidos
- Conecta con Supabase para remesas (creadas desde la web)
- Sin necesidad de navegador

## 🚀 Compilar e Instalar

### 1. Compilar APK

```bash
cd pos_app_flutter
flutter build apk --release
```

El APK estará en: `build/app/outputs/flutter-apk/app-release.apk`

### 2. Instalar en Terminal POS

**Opción A: ADB (si el terminal tiene depuración USB habilitada)**
```bash
adb install build/app/outputs/flutter-apk/app-release.apk
```

**Opción B: Transferir APK**
1. Copia el APK a una USB o sube a Google Drive
2. Abre el APK en el terminal POS
3. Instala la app

**Opción C: Clover App Market (para distribución)**
1. Sube el APK a Clover App Market
2. Los merchants lo descargan desde el market

## ⚙️ Configuración

### Conexiones

**Square API (Productos/Inventario/Pedidos):**
- Usa el proxy de Square API configurado en Supabase
- `lib/services/square_api.dart` → Conecta con Square vía proxy

**Supabase (Remesas):**
- Las remesas se crean desde la web y se guardan en Square como órdenes
- La app lee las remesas filtrando órdenes que contengan "Remesa" en el note
- `lib/services/supabase_api.dart` → Lee remesas desde Square API (filtradas)

### Sin Login Requerido

**La app NO requiere login** porque:
- Clover POS ya tiene sesión de Square abierta
- La app usa el proxy de Square API que ya está autenticado
- No hay pantalla de login en la app

### Cambiar Location ID

Si necesitas cambiar el `locationId`, edita:
- `lib/services/square_api.dart` → `_locationId` (línea ~12)

O guárdalo en SharedPreferences desde la app.

## 📂 Estructura

```
pos_app_flutter/
├── lib/
│   ├── main.dart              # Punto de entrada
│   ├── screens/
│   │   ├── home_screen.dart   # Pantalla principal con tabs
│   │   ├── inventory_screen.dart
│   │   ├── orders_screen.dart
│   │   └── shipments_screen.dart
│   └── services/
│       └── square_api.dart    # Cliente de Square API
└── android/                   # Configuración Android
```

## 🔧 Requisitos

- Flutter SDK 3.0+
- Android SDK
- Terminal POS con Android 5.0+ (API 21+)

## 📝 Notas

- La app está en modo landscape (horizontal) por defecto
- Optimizada para pantallas táctiles de 7-10 pulgadas
- No requiere conexión a internet constante (caché local)
