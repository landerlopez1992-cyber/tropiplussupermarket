#!/bin/bash

# Script para construir e instalar usando Android Studio directamente
# Este script abre Android Studio y luego instala el APK

echo "📱 Construyendo e instalando Tropiplus TV"
echo ""

TV_IP=${1:-"192.168.1.112:32779"}

echo "⚠️  El build desde línea de comandos tiene problemas con Java 21"
echo ""
echo "Por favor, construye el APK desde Android Studio:"
echo "1. Abre Android Studio"
echo "2. File > Open > Selecciona la carpeta 'android/'"
echo "3. Espera a que sincronice"
echo "4. Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo ""
echo "Cuando termine, presiona Enter para continuar con la instalación..."
read

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK no encontrado en: $APK_PATH"
    echo "   Por favor, construye el APK primero desde Android Studio"
    exit 1
fi

echo "✅ APK encontrado"
echo ""
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
    echo "Puedes abrirla con:"
    echo "adb shell am start -n com.tropiplus.tv/.MainActivity"
else
    echo ""
    echo "❌ Error al instalar"
fi
