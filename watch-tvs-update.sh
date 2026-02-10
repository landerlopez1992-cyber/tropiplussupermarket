#!/bin/bash
# Watcher que actualiza automáticamente tvs-public.json cuando se guarda en admin
# Ejecuta este script en background: ./watch-tvs-update.sh &

cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23

while true; do
    # Verificar si hay cambios en localStorage del admin (simulado)
    # En realidad, esto debería ser un webhook o API, pero por ahora usamos polling
    sleep 5
    
    # Si hay un archivo de señal, actualizar
    if [ -f .tvs-needs-update ]; then
        echo "Actualizando tvs-public.json..."
        if [ -f .tvs-content.json ]; then
            cp .tvs-content.json tvs-public.json
            git add tvs-public.json
            git commit -m "Auto-update TVs: $(date +%Y-%m-%d\ %H:%M:%S)" > /dev/null 2>&1
            git push > /dev/null 2>&1
            rm .tvs-needs-update .tvs-content.json
            echo "✅ Actualizado"
        fi
    fi
done
