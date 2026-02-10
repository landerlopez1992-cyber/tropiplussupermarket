# 🚀 DESPLIEGUE EN SUPABASE - GUÍA COMPLETA

## ✅ VENTAJAS DE SUPABASE

- ✅ **Más simple** que Vercel
- ✅ **CORS automático**
- ✅ **Sin problemas de routing**
- ✅ **Gratis** (plan generoso)
- ✅ **Deploy rápido**

---

## 📋 PASOS PARA DESPLEGAR

### Paso 1: Crear cuenta en Supabase

1. Ve a: https://supabase.com
2. Haz clic en **"Start your project"** o **"Sign up"**
3. Regístrate con GitHub (es gratis)
4. Haz clic en **"New Project"**

### Paso 2: Crear el proyecto

1. **Project Name:** `tropiplussupermarket` (o el que prefieras)
2. **Database Password:** Crea una contraseña segura (guárdala)
3. **Region:** Elige la más cercana (ej: `us-east-1`)
4. Haz clic en **"Create new project"**
5. Espera 1-2 minutos a que se cree el proyecto

### Paso 3: Configurar Edge Function

1. En el dashboard de Supabase, ve a **"Edge Functions"** (en el menú lateral)
2. Haz clic en **"Create a new function"**
3. **Function name:** `square-proxy`
4. Haz clic en **"Create function"**

### Paso 4: Instalar Supabase CLI

Abre la terminal y ejecuta:

```bash
# macOS
brew install supabase/tap/supabase

# O con npm
npm install -g supabase
```

### Paso 5: Inicializar Supabase en el proyecto

```bash
cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
supabase init
```

### Paso 6: Conectar con tu proyecto

1. En Supabase Dashboard, ve a **Settings** → **API**
2. Copia tu **Project URL** y **anon key**
3. En la terminal, ejecuta:

```bash
supabase link --project-ref tu-project-ref
```

(El `project-ref` está en la URL de tu proyecto: `https://supabase.com/dashboard/project/[PROJECT-REF]`)

### Paso 7: Configurar variable de entorno

1. En Supabase Dashboard, ve a **Settings** → **Edge Functions** → **Secrets**
2. Agrega un nuevo secret:
   - **Name:** `SQUARE_ACCESS_TOKEN`
   - **Value:** `EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB`

### Paso 8: Deploy la función

```bash
cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
supabase functions deploy square-proxy
```

### Paso 9: Obtener la URL

Después del deploy, Supabase te dará una URL como:
```
https://tu-proyecto.supabase.co/functions/v1/square-proxy
```

### Paso 10: Actualizar el código

Actualiza `js/square-config.js` para usar la URL de Supabase:

```javascript
const PROXY_BASE_URL = isProduction 
  ? 'https://tu-proyecto.supabase.co/functions/v1/square-proxy'  // Tu URL de Supabase
  : 'http://localhost:8080';
```

---

## ✅ VENTAJAS DE ESTE ENFOQUE

1. ✅ **Más simple** - Menos configuración
2. ✅ **CORS automático** - Ya configurado
3. ✅ **Routing directo** - Sin problemas
4. ✅ **Gratis** - Plan generoso
5. ✅ **Rápido** - Deploy en minutos

---

## 🎯 ¿QUIERES QUE LO IMPLEMENTE?

Si dices que sí, haré:
1. ✅ Crear la estructura completa de Supabase
2. ✅ Configurar el código del proxy
3. ✅ Actualizar `square-config.js` para usar Supabase
4. ✅ Guía paso a paso detallada

**Tiempo:** 5-10 minutos vs seguir con Vercel
