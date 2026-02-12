# 📱 Guía de Instalación - Tropiplus POS App

## ⚠️ IMPORTANTE: Tipo de Terminal

**Si tienes Square Register 0431 (sin USB):**
- ❌ NO puedes instalar APK directamente
- ✅ Usa la **Web App** desde el navegador
- Ver: `SQUARE_REGISTER_INSTALACION.md`

**Si tienes Clover o Android genérico (con USB):**
- ✅ Puedes instalar el APK
- Sigue las opciones abajo

---

## 📋 Opciones de Instalación

Hay varias formas de instalar la app en el terminal POS. Elige la que mejor se adapte a tu situación:

---

## 🔧 OPCIÓN 1: Instalación por USB/ADB (Recomendado para desarrollo)

### Requisitos:
- Terminal POS con **Depuración USB** habilitada
- Cable USB para conectar el terminal a tu computadora
- ADB instalado en tu computadora

### Pasos:

1. **Habilitar Depuración USB en el Terminal:**
   - Ve a **Configuración** → **Acerca del dispositivo**
   - Toca 7 veces en **"Número de compilación"** para activar opciones de desarrollador
   - Ve a **Configuración** → **Opciones de desarrollador**
   - Activa **"Depuración USB"**

2. **Conectar el Terminal:**
   ```bash
   # Conecta el terminal por USB
   # Verifica que esté conectado
   adb devices
   ```
   
   Deberías ver algo como:
   ```
   List of devices attached
   ABC123XYZ    device
   ```

3. **Compilar y Instalar:**
   ```bash
   cd pos_app_flutter
   
   # Compilar APK
   flutter build apk --release
   
   # Instalar directamente
   adb install build/app/outputs/flutter-apk/app-release.apk
   ```

4. **Verificar Instalación:**
   - Busca "Tropiplus POS" en el menú de apps del terminal
   - Abre la app

---

## 📦 OPCIÓN 2: Transferir APK Manualmente

### Requisitos:
- Terminal POS con acceso a archivos
- USB, Google Drive, o email

### Pasos:

1. **Compilar APK en tu computadora:**
   ```bash
   cd pos_app_flutter
   flutter build apk --release
   ```

2. **Transferir APK al Terminal:**
   
   **Opción A: USB**
   - Copia `build/app/outputs/flutter-apk/app-release.apk` a una USB
   - Conecta la USB al terminal POS
   - Abre el explorador de archivos en el terminal
   - Busca el APK en la USB
   - Toca el APK para instalar

   **Opción B: Google Drive**
   - Sube el APK a Google Drive
   - Abre Google Drive en el terminal POS
   - Descarga el APK
   - Toca el APK para instalar

   **Opción C: Email**
   - Envía el APK por email
   - Abre el email en el terminal POS
   - Descarga el APK
   - Toca el APK para instalar

3. **Permitir Instalación de Fuentes Desconocidas:**
   - Si el terminal pregunta, ve a **Configuración** → **Seguridad**
   - Activa **"Fuentes desconocidas"** o **"Instalar apps desconocidas"**

4. **Instalar:**
   - Toca el APK descargado
   - Sigue las instrucciones en pantalla

---

## 🌐 OPCIÓN 3: Clover App Market (Para distribución)

### Requisitos:
- Cuenta de desarrollador de Clover
- App aprobada por Clover

### Pasos:

1. **Registrarse como Desarrollador:**
   - Ve a: https://www.clover.com/developers
   - Crea una cuenta de desarrollador
   - Completa el proceso de verificación

2. **Subir App a Clover App Market:**
   - Compila el APK: `flutter build apk --release`
   - Sube el APK al Clover App Market
   - Completa la información de la app
   - Espera aprobación

3. **Instalar desde el Market:**
   - En el terminal POS, abre **Clover App Market**
   - Busca "Tropiplus POS"
   - Haz clic en **"Instalar"**

**Ventajas:**
- ✅ Distribución fácil a múltiples terminales
- ✅ Actualizaciones automáticas
- ✅ Instalación desde el terminal directamente

