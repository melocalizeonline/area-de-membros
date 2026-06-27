/**
 * Paleta neutra do portal do aluno — alinhada à Identidade Visual NORY.
 *
 * O portal do cliente tem seu próprio modo claro/escuro por tenant
 * (`tenant.portal_theme_mode`), independente do toggle global. Estas páginas
 * (PortalHome, PortalProductDetail, CustomerAuthPage) usam cores neutras
 * inline. Centralizamos aqui para evitar duplicação e manter o brand.
 *
 * As cores DE MARCA do tenant (primary_color, accent_color) continuam sendo
 * aplicadas separadamente como overrides inline e devem prevalecer.
 */
export interface PortalThemeColors {
  bg: string;
  text: string;
  textSecondary: string;
  inputBg: string;
  inputBorder: string;
  cardBg: string;
  cardBorder: string;
}

const DARK: PortalThemeColors = {
  bg: "#0B0F1A",
  text: "#EEF2F8",
  textSecondary: "#9AA6BC",
  inputBg: "#141A29",
  inputBorder: "#222B3D",
  cardBg: "#141A29",
  cardBorder: "rgba(255,255,255,.08)",
};

const LIGHT: PortalThemeColors = {
  bg: "#F5F8FC",
  text: "#0B0F1A",
  textSecondary: "#3A4658",
  inputBg: "#FFFFFF",
  inputBorder: "#E2E8F1",
  cardBg: "#FFFFFF",
  cardBorder: "rgba(0,0,0,.08)",
};

export function getPortalThemeColors(isDark: boolean): PortalThemeColors {
  return isDark ? DARK : LIGHT;
}
