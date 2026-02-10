# 🔐 CONFIGURAR SECRET EN SUPABASE

## ❌ PROBLEMA ACTUAL

El proxy de Supabase está devolviendo **401 Unauthorized** porque el `SQUARE_ACCESS_TOKEN` no está configurado como secret en Supabase.

## ✅ SOLUCIÓN: Configurar el Secret

### Paso 1: Ir a Supabase Dashboard

1. Ve a: https://supabase.com/dashboard/project/fbbvfzeyhhopdwzsooew
2. En el menú lateral izquierdo, busca **"Edge Functions"**
3. Haz clic en **"Secrets"** (debajo de "Functions")

### Paso 2: Agregar el Secret

1. Haz clic en **"+ New secret"** o **"Add secret"**
2. En el campo **"Name"**, escribe exactamente:
   ```
   SQUARE_ACCESS_TOKEN
   ```
   (Debe ser exactamente así, en mayúsculas)

3. En el campo **"Value"**, pega tu token de Square:
   ```
   EAAAl2nJjLDUfcBLy2EIXc7ipUq3Pwkr3PcSji6oC1QmgtUK5E8UyeICc0mbowZB
   ```

4. Haz clic en **"Save"** o **"Add secret"**

### Paso 3: Verificar

1. Deberías ver `SQUARE_ACCESS_TOKEN` en la lista de secrets
2. **IMPORTANTE:** Después de agregar el secret, **redespliega la función**:
   - Ve a **"Edge Functions" > "Functions" > "square-proxy"**
   - Haz clic en **"Deploy updates"** o **"Redeploy"**

### Paso 4: Probar

1. Abre la consola del navegador en tu web
2. Deberías ver: `✅ Token configurado: EAAAl2nJjL...`
3. Los productos deberían cargarse correctamente

---

## 🆘 SI SIGUE SIN FUNCIONAR

1. **Verifica que el secret esté exactamente como `SQUARE_ACCESS_TOKEN`** (sin espacios, mayúsculas)
2. **Verifica que el token sea correcto** (copia y pega de nuevo)
3. **Redespliega la función** después de agregar el secret
4. **Espera 1-2 minutos** para que los cambios se propaguen

---

## 📝 NOTA

El código tiene un fallback hardcodeado del token, pero **Supabase siempre prioriza los secrets sobre el código**. Si el secret está mal configurado o no existe, usará el fallback, pero puede haber problemas de sincronización.

**La mejor práctica es siempre configurar el secret correctamente en Supabase.**