**Desventajas:**
- ❌ Requiere aprobación de Clover
- ❌ Puede tomar tiempo

---

## 📡 OPCIÓN 4: Instalación Remota (WiFi/Red)

### Requisitos:
- Terminal POS y computadora en la misma red WiFi
- ADB instalado
- Conocer la IP del terminal POS

### Pasos:

1. **Habilitar Depuración WiFi en el Terminal:**
   - Ve a **Configuración** → **Opciones de desarrollador**
   - Activa **"Depuración WiFi"**
   - Anota la IP y puerto mostrados (ej: `192.168.1.100:5555`)

2. **Conectar por WiFi:**
   ```bash
   # Conectar ADB por WiFi
   adb connect 192.168.1.100:5555
   
   # Verificar conexión
   adb devices
   ```

3. **Instalar:**
   ```bash
   cd pos_app_flutter
   flutter build apk --release
   adb install build/app/outputs/flutter-apk/app-release.apk
   ```

---

## 🚀 OPCIÓN 5: Script Automático

He creado un script que hace todo automáticamente:

```bash
# Desde la raíz del proyecto
./build-pos-app.sh
```

Este script:
1. Compila el APK
2. Te muestra las instrucciones
3. Si hay un dispositivo conectado, intenta instalar automáticamente

---

## ⚠️ Solución de Problemas

### Error: "device not found"
- Verifica que el terminal esté conectado: `adb devices`
- Verifica que la depuración USB esté activada
- Prueba desconectar y reconectar el cable USB

### Error: "INSTALL_FAILED_INSUFFICIENT_STORAGE"
- Libera espacio en el terminal POS
- Elimina apps no usadas

### Error: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"
- Desinstala la versión anterior primero:
  ```bash
  adb uninstall com.tropiplus.pos_app_flutter
  ```
- Luego instala la nueva versión

### Error: "Permission denied"
- Activa "Fuentes desconocidas" en Configuración → Seguridad
- Verifica permisos de administrador si es necesario

### El terminal no aparece en `adb devices`
- Verifica que la depuración USB esté activada
- Prueba otro cable USB
- Reinicia el terminal POS
- Verifica que los drivers USB estén instalados en tu computadora

---

## 📝 Verificar que Funciona

Después de instalar:

1. **Busca la app:**
   - Abre el menú de apps en el terminal
   - Busca "Tropiplus POS"

2. **Abre la app:**
   - Debería abrir directamente sin login
   - Verás 3 tabs: Inventario, Pedidos, Remesas

3. **Prueba las funcionalidades:**
   - **Inventario**: Debería mostrar productos de Square
   - **Pedidos**: Debería mostrar pedidos de Square
   - **Remesas**: Debería mostrar remesas creadas desde la web

---

## 🔄 Actualizar la App

Para actualizar a una nueva versión:

1. **Compilar nueva versión:**
   ```bash
   cd pos_app_flutter
   flutter build apk --release
   ```

2. **Instalar sobre la versión anterior:**
   ```bash
   adb install -r build/app/outputs/flutter-apk/app-release.apk
   ```
   
   El flag `-r` reemplaza la versión anterior.

---

## 💡 Recomendación

**Para desarrollo/pruebas:**
- Usa **Opción 1 (USB/ADB)** - Es la más rápida y fácil

**Para distribución a múltiples terminales:**
- Usa **Opción 3 (Clover App Market)** - Una vez aprobada, es la más fácil

**Para instalación rápida sin cables:**
- Usa **Opción 2 (Transferir APK)** - Funciona en cualquier terminal

---

## ❓ ¿Necesitas Ayuda?

Si tienes problemas con la instalación:
1. Verifica que el terminal POS tenga Android 5.0+ (API 21+)
2. Verifica que la depuración USB esté activada
3. Revisa los logs: `adb logcat` para ver errores
4. Asegúrate de que el APK se compiló correctamente

---

¡Listo para instalar! 🚀
