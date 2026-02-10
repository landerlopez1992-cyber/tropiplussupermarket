# Actualización Automática de TVs

Para que los cambios en el admin se reflejen automáticamente en los navegadores:

## Opción 1: Ejecutar manualmente (rápido)
Cada vez que guardes un TV en el admin, ejecuta en terminal:
```bash
cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
# Los comandos están en la consola del navegador (F12)
```

## Opción 2: Automático con script
Ejecuta una vez:
```bash
cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
./watch-tvs-update.sh &
```

Esto monitoreará cambios y actualizará automáticamente.
