-- Agregar columnas mixed_transition_seconds y screen_orientation a tv_configs
-- Ejecutar este script si la tabla ya existe y necesita las nuevas columnas

ALTER TABLE tv_configs 
ADD COLUMN IF NOT EXISTS mixed_transition_seconds INTEGER DEFAULT 12;

ALTER TABLE tv_configs 
ADD COLUMN IF NOT EXISTS screen_orientation TEXT DEFAULT 'landscape';
