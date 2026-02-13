# SQL para Crear Tabla de Remesas - Paso a Paso

Ejecuta estos comandos SQL **uno por uno** en el SQL Editor de Supabase Dashboard.

## Paso 1: Crear la tabla de remesas

```sql
CREATE TABLE IF NOT EXISTS remesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    confirmation_code TEXT UNIQUE NOT NULL,
    sender_customer_id TEXT,
    sender_name TEXT NOT NULL,
    sender_email TEXT,
    recipient_name TEXT NOT NULL,
    recipient_id TEXT,
    amount_usd DECIMAL(10, 2) NOT NULL,
    amount_cup DECIMAL(10, 2),
    currency TEXT NOT NULL DEFAULT 'USD',
    fee DECIMAL(10, 2) NOT NULL,
    total_paid DECIMAL(10, 2) NOT NULL,
    exchange_rate DECIMAL(10, 2),
    status TEXT NOT NULL DEFAULT 'pending',
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    delivered_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Paso 2: Crear índices para búsquedas rápidas

```sql
CREATE INDEX IF NOT EXISTS idx_remesas_confirmation_code ON remesas(confirmation_code);
```

```sql
CREATE INDEX IF NOT EXISTS idx_remesas_order_id ON remesas(order_id);
```

```sql
CREATE INDEX IF NOT EXISTS idx_remesas_sender_customer_id ON remesas(sender_customer_id);
```

```sql
CREATE INDEX IF NOT EXISTS idx_remesas_status ON remesas(status);
```

```sql
CREATE INDEX IF NOT EXISTS idx_remesas_created_at ON remesas(created_at DESC);
```

## Paso 3: Crear función para actualizar updated_at automáticamente

```sql
CREATE OR REPLACE FUNCTION update_remesas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Paso 4: Crear trigger para actualizar updated_at

```sql
CREATE TRIGGER trigger_update_remesas_updated_at
    BEFORE UPDATE ON remesas
    FOR EACH ROW
    EXECUTE FUNCTION update_remesas_updated_at();
```

## Paso 5: Habilitar RLS (Row Level Security)

```sql
ALTER TABLE remesas ENABLE ROW LEVEL SECURITY;
```

## Paso 6: Crear políticas de seguridad (lectura pública para admin)

```sql
CREATE POLICY "Public read access for admin"
    ON remesas FOR SELECT
    USING (true);
```

## Paso 7: Crear política de inserción (pública)

```sql
CREATE POLICY "Public insert access"
    ON remesas FOR INSERT
    WITH CHECK (true);
```

## Paso 8: Crear política de actualización (pública)

```sql
CREATE POLICY "Public update access"
    ON remesas FOR UPDATE
    USING (true)
    WITH CHECK (true);
```

## ✅ Verificación

Después de ejecutar todos los comandos, verifica que la tabla se creó correctamente:

```sql
SELECT * FROM remesas LIMIT 1;
```

Si no hay errores, la tabla está lista para usar.
