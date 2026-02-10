-- Tabla para configuraciones de TV (solo para este proyecto)
-- Esta tabla es independiente y no afecta otros proyectos en Supabase

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

-- Índice para búsquedas rápidas de TVs activos
CREATE INDEX IF NOT EXISTS idx_tv_configs_active ON tv_configs(active) WHERE active = true;

-- Trigger para actualizar updated_at automáticamente
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

-- Política RLS: Permitir lectura pública (sin autenticación)
ALTER TABLE tv_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to tv_configs"
    ON tv_configs
    FOR SELECT
    USING (true);

-- Política RLS: Solo admins pueden escribir (requiere autenticación)
-- Por ahora, permitimos escritura pública desde el admin (se puede restringir después)
CREATE POLICY "Allow public write access to tv_configs"
    ON tv_configs
    FOR ALL
    USING (true)
    WITH CHECK (true);
