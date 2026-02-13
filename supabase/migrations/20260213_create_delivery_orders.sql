-- Crear tabla para órdenes de delivery
CREATE TABLE IF NOT EXISTS delivery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Información de la orden
    order_id TEXT NOT NULL UNIQUE,
    customer_id TEXT,
    
    -- Información de entrega
    delivery_method TEXT NOT NULL DEFAULT 'delivery',
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT,
    recipient_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Estado de la orden
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
    
    -- Notas adicionales
    notes TEXT,
    
    -- Índices
    CONSTRAINT delivery_orders_order_id_key UNIQUE (order_id)
);

-- Crear índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created_at ON delivery_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer_id ON delivery_orders(customer_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_delivery_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_orders_updated_at
    BEFORE UPDATE ON delivery_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_orders_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública (para admin)
CREATE POLICY "Allow public read access for delivery orders"
    ON delivery_orders
    FOR SELECT
    USING (true);

-- Política para inserción pública (desde web)
CREATE POLICY "Allow public insert for delivery orders"
    ON delivery_orders
    FOR INSERT
    WITH CHECK (true);

-- Política para actualización pública (desde admin)
CREATE POLICY "Allow public update for delivery orders"
    ON delivery_orders
    FOR UPDATE
    USING (true);
