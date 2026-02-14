# Migración de Banners y Tarjetas Destacadas - Pasos SQL

Ejecuta estos comandos en el SQL Editor de tu dashboard de Supabase, uno por uno.

---

## Paso 1: Crear la tabla `home_banners`

```sql
CREATE TABLE IF NOT EXISTS public.home_banners (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 1,
    redirect_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Paso 2: Crear índices para `home_banners`

```sql
CREATE INDEX IF NOT EXISTS idx_home_banners_active ON public.home_banners (active);
CREATE INDEX IF NOT EXISTS idx_home_banners_display_order ON public.home_banners (display_order);
```

---

## Paso 3: Habilitar RLS en `home_banners`

```sql
ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;
```

---

## Paso 4: Política de lectura pública para `home_banners`

```sql
DROP POLICY IF EXISTS "Public can view active banners" ON public.home_banners;
CREATE POLICY "Public can view active banners"
ON public.home_banners FOR SELECT
TO public
USING (active = true);
```

---

## Paso 5: Política de gestión autenticada para `home_banners`

```sql
DROP POLICY IF EXISTS "Authenticated users can manage banners" ON public.home_banners;
CREATE POLICY "Authenticated users can manage banners"
ON public.home_banners FOR ALL
TO authenticated
USING (TRUE) WITH CHECK (TRUE);
```

---

## Paso 6: Trigger para `updated_at` en `home_banners`

```sql
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
```

---

## Paso 7: Crear la tabla `featured_cards`

```sql
CREATE TABLE IF NOT EXISTS public.featured_cards (
    id TEXT PRIMARY KEY,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 1,
    redirect_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Paso 8: Crear índices para `featured_cards`

```sql
CREATE INDEX IF NOT EXISTS idx_featured_cards_active ON public.featured_cards (active);
CREATE INDEX IF NOT EXISTS idx_featured_cards_display_order ON public.featured_cards (display_order);
```

---

## Paso 9: Habilitar RLS en `featured_cards`

```sql
ALTER TABLE public.featured_cards ENABLE ROW LEVEL SECURITY;
```

---

## Paso 10: Política de lectura pública para `featured_cards`

```sql
DROP POLICY IF EXISTS "Public can view active featured cards" ON public.featured_cards;
CREATE POLICY "Public can view active featured cards"
ON public.featured_cards FOR SELECT
TO public
USING (active = true);
```

---

## Paso 11: Política de gestión autenticada para `featured_cards`

```sql
DROP POLICY IF EXISTS "Authenticated users can manage featured cards" ON public.featured_cards;
CREATE POLICY "Authenticated users can manage featured cards"
ON public.featured_cards FOR ALL
TO authenticated
USING (TRUE) WITH CHECK (TRUE);
```

---

## Paso 12: Trigger para `updated_at` en `featured_cards`

```sql
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
```

---

## Nota sobre el error "quota exceeded"

Si ves el error "The quota has been exceeded" al guardar imágenes, es porque las imágenes en base64 pueden ser muy grandes para Supabase. 

**Solución temporal:** Comprime las imágenes antes de subirlas o usa URLs de imágenes externas.

**Solución futura:** Implementar almacenamiento de imágenes en Supabase Storage o un servicio externo como Cloudinary.
