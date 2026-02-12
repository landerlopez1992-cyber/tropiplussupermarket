#!/bin/bash

# Script para compilar e instalar la app POS en el terminal

echo "🔨 Compilando app POS..."
cd pos_app_flutter

# Compilar APK
flutter build apk --release

if [ $? -eq 0 ]; then
    echo "✅ APK compilado exitosamente"
    echo "📦 Ubicación: pos_app_flutter/build/app/outputs/flutter-apk/app-release.apk"
    echo ""
    echo "Para instalar en el terminal POS:"
    echo "1. Conecta el terminal por USB o WiFi"
    echo "2. Ejecuta: adb install pos_app_flutter/build/app/outputs/flutter-apk/app-release.apk"
    echo ""
    echo "O transfiere el APK al terminal e instálalo manualmente"
else
    echo "❌ Error al compilar"
    exit 1
fi
