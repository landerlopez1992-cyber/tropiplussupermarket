# 🚀 Desplegar Proxy en Vercel (Solución Rápida)

## ⚡ Opción Rápida: Desplegar solo el Proxy

### Paso 1: Crear cuenta en Vercel
1. Ve a: https://vercel.com
2. Regístrate con GitHub (es gratis)

### Paso 2: Desplegar el Proxy
1. Haz clic en **"New Project"**
2. Importa el repositorio: `landerlopez1992-cyber/tropiplussupermarket`
3. En **"Root Directory"**, deja vacío o pon: `supermarket23`
4. Vercel detectará automáticamente las funciones en `/api`
5. Haz clic en **"Deploy"**

### Paso 3: Obtener la URL del Proxy
Después del deploy, Vercel te dará una URL como:
```
https://tropiplussupermarket.vercel.app
```

### Paso 4: Actualizar el código
1. Abre `js/square-config.js`
2. Busca la línea que dice:
   ```javascript
   const PROXY_BASE_URL = isProduction 
     ? 'https://tropiplus-proxy.vercel.app'  // ⚠️ ACTUALIZA ESTA URL
   ```
3. Reemplaza con tu URL de Vercel:
   ```javascript
   const PROXY_BASE_URL = isProduction 
     ? 'https://tropiplussupermarket.vercel.app'  // Tu URL de Vercel
   ```

### Paso 5: Subir cambios a GitHub
```bash
git add js/square-config.js
git commit -m "Actualizar URL del proxy para producción"
git push origin main
```

## ✅ Resultado

Una vez desplegado:
- ✅ GitHub Pages: Muestra la web (https://landerlopez1992-cyber.github.io/tropiplussupermarket/)
- ✅ Vercel: Maneja el proxy de Square API
- ✅ Todo funciona en producción

## 🔧 Variables de Entorno en Vercel

Si quieres usar variables de entorno (más seguro):

1. En Vercel, ve a **Settings → Environment Variables**
2. Agrega: `SQUARE_ACCESS_TOKEN` = `EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB`
3. Vercel usará esta variable automáticamente

---

## 📝 Nota sobre GitHub Pages

GitHub Pages seguirá funcionando para servir los archivos HTML/CSS/JS, pero las llamadas a Square API irán a través de Vercel.

**URLs finales:**
- **Web:** https://landerlopez1992-cyber.github.io/tropiplussupermarket/
- **TV:** https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv.html?tv=ID
- **Proxy:** https://tu-proyecto.vercel.app/api/square/*
