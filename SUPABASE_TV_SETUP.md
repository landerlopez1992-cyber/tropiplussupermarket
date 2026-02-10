# 🗄️ Configuración de Supabase para TVs

## ✅ ¿Qué hace esto?

Migra las configuraciones de TV desde `localStorage` y archivos JSON a **Supabase (base de datos)**. Esto permite:
- ✅ **Actualización automática**: Los cambios en admin se reflejan inmediatamente en todos los TVs
- ✅ **Sin git push manual**: No necesitas ejecutar comandos de git cada vez
- ✅ **Polling automático**: Los navegadores leen desde Supabase cada 5 segundos
- ✅ **Solo para este proyecto**: No afecta otros proyectos en Supabase

---

## 📋 PASO 1: Crear la tabla en Supabase

1. Ve a: https://supabase.com/dashboard/project/fbbvfzeyhhopdwzsooew
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"**
4. Copia y pega el contenido de `supabase/migrations/20260210_create_tv_configs.sql`
5. Haz clic en **"Run"** (o presiona `Cmd+Enter` / `Ctrl+Enter`)
6. Deberías ver: `Success. No rows returned`

---

## 📋 PASO 2: Obtener la Anon Key

1. En Supabase Dashboard, ve a **Settings** → **API**
2. Busca la sección **"Project API keys"**
3. Copia la **"anon public"** key (es la que empieza con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
4. Abre el archivo `js/supabase-config.js`
5. Reemplaza el placeholder en la línea que dice:
   ```javascript
   'apikey': SUPABASE_CONFIG.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
   ```
   Por tu anon key real:
   ```javascript
   'apikey': 'TU_ANON_KEY_AQUI',
   ```

---

## 📋 PASO 3: Migrar datos existentes (opcional)

Si ya tienes TVs configurados en el admin:

1. Abre el admin en el navegador
2. Ve a **Admin > TV**
3. Guarda cualquier TV (esto lo guardará automáticamente en Supabase)
4. Los TVs existentes se migrarán automáticamente

---

## ✅ Verificar que funciona

1. **En el admin:**
   - Ve a Admin > TV
   - Crea o edita un TV
   - Haz clic en "Guardar TV"
   - Deberías ver en la consola: `✅ [Admin] TVs guardados en Supabase`

2. **En el selector de TVs:**
   - Abre `tv-selector.html` en cualquier navegador
   - Deberías ver los TVs configurados
   - En la consola deberías ver: `✅ [TV Selector] TVs cargados desde Supabase`

3. **En la pantalla TV:**
   - Abre `tv.html?tv=ID_DEL_TV`
   - Debería cargar correctamente
   - En la consola deberías ver: `✅ [TV] Configuración cargada desde Supabase`

---

## 🔄 Polling automático

Los navegadores leen desde Supabase cada **5 segundos** automáticamente. No necesitas hacer nada más.

---

## 🆘 Si hay problemas

### Error: "getTvConfigsFromSupabase is not a function"
- Verifica que `js/supabase-config.js` esté cargado antes de `admin.js` o `tv-display.js`
- Verifica que el archivo existe en el servidor

### Error: "HTTP 401: Unauthorized"
- Verifica que la anon key esté correcta en `js/supabase-config.js`
- Verifica que las políticas RLS estén configuradas (deberían estar en el SQL de migración)

### Error: "relation tv_configs does not exist"
- Ejecuta el SQL de migración en Supabase (Paso 1)

### Los TVs no se actualizan
- Verifica la consola del navegador (F12)
- Verifica que Supabase esté accesible desde tu red
- Verifica que el polling esté activo (deberías ver logs cada 5 segundos)

---

## 📝 Notas

- **localStorage se mantiene como backup**: Si Supabase falla, se usa localStorage como fallback
- **JSON público se mantiene como fallback**: Si Supabase falla, se intenta el JSON público
- **No afecta otros proyectos**: La tabla `tv_configs` es independiente y no interfiere con otros proyectos en Supabase
