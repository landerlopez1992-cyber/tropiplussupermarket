# 📱 Instalar App en Square Register 0431 (Sin USB)

## ✅ APK Compilado

El APK está listo en:
```
pos_app_flutter/build/app/outputs/flutter-apk/app-release.apk
```

---

## 🔧 Métodos de Instalación (Sin USB)

### **MÉTODO 1: WiFi/Red Local (Recomendado)**

Si el Square Register tiene WiFi y permite depuración:

1. **Conecta el Register a la misma WiFi que tu computadora**

2. **Habilita "Depuración USB" o "Opciones de desarrollador" en el Register:**
   - Ve a **Configuración** → **Acerca del dispositivo**
   - Toca 7 veces en "Número de compilación" o "Versión de Android"
   - Esto activa las opciones de desarrollador

3. **Habilita "Depuración USB" o "Depuración de red":**
   - Ve a **Configuración** → **Opciones de desarrollador**
   - Activa "Depuración USB" o "Depuración de red"
   - Anota la IP del Register (aparece en la pantalla)

4. **Conecta desde tu computadora:**
   ```bash
   # Reemplaza IP_DEL_REGISTER con la IP que viste
   adb connect IP_DEL_REGISTER:5555
   
   # Verifica conexión
   adb devices
   
   # Instala el APK
   adb install pos_app_flutter/build/app/outputs/flutter-apk/app-release.apk
   ```

---

### **MÉTODO 2: Google Drive / Email**

1. **Sube el APK a Google Drive:**
   - Abre Google Drive en tu computadora
   - Sube: `pos_app_flutter/build/app/outputs/flutter-apk/app-release.apk`
   - Comparte el archivo (puede ser privado)

2. **Descarga en el Register:**
   - Abre Google Drive en el Register (si tiene app)
   - O abre el email con el APK adjunto
   - Descarga el APK

3. **Instala el APK:**
   - Abre el archivo descargado
   - Si pide "Permitir fuentes desconocidas", acepta
   - Toca "Instalar"

---

### **MÉTODO 3: Transferencia por Red Local**

Si el Register tiene acceso a archivos compartidos:

1. **Comparte el APK en la red:**
   - Coloca el APK en una carpeta compartida
   - O usa un servidor HTTP local

2. **Accede desde el Register:**
   - Abre el explorador de archivos
   - Navega a la carpeta compartida
   - Copia el APK al Register

3. **Instala el APK**

---

### **MÉTODO 4: QR Code (Si el Register tiene cámara)**

1. **Genera un QR con el APK:**
   - Sube el APK a un servicio de hosting temporal
   - Genera un QR code con la URL
   - Escanea el QR desde el Register (si tiene app de QR)

2. **Descarga e instala**

---

## ⚠️ Si el Register NO Permite Instalar APKs

Si Square Register tiene restricciones que impiden instalar APKs:

### **Opción A: Usar desde Otro Dispositivo**

1. **Instala el APK en un tablet/phone Android:**
   ```bash
   adb install pos_app_flutter/build/app/outputs/flutter-apk/app-release.apk
   ```

2. **Usa el tablet/phone junto al Register:**
   - El tablet muestra inventario, pedidos, remesas
   - El Register sigue funcionando normalmente
   - Ambos conectados a la misma red

### **Opción B: Usar la Web App desde Computadora**

1. **Abre la web app en tu computadora:**
   ```
   https://landerlopez1992-cyber.github.io/tropiplussupermarket/square-app/
   ```

2. **Úsala para gestionar:**
   - Inventario
   - Pedidos
   - Remesas

---

## 🎯 Pasos Rápidos (Recomendado)

1. **Intenta WiFi primero:**
   - Activa opciones de desarrollador en Register
   - Conecta por WiFi con `adb connect`
   - Instala el APK

2. **Si no funciona WiFi:**
   - Sube APK a Google Drive
   - Descarga en Register
   - Instala

3. **Si Register no permite APKs:**
   - Instala en tablet/phone Android
   - Úsalo junto al Register

---

## 📋 Verificar Instalación

Una vez instalado:

1. **Busca "Tropiplus POS" en el menú de apps del Register**
2. **Abre la app**
3. **Debería mostrar:**
   - Tab "Inventario"
   - Tab "Pedidos"
   - Tab "Remesas"

---

## ❓ ¿Qué Método Prefieres Intentar?

Dime qué método quieres probar y te guío paso a paso.

---

## 🔍 Si Necesitas Ayuda

1. **¿El Register tiene acceso a Configuración?**
   - Si sí → Intenta activar opciones de desarrollador

2. **¿El Register tiene WiFi?**
   - Si sí → Intenta conexión WiFi con ADB

3. **¿El Register tiene Google Play Store?**
   - Si sí → Podrías subir el APK a Play Store (privado)

4. **¿Tienes otro dispositivo Android disponible?**
   - Si sí → Instala el APK ahí y úsalo junto al Register

---

¿Qué método quieres probar primero?
