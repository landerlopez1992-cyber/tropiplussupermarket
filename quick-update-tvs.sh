#!/bin/bash
# Script rápido para actualizar tvs-public.json
# Ejecuta esto cada vez que guardes un TV en el admin

cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23

# Los comandos están en la consola del navegador (F12) después de guardar
# O ejecuta esto directamente:

# 1. Obtener el contenido desde localStorage (simulado - en realidad vendría del admin)
# Por ahora, actualizamos desde el archivo que el admin genera

if [ -f .tvs-update.json ]; then
    cp .tvs-update.json tvs-public.json
    git add tvs-public.json
    git commit -m "Auto-update TVs: $(date +%Y-%m-%d\ %H:%M:%S)"
    git push
    rm .tvs-update.json
    echo "✅ Archivo público actualizado"
else
    echo "No hay cambios pendientes. Guarda un TV en el admin primero."
fi
