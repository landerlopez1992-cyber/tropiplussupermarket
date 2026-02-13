CREATE TABLE IF NOT EXISTS public.product_suppliers (
    mapping_key TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    variation_id TEXT,
    name TEXT,
    address TEXT,
    url TEXT,
    purchase_url TEXT,
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id ON public.product_suppliers (product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_variation_id ON public.product_suppliers (variation_id);

ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view product suppliers." ON public.product_suppliers;
CREATE POLICY "Authenticated users can view product suppliers."
ON public.product_suppliers FOR SELECT
TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can manage product suppliers." ON public.product_suppliers;
CREATE POLICY "Authenticated users can manage product suppliers."
ON public.product_suppliers FOR ALL
TO authenticated
USING (TRUE) WITH CHECK (TRUE);

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp_product_suppliers()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_product_suppliers_updated_at ON public.product_suppliers;
CREATE TRIGGER set_product_suppliers_updated_at
BEFORE UPDATE ON public.product_suppliers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp_product_suppliers();
