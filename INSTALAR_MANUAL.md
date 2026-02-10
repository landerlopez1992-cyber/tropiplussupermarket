# 📱 Instalar Tropiplus TV en Android TV

## ✅ APK Listo

El APK está en:
- `tv_app_flutter/build/app/outputs/flutter-apk/app-release.apk`
- También copiado en: `~/Desktop/Tropiplus-TV.apk`

## 🔌 Método 1: ADB por Red (Si funciona)

```bash
adb connect 192.168.1.112:32779
adb install -r tv_app_flutter/build/app/outputs/flutter-apk/app-release.apk
```

## 📦 Método 2: USB (Más Fácil)

1. **Copia el APK a una memoria USB:**
   - El APK está en: `tv_app_flutter/build/app/outputs/flutter-apk/app-release.apk`
   - O en el Escritorio: `Tropiplus-TV.apk`

2. **Conecta la USB al Android TV**

3. **Instala desde el TV:**
   - Abre un administrador de archivos en el TV (como "File Manager" o "ES File Explorer")
   - Navega a la USB
   - Busca `Tropiplus-TV.apk` o `app-release.apk`
   - Toca el archivo para instalar
   - Acepta "Instalar desde fuentes desconocidas" si se solicita

## 📲 Método 3: ADB por USB

Si tienes cable USB:

1. Conecta el TV a tu Mac por USB
2. Habilita "Depuración USB" en el TV
3. Ejecuta:
   ```bash
   adb devices
   adb install -r tv_app_flutter/build/app/outputs/flutter-apk/app-release.apk
   ```

## 🎯 Después de Instalar

1. Busca "Tropiplus TV" en el launcher del TV
2. Abre la app
3. Se mostrará el selector de TVs
4. Selecciona un TV para ver la pantalla grande

## ⚙️ Si ADB no se Conecta

El TV responde al ping pero ADB no conecta. Verifica:

1. **En el TV:**
   - Configuración > Dispositivo > Opciones de desarrollador
   - "Depuración USB" = ✅ ACTIVADA
   - "Depuración de red" = ✅ ACTIVADA
   - Anota la IP y puerto que muestra

2. **Verifica la IP:**
   - El TV está en: `192.168.1.112`
   - Pero el puerto puede ser diferente

3. **Prueba otros puertos:**
   ```bash
   adb connect 192.168.1.112:5555
   adb connect 192.168.1.112:32779
   ```

## 📝 Nota

El APK Flutter está listo y funcionando. Solo necesitas instalarlo en el TV usando uno de los métodos arriba.
