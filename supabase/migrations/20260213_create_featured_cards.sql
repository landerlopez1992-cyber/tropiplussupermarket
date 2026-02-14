-- Crear tabla para tarjetas destacadas del home
CREATE TABLE IF NOT EXISTS public.featured_cards (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 1,
    redirect_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_featured_cards_active ON public.featured_cards (active);
CREATE INDEX IF NOT EXISTS idx_featured_cards_display_order ON public.featured_cards (display_order);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.featured_cards ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: Permitir lectura pública y escritura autenticada
DROP POLICY IF EXISTS "Public can view active featured cards" ON public.featured_cards;
CREATE POLICY "Public can view active featured cards"
ON public.featured_cards FOR SELECT
TO public
USING (active = true);

DROP POLICY IF EXISTS "Authenticated users can manage featured cards" ON public.featured_cards;
CREATE POLICY "Authenticated users can manage featured cards"
ON public.featured_cards FOR ALL
TO authenticated
USING (TRUE) WITH CHECK (TRUE);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_featured_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_featured_cards_updated_at ON public.featured_cards;
CREATE TRIGGER set_featured_cards_updated_at
BEFORE UPDATE ON public.featured_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_featured_cards_updated_at();
