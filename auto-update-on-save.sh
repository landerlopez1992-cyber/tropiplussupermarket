#!/bin/bash
# Este script actualiza automáticamente tvs-public.json cuando se guarda en admin
# Ejecuta: ./auto-update-on-save.sh

cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23

# Leer contenido desde localStorage del navegador (simulado)
# En realidad, esto se ejecutaría cuando el admin guarda

# Por ahora, actualizamos directamente desde el localStorage guardado
# El admin guarda el contenido en localStorage con la clave 'tvs_public_content'

echo "Esperando cambios en admin..."
echo "Cuando guardes un TV en el admin, ejecuta este script para actualizar automáticamente"

# Si hay contenido en localStorage (simulado), actualizar
if [ -f .tvs-content.json ]; then
    cp .tvs-content.json tvs-public.json
    git add tvs-public.json
    git commit -m "Auto-update TVs: $(date +%Y-%m-%d\ %H:%M:%S)" > /dev/null 2>&1
    git push > /dev/null 2>&1
    rm .tvs-content.json
    echo "✅ Archivo público actualizado automáticamente"
else
    echo "No hay cambios pendientes"
fi
