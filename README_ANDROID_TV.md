# Tropiplus TV - App Android TV

Aplicación Android TV para mostrar pantallas de productos y pedidos en dispositivos Android TV.

## 🎯 Características

- ✅ Abre directamente el selector de TVs configurados
- ✅ Interfaz optimizada para control remoto
- ✅ Pantalla completa automática
- ✅ Sincronización con configuración web
- ✅ Soporte para múltiples TVs

## 📋 Requisitos

- Node.js 16+ 
- Android Studio
- Java JDK 11+
- Android TV con Android 5.0+ (API 21+)

## 🚀 Instalación Rápida

### 1. Instalar dependencias

```bash
npm install
```

### 2. Sincronizar con Capacitor

```bash
npx cap sync
```

### 3. Abrir en Android Studio

```bash
npx cap open android
```

O manualmente: Abre Android Studio > File > Open > Selecciona carpeta `android/`

### 4. Construir APK

**Opción A - Script automático:**
```bash
./build-apk.sh
```

**Opción B - Android Studio:**
- Build > Build Bundle(s) / APK(s) > Build APK(s)

**Opción C - Terminal:**
```bash
cd android
./gradlew assembleDebug
```

El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

## 📲 Instalación en Android TV

### Método 1: ADB (Recomendado)

```bash
# Conectar por USB
adb install android/app/build/outputs/apk/debug/app-debug.apk

# O por red WiFi
adb connect IP_DEL_TV:5555
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Método 2: USB Manual

1. Copia el APK a una memoria USB
2. Conecta al Android TV
3. Instala desde un administrador de archivos

## 🎮 Uso

1. **Al abrir la app**: Se muestra automáticamente el selector de TVs
2. **Seleccionar TV**: Usa el control remoto para navegar y seleccionar
3. **Ver pantalla grande**: Se muestra la pantalla con productos/pedidos del TV seleccionado
4. **Cambiar TV**: Presiona "Atrás" para volver al selector

## ⚙️ Configuración

Los TVs deben estar previamente configurados desde la interfaz de administración web:

1. Ve a Admin > TV
2. Crea/configura los TVs que quieres mostrar
3. La app Android TV los detectará automáticamente

## 📁 Estructura del Proyecto

```
supermarket23/
├── android-tv-app.html      # Punto de entrada (redirige al selector)
├── tv-selector.html          # Selector de TVs
├── tv.html                   # Pantalla grande
├── js/tv-display.js          # Lógica de visualización
├── package.json              # Dependencias
├── capacitor.config.json     # Configuración Capacitor
├── build-apk.sh              # Script de construcción
└── android/                  # Proyecto Android
    └── app/
        └── src/main/
            ├── AndroidManifest.xml
            └── java/com/tropiplus/tv/
                └── MainActivity.java
```

## 🔧 Personalización

### Cambiar el punto de entrada

Edita `android-tv-app.html` para cambiar el comportamiento:

```javascript
// Abrir directamente el último TV seleccionado
if (savedTvId) {
    window.location.href = 'tv.html?tv=' + encodeURIComponent(savedTvId);
    return;
}
```

### Cambiar nombre de la app

Edita `capacitor.config.json`:
```json
{
  "appName": "Tu Nombre Aquí"
}
```

### Cambiar ID del paquete

Edita `capacitor.config.json`:
```json
{
  "appId": "com.tuempresa.tuapp"
}
```

Y actualiza `AndroidManifest.xml` y `MainActivity.java` con el nuevo package.

## 🐛 Solución de Problemas

### La app no aparece en el launcher

- Verifica que el TV tenga Android TV (no solo Android)
- Reinicia el TV después de instalar
- Verifica `LEANBACK_LAUNCHER` en AndroidManifest.xml

### Error al construir

- Asegúrate de tener Android Studio instalado
- Verifica que Java JDK esté configurado
- Ejecuta `npx cap sync` antes de construir

### No se cargan los datos

- Verifica conexión a Internet del TV
- Revisa permisos de Internet en AndroidManifest.xml
- Verifica que los TVs estén configurados en la web

### La app se cierra

- Revisa logs: `adb logcat | grep Tropiplus`
- Verifica que todas las dependencias estén instaladas
- Asegúrate de que el webDir en capacitor.config.json sea correcto

## 📝 Notas

- La app requiere conexión a Internet para funcionar
- Los TVs deben estar configurados desde la interfaz web
- El localStorage se mantiene entre sesiones
- La app está optimizada para orientación landscape

## 📚 Documentación Adicional

- [Guía Completa](./GUIA_ANDROID_TV_APP.md) - Guía detallada paso a paso
- [Instalación Rápida](./INSTALACION_RAPIDA.md) - Guía rápida de instalación
- [Capacitor Docs](https://capacitorjs.com/docs) - Documentación de Capacitor
- [Android TV Docs](https://developer.android.com/training/tv) - Documentación Android TV

## 📄 Licencia

MIT

## 👥 Soporte

Para problemas o preguntas, consulta la documentación o revisa los logs de la aplicación.
