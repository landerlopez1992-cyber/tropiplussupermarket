#!/bin/bash

# Script para instalar la app Flutter en Android TV
# Uso: ./instalar-tv-flutter.sh [IP_DEL_TV]

TV_IP=${1:-"192.168.1.112:32779"}
APK_PATH="tv_app_flutter/build/app/outputs/flutter-apk/app-release.apk"

echo "📱 Instalando Tropiplus TV (Flutter) en Android TV"
echo ""

if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK no encontrado. Construyendo..."
    cd tv_app_flutter
    flutter build apk --release
    cd ..
fi

if [ ! -f "$APK_PATH" ]; then
    echo "❌ Error: No se pudo construir el APK"
    exit 1
fi

echo "🔌 Conectando al TV en $TV_IP..."
adb connect $TV_IP

sleep 2

echo "📦 Instalando APK..."
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Instalación exitosa!"
    echo ""
    echo "🎉 La app está instalada en tu Android TV"
    echo ""
    echo "Ubicación del APK: $APK_PATH"
else
    echo ""
    echo "❌ Error al instalar"
    echo ""
    echo "Asegúrate de:"
    echo "  1. El TV tiene depuración habilitada"
    echo "  2. La IP es correcta: $TV_IP"
    echo "  3. El TV y tu PC están en la misma red"
fi
