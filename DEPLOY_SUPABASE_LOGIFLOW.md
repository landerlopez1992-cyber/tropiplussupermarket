# 🚀 DESPLEGAR FUNCIÓN EN SUPABASE LOGIFLOW PRO

## ✅ CREDENCIALES ENCONTRADAS

- **URL del Proyecto:** `https://fbbvfzeyhhopdwzsooew.supabase.co`
- **Project Ref:** `fbbvfzeyhhopdwzsooew`
- **Dashboard:** https://supabase.com/dashboard/project/fbbvfzeyhhopdwzsooew

---

## 📋 PASOS PARA DESPLEGAR

### Paso 1: Conectar con el proyecto de Supabase

```bash
cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23

# Inicializar Supabase (si no está inicializado)
supabase init

# Conectar con el proyecto LogiFlow Pro
supabase link --project-ref fbbvfzeyhhopdwzsooew
```

**Nota:** Si te pide autenticación, ejecuta:
```bash
supabase login
```

### Paso 2: Configurar el secret de Square API

1. Ve a: https://supabase.com/dashboard/project/fbbvfzeyhhopdwzsooew/settings/functions
2. Haz clic en **"Secrets"** o **"Environment Variables"**
3. Agrega un nuevo secret:
   - **Name:** `SQUARE_ACCESS_TOKEN`
   - **Value:** `EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB`
4. Haz clic en **"Save"**

### Paso 3: Desplegar la función

```bash
cd /Users/cubcolexpress/Desktop/Proyectos/Tropiplus/supermarket23
supabase functions deploy square-proxy
```

### Paso 4: Verificar que funciona

Después del deploy, prueba la función:

```
https://fbbvfzeyhhopdwzsooew.supabase.co/functions/v1/square-proxy/v2/catalog/search
```

**Deberías ver:** Una respuesta JSON con datos de Square (o un error de Square, pero NO un 404)

---

## ✅ CONFIGURACIÓN COMPLETA

Una vez desplegado:

1. ✅ **La función estará disponible en:**
   ```
   https://fbbvfzeyhhopdwzsooew.supabase.co/functions/v1/square-proxy
   ```

2. ✅ **El código ya está configurado** para usar esta URL automáticamente

3. ✅ **La web cargará productos** desde Square API a través de Supabase

---

## 🎯 VERIFICAR EN LA WEB

1. Ve a: https://landerlopez1992-cyber.github.io/tropiplussupermarket/
2. Abre la consola (F12)
3. Busca mensajes como:
   - `📡 Intentando proxy: https://fbbvfzeyhhopdwzsooew.supabase.co/functions/v1/square-proxy`
   - `✅ Éxito con proxy: https://fbbvfzeyhhopdwzsooew.supabase.co/functions/v1/square-proxy`
4. Los productos deberían cargarse automáticamente

---

## 🆘 SI HAY PROBLEMAS

### Error: "Not authenticated"
```bash
supabase login
```

### Error: "Project not found"
Verifica que el project-ref sea correcto: `fbbvfzeyhhopdwzsooew`

### La función no responde
1. Verifica los logs en Supabase Dashboard → Edge Functions → square-proxy → Logs
2. Verifica que el secret `SQUARE_ACCESS_TOKEN` esté configurado

---

## ✅ VENTAJAS DE USAR EL PROYECTO EXISTENTE

- ✅ **No necesitas crear proyecto nuevo**
- ✅ **Todo en un solo lugar** (LogiFlow Pro)
- ✅ **Ya tienes acceso** al dashboard
- ✅ **Más fácil de gestionar**
