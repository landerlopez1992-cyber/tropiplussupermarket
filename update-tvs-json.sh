#!/bin/bash
# Script para actualizar tvs-public.json automáticamente desde el admin

cd "$(dirname "$0")"

# Leer el contenido del JSON desde localStorage (se copia manualmente desde la consola del navegador)
# O mejor: leer directamente desde el archivo si existe

if [ -f "tvs-public.json" ]; then
    echo "✅ Archivo tvs-public.json existe"
    git add tvs-public.json
    git commit -m "Actualizar TVs desde admin" 2>/dev/null || echo "⚠️ No hay cambios en tvs-public.json"
    git push
    echo "✅ TVs actualizados en GitHub"
else
    echo "❌ Archivo tvs-public.json no existe"
    echo "💡 Crea el archivo primero desde el admin"
fi
