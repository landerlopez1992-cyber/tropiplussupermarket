-- Crear tabla de proveedores globales
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    address TEXT,
    url TEXT,
    notes TEXT
);

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers (name);

-- Índice para ordenar por fecha de creación
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON public.suppliers (created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Política: Permitir lectura pública (para que el admin pueda leer)
DROP POLICY IF EXISTS "Public read access for suppliers" ON public.suppliers;
CREATE POLICY "Public read access for suppliers"
ON public.suppliers FOR SELECT
TO public
USING (true);

-- Política: Permitir inserción pública (para que el admin pueda crear)
DROP POLICY IF EXISTS "Public insert access for suppliers" ON public.suppliers;
CREATE POLICY "Public insert access for suppliers"
ON public.suppliers FOR INSERT
TO public
WITH CHECK (true);

-- Política: Permitir actualización pública (para que el admin pueda editar)
DROP POLICY IF EXISTS "Public update access for suppliers" ON public.suppliers;
CREATE POLICY "Public update access for suppliers"
ON public.suppliers FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Política: Permitir eliminación pública (para que el admin pueda eliminar)
DROP POLICY IF EXISTS "Public delete access for suppliers" ON public.suppliers;
CREATE POLICY "Public delete access for suppliers"
ON public.suppliers FOR DELETE
TO public
USING (true);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER set_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.set_suppliers_updated_at();
