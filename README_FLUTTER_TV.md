# Tropiplus TV - App Flutter para Android TV

App Flutter simple que carga el selector de TVs en un WebView.

## ✅ APK Construido

El APK está en: `tv_app_flutter/build/app/outputs/flutter-apk/app-release.apk`

## 📲 Instalar en Android TV

```bash
./instalar-tv-flutter.sh 192.168.1.112:32779
```

O manualmente:
```bash
adb connect 192.168.1.112:32779
adb install -r tv_app_flutter/build/app/outputs/flutter-apk/app-release.apk
```

## 🔄 Reconstruir el APK

Si haces cambios:

```bash
cd tv_app_flutter
flutter build apk --release
cd ..
```

## ⚙️ Configurar URL

Edita `tv_app_flutter/lib/main.dart` y cambia la URL:

```dart
String baseUrl = 'https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv-selector.html';
```

Para desarrollo local:
```dart
String baseUrl = 'http://TU_IP:8080/tv-selector.html';
```

## 📁 Estructura

- `tv_app_flutter/` - Proyecto Flutter
  - `lib/main.dart` - Código principal
  - `android/` - Configuración Android
  - `build/app/outputs/flutter-apk/app-release.apk` - APK generado

## 🎯 Características

- ✅ Abre directamente el selector de TVs
- ✅ Optimizado para Android TV (LEANBACK_LAUNCHER)
- ✅ Orientación landscape forzada
- ✅ WebView con JavaScript habilitado
- ✅ Fácil de compilar: `flutter build apk --release`

## 🗑️ Archivos Eliminados

Se eliminaron los archivos de Capacitor:
- `android/` (proyecto Capacitor)
- `www/`
- `package.json`
- `capacitor.config.json`
- Scripts de Capacitor

Ahora solo queda la app Flutter que es mucho más simple.
