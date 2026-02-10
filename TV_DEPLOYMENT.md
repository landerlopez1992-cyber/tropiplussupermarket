# Tropiplus TV - Despliegue en Televisores

## 1) Configurar TVs en Admin

1. Abre `admin.html`.
2. Ve a `TV`.
3. Crea un TV (nombre, modo, categoría, tiempo de rotación, promo).
4. Guarda.
5. Pulsa `Abrir Pantalla TV` para probar.

URL directa por TV:

`tv.html?tv=ID_DEL_TV`

---

## 2) Android TV / TV Box (APK)

Ruta recomendada (rápida y estable):

1. Publica la web en HTTPS (dominio o hosting).
2. Usa PWABuilder o Bubblewrap para empaquetar `tv.html` como aplicación Android.
3. Configura la URL de inicio de la app:

`https://tu-dominio/tv.html?tv=ID_DEL_TV`

4. Genera APK y realiza instalación por USB o `adb install`.

---

## 3) Chrome en TV / Kiosko

1. Abre la URL `tv.html?tv=ID_DEL_TV`.
2. Activa pantalla completa.
3. Opcional: modo kiosko del navegador para inicio automático.

---

## 4) Roku / Otros dispositivos

Roku no instala APK de Android. Para Roku se usa:
- Canal web/HTML (si el modelo lo permite), o
- Casting/Screen mirroring desde Android/PC.

La misma URL `tv.html?tv=ID_DEL_TV` sirve como fuente de contenido.

---

## 5) Actualización en tiempo real

La pantalla TV:
- Lee configuración por `localStorage` (definida en Admin).
- Refresca productos y configuración automáticamente.
- Muestra reloj, rotación de productos y texto promocional.
