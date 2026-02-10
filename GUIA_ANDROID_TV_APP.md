# Guía para Crear la App Android TV - Tropiplus TV

Esta guía te ayudará a crear una aplicación APK para dispositivos Android TV que abra directamente el selector de TVs configurados.

## Requisitos Previos

1. **Node.js** (v16 o superior) - [Descargar](https://nodejs.org/)
2. **Android Studio** - [Descargar](https://developer.android.com/studio)
3. **Java JDK 11 o superior**

## Paso 1: Instalar Dependencias

```bash
# Instalar Node.js dependencies
npm install

# Instalar Capacitor CLI globalmente (opcional)
npm install -g @capacitor/cli
```

## Paso 2: Inicializar Capacitor

```bash
# Sincronizar Capacitor con tu proyecto
npx cap sync

# Esto creará la carpeta android/ con el proyecto Android
```

## Paso 3: Configurar Android Studio

1. Abre Android Studio
2. Selecciona "Open an Existing Project"
3. Navega a la carpeta `android/` de tu proyecto
4. Espera a que Android Studio sincronice el proyecto

## Paso 4: Configurar la App para Android TV

La configuración ya está lista en los archivos:
- `AndroidManifest.xml` - Configurado para Android TV con `LEANBACK_LAUNCHER`
- `MainActivity.java` - Forzado a orientación landscape
- `capacitor.config.json` - Configuración de la app

## Paso 5: Modificar el Punto de Entrada (Opcional)

Si quieres que la app abra directamente un TV específico en lugar del selector, edita `android-tv-app.html`:

```javascript
// Descomentar estas líneas para abrir directamente el último TV seleccionado:
if (savedTvId) {
    window.location.href = 'tv.html?tv=' + encodeURIComponent(savedTvId);
    return;
}
```

## Paso 6: Construir el APK

### Opción A: Desde Android Studio

1. Abre el proyecto en Android Studio
2. Ve a `Build > Build Bundle(s) / APK(s) > Build APK(s)`
3. Espera a que termine la compilación
4. El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

### Opción B: Desde la Terminal

```bash
# Compilar APK de debug
cd android
./gradlew assembleDebug

# El APK estará en: android/app/build/outputs/apk/debug/app-debug.apk
```

### Opción C: APK de Release (Firmado)

1. En Android Studio: `Build > Generate Signed Bundle / APK`
2. Selecciona "APK"
3. Crea un keystore si no tienes uno
4. Completa el formulario y genera el APK

## Paso 7: Instalar en Android TV

### Método 1: USB Debugging

1. Habilita "Modo desarrollador" en tu Android TV:
   - Ve a `Configuración > Dispositivo > Acerca`
   - Presiona 7 veces en "Número de compilación"
2. Habilita "Depuración USB"
3. Conecta el TV a tu computadora por USB
4. Instala el APK:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Método 2: Instalación Manual

1. Copia el APK a una memoria USB
2. Conecta la USB al Android TV
3. Usa un administrador de archivos en el TV para instalar el APK
4. Acepta instalar desde "Fuentes desconocidas" si se solicita

### Método 3: ADB por Red

1. Habilita depuración USB en el TV
2. Conecta el TV y la PC a la misma red WiFi
3. Obtén la IP del TV: `Configuración > Red > Configuración de red avanzada`
4. Conecta por ADB:
   ```bash
   adb connect IP_DEL_TV:5555
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

## Paso 8: Configurar como App de Inicio (Opcional)

Para que la app se abra automáticamente al encender el TV:

1. Instala una app de "Launcher" como "TV App Launcher"
2. Configura "Tropiplus TV" como app de inicio predeterminada

## Estructura de Archivos

```
supermarket23/
├── android-tv-app.html      # Punto de entrada de la app (redirige al selector)
├── tv-selector.html          # Selector de TVs configurados
├── tv.html                   # Pantalla grande con datos del TV
├── js/tv-display.js          # Lógica de visualización
├── package.json              # Dependencias Node.js
├── capacitor.config.json     # Configuración Capacitor
└── android/                  # Proyecto Android
    └── app/
        └── src/
            └── main/
                ├── AndroidManifest.xml
                └── java/com/tropiplus/tv/
                    └── MainActivity.java
```

## Características de la App

✅ **Abre directamente el selector de TVs** - No necesita navegación manual
✅ **Optimizado para Android TV** - Soporte para control remoto
✅ **Orientación landscape** - Forzada para pantallas grandes
✅ **Sincronización con localStorage** - Los TVs configurados se mantienen
✅ **Pantalla completa** - Experiencia inmersiva

## Solución de Problemas

### La app no aparece en el launcher del TV
- Verifica que `LEANBACK_LAUNCHER` esté en el AndroidManifest.xml
- Asegúrate de que el TV tenga Android TV (no solo Android)

### La app se cierra al abrir
- Verifica los permisos de Internet en AndroidManifest.xml
- Revisa los logs: `adb logcat | grep Tropiplus`

### No se cargan los datos
- Verifica la conexión a Internet del TV
- Revisa la consola del navegador integrado (si está habilitada)

### El selector no muestra TVs
- Los TVs deben estar configurados desde la interfaz de administración
- Verifica que localStorage esté funcionando (puede requerir permisos)

## Actualizar la App

Cuando hagas cambios en el código web:

```bash
# 1. Sincronizar cambios con Capacitor
npx cap sync

# 2. Reconstruir el APK
cd android
./gradlew assembleDebug
```

## Notas Importantes

- La app usa `android-tv-app.html` como punto de entrada, que redirige a `tv-selector.html`
- Los TVs deben estar previamente configurados desde la interfaz de administración
- La app requiere conexión a Internet para cargar productos y datos
- El localStorage se mantiene entre sesiones de la app

## Soporte

Para más información sobre Capacitor: https://capacitorjs.com/docs
Para Android TV: https://developer.android.com/training/tv
