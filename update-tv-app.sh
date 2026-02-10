#!/bin/bash

# Script para actualizar los archivos de la app TV cuando hagas cambios
# Uso: ./update-tv-app.sh

echo "🔄 Actualizando archivos de la app TV..."

# Copiar archivos HTML necesarios
cp android-tv-app.html www/
cp tv-selector.html www/
cp tv.html www/

# Copiar archivos JavaScript necesarios
cp js/square-config.js www/js/
cp js/tv-display.js www/js/

# Crear index.html si no existe
if [ ! -f "www/index.html" ]; then
    cp www/android-tv-app.html www/index.html
fi

# Sincronizar con Capacitor
echo "📱 Sincronizando con Capacitor..."
npx cap sync

echo "✅ Actualización completa!"
echo ""
echo "Para construir el APK:"
echo "  cd android && ./gradlew assembleDebug"
echo "O abre el proyecto en Android Studio"
