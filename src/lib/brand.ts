/**
 * ─── Configuração de Branding ────────────────────────────────────────────────
 *
 * Para substituir o branding da plataforma pelo seu:
 *
 * 1. Substitua os arquivos em /public/brand/:
 *      - logo-nory-dark.png    → logo para fundo claro   (tema light)
 *      - logo-nory-light.png   → logo para fundo escuro  (tema dark)
 *      - icon-nory.webp        → ícone quadrado da marca
 *      - avatar-nory.webp      → avatar/foto do superadmin
 *      - default-tenant-icon.png → ícone fallback de workspace
 *      - favicon-nory.webp     → favicon
 *
 *    Mantenha os mesmos nomes de arquivo OU atualize os caminhos abaixo.
 *
 * 2. Atualize BRAND_NAME com o nome da sua plataforma.
 *
 * 3. No index.html, atualize <title>, <meta name="description"> e os <link rel="icon">.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Nome da plataforma — usado em títulos de página e textos de interface. */
export const BRAND_NAME = "Nory Members";

/** Logo colorida — para fundo claro (tema light). */
export const BRAND_LOGO_DARK = "/brand/logo-nory-dark.png";

/** Logo branca — para fundo escuro (tema dark). */
export const BRAND_LOGO_LIGHT = "/brand/logo-nory-light.png";

/** Ícone quadrado — versão para fundo escuro. */
export const BRAND_ICON_DARK = "/brand/icon-nory.webp";

/** Ícone quadrado — versão para fundo claro. */
export const BRAND_ICON_LIGHT = "/brand/icon-nory.webp";

/** Avatar do superadmin — versão para fundo escuro. */
export const BRAND_AVATAR_DARK = "/brand/avatar-nory.webp";

/** Avatar do superadmin — versão para fundo claro. */
export const BRAND_AVATAR_LIGHT = "/brand/avatar-nory.webp";

/** Ícone fallback exibido quando um workspace não tem ícone configurado. */
export const BRAND_DEFAULT_TENANT_ICON = "/brand/default-tenant-icon.png";
