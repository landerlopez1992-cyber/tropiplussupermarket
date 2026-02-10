#!/bin/bash

# Script para construir el APK de Tropiplus TV
# Uso: ./build-apk.sh

echo "📱 Construyendo APK para Tropiplus TV..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    echo "   Asegúrate de estar en el directorio del proyecto"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    echo "   Instala Node.js desde https://nodejs.org/"
    exit 1
fi

# Verificar que las dependencias estén instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Sincronizar Capacitor
echo "🔄 Sincronizando Capacitor..."
npx cap sync

# Verificar que existe la carpeta android
if [ ! -d "android" ]; then
    echo "❌ Error: No se encontró la carpeta android/"
    echo "   Ejecuta: npx cap sync"
    exit 1
fi

# Construir APK
echo "🔨 Construyendo APK..."
cd android

# Verificar que Gradle esté disponible
if ! command -v ./gradlew &> /dev/null && [ ! -f "gradlew" ]; then
    echo "⚠️  Gradle wrapper no encontrado, intentando construir de otra manera..."
    echo "   Abre el proyecto en Android Studio y construye desde ahí"
    exit 1
fi

# Dar permisos de ejecución a gradlew
chmod +x gradlew 2>/dev/null

# Construir
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ APK construido exitosamente!"
    echo ""
    echo "📦 Ubicación del APK:"
    echo "   android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "📲 Para instalar en tu Android TV:"
    echo "   adb install android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
else
    echo ""
    echo "❌ Error al construir el APK"
    echo "   Abre el proyecto en Android Studio para más detalles"
    exit 1
fi
