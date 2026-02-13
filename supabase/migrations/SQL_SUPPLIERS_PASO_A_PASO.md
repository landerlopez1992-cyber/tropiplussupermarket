# SQL para Crear Tabla de Proveedores en Supabase

Ejecuta estos comandos SQL **uno por uno** en el SQL Editor de Supabase Dashboard:

## Paso 1: Crear la tabla

```sql
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    address TEXT,
    url TEXT,
    notes TEXT
);
```

## Paso 2: Crear índices

```sql
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers (name);
```

```sql
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON public.suppliers (created_at DESC);
```

## Paso 3: Habilitar RLS (Row Level Security)

```sql
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
```

## Paso 4: Crear políticas de acceso público

```sql
DROP POLICY IF EXISTS "Public read access for suppliers" ON public.suppliers;
CREATE POLICY "Public read access for suppliers"
ON public.suppliers FOR SELECT
TO public
USING (true);
```

```sql
DROP POLICY IF EXISTS "Public insert access for suppliers" ON public.suppliers;
CREATE POLICY "Public insert access for suppliers"
ON public.suppliers FOR INSERT
TO public
WITH CHECK (true);
```

```sql
DROP POLICY IF EXISTS "Public update access for suppliers" ON public.suppliers;
CREATE POLICY "Public update access for suppliers"
ON public.suppliers FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
```

```sql
DROP POLICY IF EXISTS "Public delete access for suppliers" ON public.suppliers;
CREATE POLICY "Public delete access for suppliers"
ON public.suppliers FOR DELETE
TO public
USING (true);
```

## Paso 5: Crear función para actualizar updated_at automáticamente

```sql
CREATE OR REPLACE FUNCTION public.set_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Paso 6: Crear trigger

```sql
DROP TRIGGER IF EXISTS set_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER set_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.set_suppliers_updated_at();
```

## ✅ Listo

Después de ejecutar todos estos comandos, la tabla `suppliers` estará lista para usar. Los proveedores se guardarán automáticamente en Supabase en lugar de solo en localStorage.
