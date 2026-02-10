# 📺 Guía de Instalación en Android TV

## Método Rápido (Recomendado)

```bash
cd supermarket23
./instalar-en-tv.sh
```

El script te pedirá la IP del TV y hará todo automáticamente.

## Método Manual Paso a Paso

### Paso 1: Habilitar Depuración en el Android TV

1. Ve a **Configuración > Dispositivo > Acerca**
2. Presiona **7 veces** en "Número de compilación"
3. Vuelve a **Configuración > Dispositivo > Opciones de desarrollador**
4. Habilita **"Depuración USB"**
5. Habilita **"Depuración de red"** (opcional pero recomendado)

### Paso 2: Obtener la IP del TV

1. Ve a **Configuración > Red > Configuración de red avanzada**
2. Anota la **dirección IP** (ejemplo: 192.168.1.100)

### Paso 3: Construir el APK

Si aún no has construido el APK:

**Opción A - Android Studio:**
1. Abre Android Studio
2. File > Open > Selecciona carpeta `android/`
3. Build > Build Bundle(s) / APK(s) > Build APK(s)
4. El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

**Opción B - Terminal:**
```bash
cd android
./gradlew assembleDebug
```

### Paso 4: Conectar por ADB

```bash
# Conectar al TV por su IP
adb connect IP_DEL_TV:5555

# Ejemplo:
adb connect 192.168.1.100:5555
```

Si funciona, verás:
```
connected to 192.168.1.100:5555
```

### Paso 5: Verificar Conexión

```bash
adb devices
```

Deberías ver algo como:
```
List of devices attached
192.168.1.100:5555    device
```

### Paso 6: Instalar el APK

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Si ya está instalada y quieres actualizarla:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Paso 7: Abrir la App (Opcional)

```bash
adb shell am start -n com.tropiplus.tv/.MainActivity
```

## Solución de Problemas

### "No se puede conectar"

**Problema:** `adb connect` no funciona

**Soluciones:**
1. Verifica que el TV y tu PC estén en la misma red WiFi
2. Asegúrate de que "Depuración de red" esté habilitada
3. Verifica que la IP sea correcta
4. Intenta reiniciar el TV
5. Prueba desconectar y volver a conectar:
   ```bash
   adb disconnect
   adb connect IP_DEL_TV:5555
   ```

### "Device unauthorized"

**Problema:** El TV muestra un diálogo de autorización

**Solución:**
1. En el TV, acepta el diálogo que dice "¿Permitir depuración USB?"
2. Marca "Siempre permitir desde este equipo"
3. Vuelve a intentar `adb connect`

### "APK no se instala"

**Problema:** Error al instalar

**Soluciones:**
1. Desinstala la versión anterior:
   ```bash
   adb uninstall com.tropiplus.tv
   ```
2. Verifica espacio en el TV
3. Habilita "Instalar desde fuentes desconocidas" en el TV
4. Intenta instalar con `-r` (reemplazar):
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

### "La app no aparece en el launcher"

**Problema:** Instalada pero no visible

**Soluciones:**
1. Reinicia el TV
2. Verifica que sea Android TV (no solo Android)
3. Busca "Tropiplus TV" en el launcher
4. Verifica que `LEANBACK_LAUNCHER` esté en AndroidManifest.xml

### "ADB no encontrado"

**Problema:** `command not found: adb`

**Solución:**
1. Instala Android SDK Platform Tools
2. O agrega la ruta al PATH:
   ```bash
   export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools
   ```

## Comandos Útiles

```bash
# Ver dispositivos conectados
adb devices

# Desconectar
adb disconnect

# Ver logs de la app
adb logcat | grep Tropiplus

# Desinstalar la app
adb uninstall com.tropiplus.tv

# Abrir la app
adb shell am start -n com.tropiplus.tv/.MainActivity

# Reiniciar el TV (requiere root)
adb reboot
```

## Instalación por USB (Alternativa)

Si la conexión por red no funciona:

1. Conecta el TV a tu PC por USB
2. Habilita "Depuración USB" en el TV
3. Verifica conexión:
   ```bash
   adb devices
   ```
4. Instala:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

## Actualizar la App

Cuando hagas cambios y quieras actualizar:

1. Actualiza los archivos:
   ```bash
   ./update-tv-app.sh
   ```

2. Reconstruye el APK:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

3. Reinstala:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

O usa el script automático:
```bash
./instalar-en-tv.sh IP_DEL_TV
```

## Notas

- La conexión por red es más conveniente que USB
- El TV debe estar encendido y en la misma red
- La IP del TV puede cambiar si se reinicia el router
- Guarda la IP del TV para futuras instalaciones
