# Instalación Rápida - App Android TV

## Pasos Rápidos para Generar el APK

### 1. Instalar Node.js y Dependencias

```bash
# Instalar Node.js si no lo tienes (desde nodejs.org)
# Luego instalar dependencias:
npm install
```

### 2. Inicializar Capacitor

```bash
npx cap sync
```

Esto creará la carpeta `android/` con el proyecto Android.

### 3. Abrir en Android Studio

1. Abre Android Studio
2. File > Open > Selecciona la carpeta `android/`
3. Espera a que sincronice (puede tardar varios minutos la primera vez)

### 4. Construir el APK

**Opción A - Desde Android Studio:**
- Build > Build Bundle(s) / APK(s) > Build APK(s)
- El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

**Opción B - Desde Terminal:**
```bash
cd android
./gradlew assembleDebug
```

### 5. Instalar en Android TV

**Método más fácil - ADB por USB:**
```bash
# Conecta el TV por USB y habilita depuración USB
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Método alternativo - USB:**
1. Copia el APK a una memoria USB
2. Conecta al TV
3. Instala desde un administrador de archivos

## ¿Qué hace la App?

✅ Al abrir, muestra automáticamente el **selector de TVs** configurados
✅ Al seleccionar un TV, muestra la **pantalla grande** con los datos
✅ Guarda la última selección para futuras sesiones
✅ Optimizada para control remoto de Android TV

## Archivos Importantes

- `android-tv-app.html` - Punto de entrada (redirige al selector)
- `tv-selector.html` - Lista de TVs disponibles
- `tv.html` - Pantalla grande con datos del TV
- `GUIA_ANDROID_TV_APP.md` - Guía completa con detalles

## Solución Rápida de Problemas

**Error: "npx: command not found"**
- Instala Node.js desde nodejs.org

**Error al sincronizar Capacitor**
- Asegúrate de estar en la carpeta del proyecto
- Ejecuta: `npm install` primero

**El APK no se instala**
- Habilita "Fuentes desconocidas" en el TV
- Verifica que el TV tenga Android TV (no solo Android)

**La app no aparece en el launcher**
- Reinicia el TV después de instalar
- Verifica que sea Android TV (no Android normal)

## Próximos Pasos

Una vez instalada, la app:
1. Abrirá directamente el selector de TVs
2. Mostrará todos los TVs previamente configurados desde Admin
3. Al seleccionar uno, mostrará la pantalla grande con productos/pedidos

¡Listo! 🎉
