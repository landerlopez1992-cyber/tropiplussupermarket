# 🚀 Configuración de GitHub Pages

## ✅ Paso 1: Activar GitHub Pages

1. Ve a tu repositorio en GitHub: `https://github.com/landerlopez1992-cyber/tropiplussupermarket`
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral izquierdo, busca y haz clic en **Pages**
4. En la sección **"Source"** (Origen):
   - Selecciona **"Deploy from a branch"**
   - En **"Branch"**, selecciona **`main`**
   - En **"Folder"**, selecciona **`/ (root)`**
5. Haz clic en **Save** (Guardar)
6. Espera 1-2 minutos para que GitHub Pages se active

## 🌐 URL de tu sitio

Una vez activado, tu sitio estará disponible en:

```
https://landerlopez1992-cyber.github.io/tropiplussupermarket/
```

## 📺 URLs para cada TV

Después de crear un TV en el admin, la URL completa será:

```
https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv.html?tv=ID_DEL_TV
```

**Ejemplo:**
Si creas un TV llamado "TV Entrada" con ID `tv_123456`, la URL será:
```
https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv.html?tv=tv_123456
```

## 📱 Cómo usar en cada TV

### Opción 1: Desde el Admin (Recomendado)
1. Ve a **Admin → TV**
2. En la lista de "TVs Registrados", verás cada TV con su **URL completa**
3. Haz clic en el botón **"Copiar URL"** para copiarla al portapapeles
4. Abre esa URL en el navegador del TV/Box

### Opción 2: Manualmente
1. Crea el TV en el admin
2. Anota el ID del TV (aparece en la URL cuando haces clic en "Abrir Pantalla TV")
3. Abre en el TV: `https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv.html?tv=ID_DEL_TV`

## ⚠️ Nota Importante sobre el Proxy

**El proxy local (`server-proxy.js`) NO funcionará en GitHub Pages** porque GitHub Pages solo sirve archivos estáticos.

### Solución: Usar un servicio de proxy externo

Tienes dos opciones:

#### Opción A: Usar un servicio de proxy público (Recomendado para desarrollo)
- Usa servicios como `https://cors-anywhere.herokuapp.com/` o similar
- Modifica `js/square-config.js` para usar el proxy externo

#### Opción B: Desplegar el proxy en un servicio separado (Recomendado para producción)
- Despliega `server-proxy.js` en:
  - **Heroku** (gratis)
  - **Vercel** (gratis)
  - **Railway** (gratis)
  - **Render** (gratis)
- Actualiza `js/square-config.js` para apuntar a tu proxy desplegado

### Configuración del Proxy en Vercel (Más fácil)

1. Crea un archivo `vercel.json` en la raíz del proyecto:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server-proxy.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/square/(.*)",
      "dest": "/server-proxy.js"
    }
  ]
}
```

2. Sube el proyecto a Vercel
3. Obtendrás una URL como: `https://tu-proyecto.vercel.app`
4. Actualiza `js/square-config.js` para usar esa URL

## 🔧 Configuración Rápida del Proxy

Si necesitas ayuda para configurar el proxy, puedo ayudarte a:
1. Crear el archivo de configuración para Vercel/Heroku
2. Modificar `square-config.js` para usar el proxy desplegado
3. Hacer el deploy del proxy

---

## 📋 Checklist de Despliegue

- [ ] Código subido a GitHub ✅ (Ya hecho)
- [ ] GitHub Pages activado
- [ ] Proxy configurado y desplegado (si es necesario)
- [ ] URLs de TVs probadas en navegador
- [ ] TVs físicos configurados con las URLs

---

¿Necesitas ayuda con el proxy? Avísame y te ayudo a configurarlo.
