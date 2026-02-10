#!/bin/bash
# Script para actualizar tvs-public.json con los TVs del admin
# Ejecutar después de guardar un TV en el admin

cd "$(dirname "$0")"

echo "📺 Actualizando tvs-public.json..."
echo ""
echo "Por favor, ejecuta esto en la consola del navegador (F12) cuando estés en admin.html:"
echo ""
echo "const tvs = JSON.parse(localStorage.getItem('tropiplus_tv_configs') || '[]');"
echo "console.log(JSON.stringify(tvs, null, 2));"
echo ""
echo "Luego copia el JSON que aparece y ejecuta:"
echo ""
echo "cat > tvs-public.json << 'EOF'"
echo "[PEGA EL JSON AQUÍ]"
echo "EOF"
echo "git add tvs-public.json && git commit -m 'Update TVs' && git push"
echo ""
