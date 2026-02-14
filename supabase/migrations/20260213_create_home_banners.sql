-- Crear tabla para banners del home
CREATE TABLE IF NOT EXISTS public.home_banners (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 1,
    redirect_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_home_banners_active ON public.home_banners (active);
CREATE INDEX IF NOT EXISTS idx_home_banners_display_order ON public.home_banners (display_order);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: Permitir lectura pública y escritura autenticada
DROP POLICY IF EXISTS "Public can view active banners" ON public.home_banners;
CREATE POLICY "Public can view active banners"
ON public.home_banners FOR SELECT
TO public
USING (active = true);

DROP POLICY IF EXISTS "Authenticated users can manage banners" ON public.home_banners;
CREATE POLICY "Authenticated users can manage banners"
ON public.home_banners FOR ALL
TO authenticated
USING (TRUE) WITH CHECK (TRUE);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_home_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_home_banners_updated_at ON public.home_banners;
CREATE TRIGGER set_home_banners_updated_at
BEFORE UPDATE ON public.home_banners
FOR EACH ROW
EXECUTE FUNCTION public.set_home_banners_updated_at();
