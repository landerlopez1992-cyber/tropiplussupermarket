#!/bin/bash
# Script para actualizar automáticamente tvs-public.json
# Este script se ejecuta automáticamente cuando se guarda un TV en el admin

cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23

# Leer el contenido desde stdin o desde un archivo temporal
if [ -t 0 ]; then
    # Si no hay stdin, leer desde archivo temporal
    if [ -f /tmp/tvs-update.json ]; then
        cat /tmp/tvs-update.json > tvs-public.json
        rm /tmp/tvs-update.json
    else
        echo "Error: No se proporcionó contenido JSON"
        exit 1
    fi
else
    # Leer desde stdin
    cat > tvs-public.json
fi

# Hacer commit y push automáticamente
git add tvs-public.json
git commit -m "Auto-update TVs: $(date +%Y-%m-%d\ %H:%M:%S)" > /dev/null 2>&1
git push > /dev/null 2>&1

echo "✅ Archivo público actualizado automáticamente"
