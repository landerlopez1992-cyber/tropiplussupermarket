# Tropiplus POS - App Nativa para Terminal POS

App Android nativa para instalar directamente en terminales POS de Square/Clover.

## 🎯 Funcionalidades

- ✅ **Ver Inventario**: Visualizar todos los productos con su stock actual
- ✅ **Actualizar Inventario**: Modificar cantidades de productos (NO agregar nuevos)
- ✅ **Ver Pedidos**: Lista de pedidos para recoger o entregar a domicilio
- ✅ **Ver Remesas**: Remesas entrantes con estado y tracking

## 📱 Características

- App Android nativa (APK)
- Se instala directamente en el terminal POS
- Interfaz táctil optimizada
- Conecta directamente con Square API
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

La app usa el proxy de Square API configurado en Supabase. No requiere configuración adicional.

Si necesitas cambiar el `locationId`, edita:
- `lib/services/square_api.dart` → `_locationId`

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
