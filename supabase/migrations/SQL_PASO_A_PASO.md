# SQL para ejecutar en Supabase - Paso a Paso

Ejecuta estos SQLs **uno por uno** en el orden indicado en el SQL Editor de Supabase.

## PASO 1: Agregar columnas (si la tabla ya existe)

```sql
ALTER TABLE tv_configs 
ADD COLUMN IF NOT EXISTS mixed_transition_seconds INTEGER DEFAULT 12;
```

**Ejecuta este primero y espera a que diga "Success"**

---

## PASO 2: Agregar columna de orientación

```sql
ALTER TABLE tv_configs 
ADD COLUMN IF NOT EXISTS screen_orientation TEXT DEFAULT 'landscape';
```

**Ejecuta este segundo y espera a que diga "Success"**

---

## PASO 3: Verificar que las columnas existen (opcional)

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'tv_configs' 
AND column_name IN ('mixed_transition_seconds', 'screen_orientation');
```

**Este es solo para verificar, deberías ver 2 filas**

---

## NOTA IMPORTANTE:

Si ves un error sobre el trigger `trigger_update_tv_configs_updated_at` ya existente, **ignóralo**. Ese error es normal si la tabla ya existe y solo significa que el trigger ya está creado.
