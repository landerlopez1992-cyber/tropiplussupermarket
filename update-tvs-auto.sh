#!/bin/bash
# Script para actualizar tvs-public.json automáticamente
# Se ejecuta automáticamente cuando se guarda un TV en el admin

cd "$(dirname "$0")"

# Leer el JSON desde un archivo temporal que el admin crea
TEMP_FILE="/tmp/tropiplus_tvs.json"

if [ -f "$TEMP_FILE" ]; then
    echo "📋 Actualizando tvs-public.json desde archivo temporal..."
    cp "$TEMP_FILE" "tvs-public.json"
    rm "$TEMP_FILE"
    
    git add tvs-public.json
    git commit -m "Auto-update TVs $(date +%Y-%m-%d\ %H:%M:%S)" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        git push
        echo "✅ TVs actualizados en GitHub"
    else
        echo "⚠️ No hay cambios o error en commit"
    fi
else
    echo "❌ Archivo temporal no encontrado"
    echo "💡 El admin debe crear /tmp/tropiplus_tvs.json primero"
fi
