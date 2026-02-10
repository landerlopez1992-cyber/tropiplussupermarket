# 📺 Cómo Actualizar los TVs en el Selector

## Problema
El selector lee desde `tvs-public.json` en GitHub, pero ese archivo solo tiene el TV de prueba. Los TVs que guardas en el admin están en localStorage, no en el archivo.

## Solución Rápida

### Opción 1: Usar el Botón (Más Fácil)
1. Guarda o edita un TV en el admin
2. Aparece un botón verde "Actualizar archivo JSON" (esquina inferior derecha)
3. Haz clic en el botón
4. Los comandos se copian automáticamente al portapapeles
5. Pega en terminal y presiona Enter
6. ¡Listo! El selector se actualizará en 1 minuto

### Opción 2: Manual (Si el botón no aparece)
1. Abre el admin: https://landerlopez1992-cyber.github.io/tropiplussupermarket/admin.html
2. Abre la consola del navegador (F12 o Cmd+Option+I)
3. Ejecuta:
   ```javascript
   const tvs = JSON.parse(localStorage.getItem('tropiplus_tv_configs'));
   console.log(JSON.stringify(tvs, null, 2));
   ```
4. Copia el JSON completo que aparece
5. Ejecuta en terminal:
   ```bash
   cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
   cat > tvs-public.json
   [PEGA EL JSON AQUÍ Y PRESIONA Ctrl+D]
   git add tvs-public.json
   git commit -m "Update TVs from admin"
   git push
   ```
6. Espera 1 minuto y recarga el selector

## Nota
Cada vez que guardes un TV en el admin, debes actualizar el archivo `tvs-public.json` para que aparezca en el selector.
