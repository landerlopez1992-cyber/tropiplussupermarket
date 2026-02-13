-- Crear tabla de remesas
CREATE TABLE IF NOT EXISTS remesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL, -- ID de la orden en Square
    confirmation_code TEXT UNIQUE NOT NULL, -- Código de confirmación único (ej: REM-123456)
    
    -- Datos del remitente (usuario logueado)
    sender_customer_id TEXT, -- ID del customer en Square
    sender_name TEXT NOT NULL,
    sender_email TEXT,
    
    -- Datos del destinatario
    recipient_name TEXT NOT NULL,
    recipient_id TEXT, -- Carnet de Identidad
    
    -- Datos de la remesa
    amount_usd DECIMAL(10, 2) NOT NULL, -- Cantidad en USD
    amount_cup DECIMAL(10, 2), -- Cantidad en CUP (si aplica)
    currency TEXT NOT NULL DEFAULT 'USD', -- USD o CUP
    fee DECIMAL(10, 2) NOT NULL, -- Comisión (10%)
    total_paid DECIMAL(10, 2) NOT NULL, -- Total pagado (amount + fee)
    exchange_rate DECIMAL(10, 2), -- Tasa de cambio usada
    
    -- Estado
    status TEXT NOT NULL DEFAULT 'pending', -- pending, delivered, cancelled
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    delivered_by TEXT, -- Usuario que entregó la remesa
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_remesas_confirmation_code ON remesas(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_remesas_order_id ON remesas(order_id);
CREATE INDEX IF NOT EXISTS idx_remesas_sender_customer_id ON remesas(sender_customer_id);
CREATE INDEX IF NOT EXISTS idx_remesas_status ON remesas(status);
CREATE INDEX IF NOT EXISTS idx_remesas_created_at ON remesas(created_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_remesas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_remesas_updated_at
    BEFORE UPDATE ON remesas
    FOR EACH ROW
    EXECUTE FUNCTION update_remesas_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE remesas ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden leer sus propias remesas
CREATE POLICY "Users can read their own remesas"
    ON remesas FOR SELECT
    USING (
        sender_customer_id = (SELECT current_setting('request.jwt.claims', true)::json->>'customer_id')
        OR sender_customer_id IS NULL -- Permitir lectura pública temporalmente
    );

-- Política: Permitir lectura pública para admin (temporalmente, luego se restringe)
CREATE POLICY "Public read access for admin"
    ON remesas FOR SELECT
    USING (true);

-- Política: Permitir inserción pública (cuando se crea la remesa)
CREATE POLICY "Public insert access"
    ON remesas FOR INSERT
    WITH CHECK (true);

-- Política: Permitir actualización pública (para entregar/cancelar)
CREATE POLICY "Public update access"
    ON remesas FOR UPDATE
    USING (true)
    WITH CHECK (true);
