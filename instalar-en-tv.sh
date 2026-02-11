#!/bin/bash

# Script para construir el APK e instalarlo en Android TV por red
# Uso: ./instalar-en-tv.sh [IP_DEL_TV]

echo "📱 Instalador de Tropiplus TV para Android TV"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    echo "   Asegúrate de estar en el directorio supermarket23"
    exit 1
fi

# Verificar ADB
if ! command -v adb &> /dev/null; then
    echo "❌ Error: ADB no está instalado"
    echo "   Instala Android SDK Platform Tools"
    exit 1
fi

# Paso 1: Construir el APK si no existe
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$APK_PATH" ]; then
    echo "🔨 Construyendo APK..."
    echo ""
    
    # Verificar que existe la carpeta android
    if [ ! -d "android" ]; then
        echo "📦 Sincronizando Capacitor..."
        npx cap sync
    fi
    
    # Intentar construir con Gradle
    cd android
    
    if [ ! -f "gradlew" ]; then
        echo "❌ Error: Gradle wrapper no encontrado"
        echo "   Abre el proyecto en Android Studio primero"
        exit 1
    fi
    
    chmod +x gradlew
    ./gradlew assembleDebug
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Error al construir el APK"
        echo "   Abre el proyecto en Android Studio y construye desde ahí:"
        echo "   Build > Build Bundle(s) / APK(s) > Build APK(s)"
        exit 1
    fi
    
    cd ..
    echo ""
fi

if [ ! -f "$APK_PATH" ]; then
    echo "❌ Error: No se pudo construir el APK"
    exit 1
fi

echo "✅ APK construido: $APK_PATH"
echo ""

# Paso 2: Obtener IP del TV
if [ -z "$1" ]; then
    echo "📡 Buscando dispositivos Android en la red..."
    echo ""
    echo "Por favor, proporciona la IP de tu Android TV."
    echo "Puedes encontrarla en: Configuración > Red > Configuración de red avanzada"
    echo ""
    read -p "IP del Android TV: " TV_IP
    
    if [ -z "$TV_IP" ]; then
        echo "❌ IP no proporcionada"
        exit 1
    fi
else
    TV_IP=$1
fi

# Paso 3: Conectar por ADB
echo ""
echo "🔌 Conectando a $TV_IP:5555..."
adb connect $TV_IP:5555

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ No se pudo conectar al TV"
    echo ""
    echo "Asegúrate de:"
    echo "  1. El TV está encendido y en la misma red WiFi"
    echo "  2. La depuración USB está habilitada en el TV:"
    echo "     Configuración > Dispositivo > Acerca > Presiona 7 veces en 'Número de compilación'"
    echo "     Luego: Configuración > Dispositivo > Opciones de desarrollador > Depuración USB"
    echo "  3. La IP es correcta: $TV_IP"
    echo ""
    echo "También puedes habilitar 'Depuración de red' en Opciones de desarrollador"
    exit 1
fi

# Esperar un momento para que se establezca la conexión
sleep 2

# Verificar conexión
echo ""
echo "🔍 Verificando conexión..."
DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ No hay dispositivos conectados"
    exit 1
fi

echo "✅ Dispositivo conectado"
echo ""

# Paso 4: Instalar APK
echo "📦 Instalando APK en el TV..."
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Instalación exitosa!"
    echo ""
    echo "🎉 La app 'Tropiplus TV' está instalada en tu Android TV"
    echo ""
    echo "Puedes encontrarla en el launcher del TV"
    echo "O ejecuta: adb shell am start -n com.tropiplus.tv/.MainActivity"
else
    echo ""
    echo "❌ Error al instalar el APK"
    echo ""
    echo "Posibles soluciones:"
    echo "  - Desinstala la versión anterior: adb uninstall com.tropiplus.tv"
    echo "  - Verifica que el TV tenga espacio suficiente"
    echo "  - Habilita 'Instalar desde fuentes desconocidas' en el TV"
fi
