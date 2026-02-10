# ⚡ CONFIGURAR SUPABASE RÁPIDO (2 MINUTOS)

## 🚨 PROBLEMA ACTUAL
La web TV no muestra los cambios del admin porque:
1. ❌ La tabla `tv_configs` no existe en Supabase
2. ❌ La anon key no está configurada

---

## ✅ SOLUCIÓN RÁPIDA (2 pasos)

### PASO 1: Ejecutar el SQL (1 minuto)

1. Ve a: https://supabase.com/dashboard/project/fbbvfzeyhhopdwzsooew/sql/new
2. Copia TODO este SQL:

```sql
-- Tabla para configuraciones de TV (solo para este proyecto)
CREATE TABLE IF NOT EXISTS tv_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'mixed',
    category_id TEXT DEFAULT '',
    category_name TEXT DEFAULT 'Todas',
    product_count INTEGER DEFAULT 8,
    slide_seconds INTEGER DEFAULT 10,
    show_price BOOLEAN DEFAULT true,
    show_offer BOOLEAN DEFAULT true,
    promo_text TEXT DEFAULT '',
    active BOOLEAN DEFAULT true,
    ticker_enabled BOOLEAN DEFAULT true,
    ticker_speed TEXT DEFAULT 'normal',
    ticker_font_size TEXT DEFAULT '28px',
    ticker_text_color TEXT DEFAULT '#ffec67',
    ticker_bg_color TEXT DEFAULT '#000000',
    qr_id TEXT DEFAULT NULL,
    qr_url TEXT DEFAULT NULL,
    qr_size INTEGER DEFAULT 400,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tv_configs_active ON tv_configs(active) WHERE active = true;

CREATE OR REPLACE FUNCTION update_tv_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tv_configs_updated_at
    BEFORE UPDATE ON tv_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_tv_configs_updated_at();

ALTER TABLE tv_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to tv_configs"
    ON tv_configs
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public write access to tv_configs"
    ON tv_configs
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

3. Haz clic en **"Run"** (o `Cmd+Enter`)
4. Deberías ver: `Success. No rows returned`

---

### PASO 2: Configurar la Anon Key (1 minuto)

1. Ve a: https://supabase.com/dashboard/project/fbbvfzeyhhopdwzsooew/settings/api
2. Busca la sección **"Project API keys"**
3. Copia la **"anon public"** key (la que empieza con `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
4. Abre la consola del navegador en el admin (F12)
5. Ejecuta este comando (reemplaza `TU_ANON_KEY` con la key que copiaste):

```javascript
localStorage.setItem('supabase_anon_key', 'TU_ANON_KEY_AQUI');
console.log('✅ Anon key configurada');
```

6. Recarga la página del admin

---

## ✅ VERIFICAR QUE FUNCIONA

1. **En el admin:**
   - Ve a Admin > TV
   - Edita un TV (cambia el modo, nombre, etc.)
   - Haz clic en "Guardar TV"
   - Abre la consola (F12)
   - Deberías ver: `✅ [Admin] TVs guardados en Supabase`

2. **En la web TV:**
   - Abre `tv-selector.html` en otro navegador
   - Espera 5 segundos
   - Deberías ver los cambios automáticamente
   - En la consola deberías ver: `✅ [TV Selector] TVs cargados desde Supabase`

---

## 🆘 SI SIGUE SIN FUNCIONAR

### Error: "TABLA_NO_EXISTE"
- Ejecuta el SQL del Paso 1 de nuevo

### Error: "AUTH_REQUIRED"
- Configura la anon key del Paso 2 de nuevo

### Error: "HTTP 404"
- La tabla no existe, ejecuta el SQL

### Error: "HTTP 401"
- La anon key está mal, cópiala de nuevo del dashboard

---

## 📝 NOTA

Una vez configurado, **no necesitas hacer nada más**. Los cambios en admin se reflejan automáticamente en todos los TVs cada 5 segundos.
