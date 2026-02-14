# Fix RLS Policies para Banners y Tarjetas - Pasos SQL

Ejecuta estos comandos en el SQL Editor de tu dashboard de Supabase, uno por uno.

---

## Paso 1: Agregar políticas públicas para INSERT/UPDATE/DELETE en `home_banners`

Esto permitirá que el admin web (usando anon key) pueda guardar banners.

```sql
-- Política adicional para permitir operaciones con anon key (para admin web)
DROP POLICY IF EXISTS "Public can insert banners" ON public.home_banners;
CREATE POLICY "Public can insert banners"
ON public.home_banners FOR INSERT
TO public
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public can update banners" ON public.home_banners;
CREATE POLICY "Public can update banners"
ON public.home_banners FOR UPDATE
TO public
USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public can delete banners" ON public.home_banners;
CREATE POLICY "Public can delete banners"
ON public.home_banners FOR DELETE
TO public
USING (TRUE);
```

---

## Paso 2: Agregar políticas públicas para INSERT/UPDATE/DELETE en `featured_cards`

Esto permitirá que el admin web (usando anon key) pueda guardar tarjetas.

```sql
-- Política adicional para permitir operaciones con anon key (para admin web)
DROP POLICY IF EXISTS "Public can insert featured cards" ON public.featured_cards;
CREATE POLICY "Public can insert featured cards"
ON public.featured_cards FOR INSERT
TO public
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public can update featured cards" ON public.featured_cards;
CREATE POLICY "Public can update featured cards"
ON public.featured_cards FOR UPDATE
TO public
USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public can delete featured cards" ON public.featured_cards;
CREATE POLICY "Public can delete featured cards"
ON public.featured_cards FOR DELETE
TO public
USING (TRUE);
```

---

## Nota

Estas políticas permiten que cualquier usuario (incluido el admin web usando la anon key) pueda insertar, actualizar y eliminar banners y tarjetas. Las políticas de lectura pública (`active = true`) siguen vigentes, por lo que solo los banners/tarjetas activos se mostrarán en el sitio público.
