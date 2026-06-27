import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Sun, Moon, LogOut, LayoutDashboard, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { FlagBR, FlagES, FlagUS } from "@/components/ui/flags";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, type Language } from "@/hooks/useLanguage";

/**
 * Paleta de CSS vars do skin Netflix ("Nory Flow"), reativa ao tema global.
 * Aplique no elemento raiz `.nf-app`; os filhos herdam via cascade.
 */
export function noryFlowVars(isDark: boolean): React.CSSProperties {
  return (isDark
    ? {
        "--nf-bg": "#0B0F1A",
        "--nf-surface": "#141A29",
        "--nf-surface2": "#0E1422",
        "--nf-text": "#FFFFFF",
        "--nf-text2": "#D6E0F0",
        "--nf-muted": "#9AA6BC",
        "--nf-border": "rgba(255,255,255,.08)",
        "--nf-border-strong": "rgba(255,255,255,.16)",
        "--nf-hover": "rgba(255,255,255,.06)",
        "--nf-topbar": "rgba(10,19,38,.72)",
        "--nf-scrim": "rgba(7,9,14,.55)",
      }
    : {
        "--nf-bg": "#F5F8FC",
        "--nf-surface": "#FFFFFF",
        "--nf-surface2": "#EEF2F8",
        "--nf-text": "#0B0F1A",
        "--nf-text2": "#3A4658",
        "--nf-muted": "#5A6678",
        "--nf-border": "rgba(11,15,26,.10)",
        "--nf-border-strong": "rgba(11,15,26,.18)",
        "--nf-hover": "rgba(11,15,26,.05)",
        "--nf-topbar": "rgba(245,248,252,.85)",
        "--nf-scrim": "rgba(11,15,26,.45)",
      }) as React.CSSProperties;
}

const circleBtn: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--nf-border-strong)",
  background: "var(--nf-hover)",
  color: "var(--nf-text)",
  cursor: "pointer",
  flex: "0 0 auto",
};

interface Props {
  tenantSlug?: string;
  userId?: string | null;
  userLabel: string;
  accentBg: string;
  onSignOut: () => Promise<void> | void;
  /** mostra o link "Portal do cliente" no menu (páginas de curso/aula). */
  showPortalLink?: boolean;
}

/**
 * Cluster de controles do topo do skin Netflix: alternar tema (black/light),
 * idioma e menu do usuário — todos funcionais.
 */
export function NoryFlowControls({ tenantSlug, userId, userLabel, accentBg, onSignOut, showPortalLink = false }: Props) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const isDark = theme === "dark";
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, onSignOut]);

  const CurrentFlag = language === "pt-BR" ? FlagBR : language === "es" ? FlagES : FlagUS;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* Alternar tema black/light */}
      <button
        type="button"
        className="nf-icon-btn"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? t("theme.switchToLight", "Mudar para tema claro") : t("theme.switchToDark", "Mudar para tema escuro")}
        title={isDark ? t("theme.switchToLight", "Tema claro") : t("theme.switchToDark", "Tema escuro")}
        style={circleBtn}
      >
        {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
      </button>

      {/* Idioma */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="nf-icon-btn" aria-label={t("language.label")} title={t("language.label")} style={circleBtn}>
            <CurrentFlag className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuRadioGroup value={language} onValueChange={(v) => setLanguage(v as Language, userId)}>
            <DropdownMenuRadioItem value="en" className="gap-2"><FlagUS className="size-4" />{t("language.en")}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="es" className="gap-2"><FlagES className="size-4" />{t("language.es")}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="pt-BR" className="gap-2"><FlagBR className="size-4" />{t("language.pt-BR")}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Menu do usuário */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="nf-icon-btn"
            disabled={isSigningOut}
            aria-label={t("courseShowcase.userMenu", "Menu da conta")}
            style={{ ...circleBtn, background: accentBg, border: "none", color: "#fff", fontFamily: "'Sora'", fontWeight: 700, fontSize: 15, boxShadow: "0 4px 14px rgba(30,132,255,.42)" }}
          >
            {isSigningOut ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : userLabel.charAt(0).toUpperCase()}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {showPortalLink && tenantSlug && (
            <>
              <DropdownMenuItem asChild>
                <Link to={`/${tenantSlug}`} className="flex items-center gap-2">
                  <LayoutDashboard className="size-4" aria-hidden="true" />
                  {t("courseShowcase.portal", "Portal do cliente")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive focus:text-destructive">
            <LogOut className="size-4" aria-hidden="true" />
            {t("courseShowcase.signOut", "Sair")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
