-- Expoe account_status na RPC publica get_public_tenant_by_slug, para o portal
-- do cliente poder bloquear acesso quando o tenant esta blocked/cancelled
-- (Fase 5 do SUPERADMIN_ACTION_PLAN — enforcement de account_status).

DROP FUNCTION IF EXISTS public.get_public_tenant_by_slug(text);

CREATE OR REPLACE FUNCTION public.get_public_tenant_by_slug(
  p_slug text
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  icon_url text,
  primary_color text,
  accent_color text,
  theme_mode text,
  hero_image_url text,
  portal_use_brand_colors boolean,
  portal_theme_mode text,
  portal_bg_image_url text,
  portal_button_color text,
  portal_button_style text,
  portal_products_template text,
  account_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    t.id,
    t.name,
    t.slug,
    ts.description,
    ts.icon_url,
    ts.primary_color,
    ts.accent_color,
    ts.theme_mode,
    ts.hero_image_url,
    ts.portal_use_brand_colors,
    ts.portal_theme_mode,
    ts.portal_bg_image_url,
    ts.portal_button_color,
    ts.portal_button_style,
    ts.portal_products_template,
    ts.account_status
  FROM public.tenants t
  JOIN public.tenant_settings ts ON ts.tenant_id = t.id
  WHERE t.slug = p_slug;
$$;
