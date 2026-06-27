import { useEffect, useRef } from "react";
import { Lock, Check, Loader2, Play, Info, Plus } from "lucide-react";
import { WorkspaceAvatar } from "@/components/admin/WorkspaceAvatar";
import { useTheme } from "@/contexts/ThemeContext";
import { NoryFlowControls, noryFlowVars } from "@/components/portal/NoryFlowControls";

/* ─────────────────────────────────────────────
   NoryFlowGallery — galeria da área de membros
   estilo Netflix (skin "netflix"), identidade Nory.
   Top bar + hero de destaque + fileiras horizontais
   com cards que expandem no hover. Orientado a dados.
   Convertido do template claude.ai/design
   "PAGINA GALERIA DE CURSOS".
   ───────────────────────────────────────────── */

export interface GalleryCourse {
  id: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  /** 0–100; barra só aparece quando definido. */
  progress?: number | null;
  /** ex.: "9/12 aulas". */
  lessonsLabel?: string | null;
  completed?: boolean;
  locked?: boolean;
  requested?: boolean;
  onClick?: () => void;
  onRequestAccess?: () => void;
}

export interface GalleryRow {
  key: string;
  label: string;
  items: GalleryCourse[];
}

interface Props {
  userName?: string;
  tenantName: string;
  /** marca do tenant (logo) */
  iconUrl?: string | null;
  iconName?: string | null;
  iconColor?: string | null;
  /** cor de acento do tenant (botões/progresso); fallback azul Nory */
  accent?: string | null;
  loading?: boolean;
  featured?: GalleryCourse | null;
  rows: GalleryRow[];
  onSignOut: () => void;
  onProfile?: () => void;
  /** slug do tenant (link do menu de usuário) */
  tenantSlug?: string;
  /** id do usuário (persistência de idioma) */
  userId?: string | null;
}

const DEFAULT_ACCENT = "linear-gradient(105deg,#1668D9,#1E84FF)";

const GRADS = [
  "linear-gradient(135deg,#1668D9,#2BE0A1)",
  "linear-gradient(135deg,#00C2CB,#1668D9)",
  "linear-gradient(135deg,#1668D9,#00C2CB)",
  "linear-gradient(135deg,#163a8f,#0d6b6e)",
  "linear-gradient(135deg,#5a1f9e,#1668D9)",
  "linear-gradient(135deg,#0E2A6B,#00C2CB)",
];
const gradOf = (i: number) => GRADS[i % GRADS.length];
const ACCENT = "var(--nf-accent)";
const BRAND = "linear-gradient(105deg,#1668D9,#2BE0A1)";

const CSS = `
.nf-app{--nf-gut:clamp(16px,5vw,44px);}
.nf-app .row-scroll{scrollbar-width:none;-ms-overflow-style:none;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;}
.nf-app .row-scroll::-webkit-scrollbar{display:none;}
.nf-app .row-card{transition:transform .28s cubic-bezier(.2,.7,.2,1);scroll-snap-align:start;}
.nf-app .row-card:hover{transform:scale(1.09);z-index:8;box-shadow:0 26px 60px rgba(0,0,0,.55);}
.nf-app .row-card .card-overlay{opacity:0;transition:opacity .25s ease;}
.nf-app .row-card:hover .card-overlay,.nf-app .row-card:focus-visible .card-overlay{opacity:1;}
.nf-app .row-card:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(30,132,255,.7);}
.nf-app .nf-row .row-arrow{opacity:0;transition:opacity .2s ease;}
.nf-app .nf-row:hover .row-arrow{opacity:1;}
.nf-app .nav-item{cursor:pointer;background:none;border:none;font:inherit;padding:0;}
.nf-app .nav-item:hover{color:var(--nf-text) !important;}
.nf-app .nf-icon-btn:focus-visible,.nf-app .nf-cta:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(30,132,255,.7);}
.nf-app .row-slider{height:5px;margin:12px var(--nf-gut) 0;background:var(--nf-border);border-radius:6px;position:relative;cursor:pointer;}
.nf-app .row-slider-thumb{position:absolute;top:0;bottom:0;left:0;width:30%;border-radius:6px;background:${ACCENT};transition:left .12s linear;}
.nf-app .row-slider:hover .row-slider-thumb{filter:brightness(1.15);}
.nf-app .nf-top{padding:16px var(--nf-gut);}
.nf-app .nf-pad{padding-left:var(--nf-gut);padding-right:var(--nf-gut);}
.nf-app .nf-hero{height:clamp(420px,72vh,560px);}
.nf-app .nf-hero-content{left:var(--nf-gut);right:var(--nf-gut);bottom:clamp(64px,12vh,118px);max-width:560px;}
.nf-app .nf-hero-title{font-size:clamp(28px,6vw,56px);}
.nf-app .nf-row-label{padding:0 var(--nf-gut);}
.nf-app .nf-row-scroll{padding:6px var(--nf-gut) 18px;}
@media(max-width:760px){
  .nf-app .nf-nav{display:none!important;}
  .nf-app .row-slider{display:none;}
  .nf-app .row-arrow{display:none;}
}
@media(hover:none){
  .nf-app .row-card .card-overlay{opacity:1;}
  .nf-app .row-card:hover{transform:none;box-shadow:none;}
}
@media(prefers-reduced-motion:reduce){
  .nf-app *{transition:none!important;animation:none!important;scroll-behavior:auto!important;}
  .nf-app .row-card:hover{transform:none;}
}
`;

function CourseCard({ course, index }: { course: GalleryCourse; index: number }) {
  const cover = course.coverUrl
    ? { backgroundImage: `url(${course.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: gradOf(index) };
  const cta = course.locked ? "Solicitar acesso" : course.completed ? "Revisar" : course.progress ? "Continuar" : "Começar";
  const interactive = !course.locked && !!course.onClick;

  return (
    <div
      className="row-card"
      onClick={course.locked ? undefined : course.onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${cta} — ${course.title}` : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                course.onClick?.();
              }
            }
          : undefined
      }
      style={{
        position: "relative",
        flex: "0 0 256px",
        maxWidth: "82vw",
        height: 150,
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        ...cover,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 120% at 18% 12%,rgba(255,255,255,.18),transparent 55%)" }} />

      {course.completed && (
        <span style={{ position: "absolute", top: 10, right: 10, fontSize: 11, fontWeight: 700, color: "#0A1326", background: "#fff", padding: "4px 10px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 4 }}><Check className="size-3" aria-hidden="true" /> Concluído</span>
      )}
      {course.locked && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(7,9,14,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Lock className="size-7" style={{ color: "rgba(255,255,255,.85)" }} aria-label="Conteúdo bloqueado" />
        </div>
      )}

      <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, fontFamily: "'Sora'", fontWeight: 700, fontSize: 17, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,.4)", lineHeight: 1.15 }}>
        {course.title}
      </div>

      {typeof course.progress === "number" && course.progress > 0 && !course.completed && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "rgba(10,19,38,.5)" }}>
          <div style={{ width: `${Math.min(100, course.progress)}%`, height: "100%", background: ACCENT }} />
        </div>
      )}

      {/* overlay no hover */}
      <div className="card-overlay" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,19,38,.15),rgba(10,19,38,.93))", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 14 }}>
        <div style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 16, marginBottom: 5, color: "#fff" }}>{course.title}</div>
        <div style={{ fontSize: 12, color: course.completed ? "#2BE0A1" : "var(--nf-muted)", marginBottom: 11 }}>
          {course.locked
            ? "Disponível para acesso"
            : course.lessonsLabel ?? (course.description ? String(course.description).slice(0, 48) : "Curso")}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {course.locked ? (
            <button
              type="button"
              className="nf-cta"
              onClick={(e) => { e.stopPropagation(); course.onRequestAccess?.(); }}
              disabled={course.requested}
              aria-live="polite"
              style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: course.requested ? "var(--nf-border)" : ACCENT, border: course.requested ? "1px solid var(--nf-border-strong)" : "none", padding: "7px 15px", borderRadius: 100, cursor: course.requested ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {course.requested ? <><Check className="size-3.5" aria-hidden="true" /> Solicitado</> : cta}
            </button>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: course.completed ? "var(--nf-border)" : ACCENT, border: course.completed ? "1px solid var(--nf-border-strong)" : "none", padding: "7px 15px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 6 }}><Play className="size-3.5" aria-hidden="true" /> {cta}</span>
          )}
          <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--nf-border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "0 0 auto" }}><Plus className="size-4" /></span>
        </div>
      </div>
    </div>
  );
}

function Row({ row }: { row: GalleryRow }) {
  const ref = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: Math.max(0, Math.min(el.scrollLeft + dir * 660, max)), behavior: "smooth" });
  };

  // barra de rolagem arrastável (do template MODULOS)
  useEffect(() => {
    const el = ref.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;
    const update = () => {
      const vis = el.clientWidth;
      const total = el.scrollWidth;
      const wPct = Math.max(14, Math.min(100, (vis / total) * 100));
      thumb.style.width = `${wPct}%`;
      const max = total - vis;
      const p = max > 0 ? el.scrollLeft / max : 0;
      thumb.style.left = `${p * (100 - wPct)}%`;
    };
    update();
    const t = setTimeout(update, 400);
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const seek = (clientX: number) => {
    const el = ref.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const r = track.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    el.scrollLeft = p * (el.scrollWidth - el.clientWidth);
  };

  if (!row.items.length) return null;

  return (
    <div className="nf-row" style={{ position: "relative", marginBottom: 42 }}>
      <div className="nf-row-label" style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 12, fontWeight: 600, color: "var(--nf-muted)", margin: "0 0 14px" }}>
        {row.label}
      </div>
      <button type="button" aria-label="Rolar para a esquerda" className="row-arrow" onClick={() => scroll(-1)} style={{ position: "absolute", left: 8, top: 48, bottom: 0, width: 36, zIndex: 9, border: "none", cursor: "pointer", background: "rgba(10,19,38,.6)", color: "#fff", fontSize: 20, borderRadius: 8 }}>‹</button>
      <button type="button" aria-label="Rolar para a direita" className="row-arrow" onClick={() => scroll(1)} style={{ position: "absolute", right: 8, top: 48, bottom: 0, width: 36, zIndex: 9, border: "none", cursor: "pointer", background: "rgba(10,19,38,.6)", color: "#fff", fontSize: 20, borderRadius: 8 }}>›</button>
      <div ref={ref} className="row-scroll nf-row-scroll" style={{ display: "flex", gap: 14, overflowX: "auto" }}>
        {row.items.map((c, i) => (
          <CourseCard key={c.id} course={c} index={i} />
        ))}
      </div>
      <div
        ref={trackRef}
        className="row-slider"
        onPointerDown={(e) => {
          dragging.current = true;
          try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
          seek(e.clientX);
        }}
        onPointerMove={(e) => { if (dragging.current) seek(e.clientX); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <div ref={thumbRef} className="row-slider-thumb" />
      </div>
    </div>
  );
}

export function NoryFlowGallery({ userName, tenantName, iconUrl, iconName, iconColor, accent, loading, featured, rows, onSignOut, onProfile, tenantSlug, userId }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const accentVal = accent || DEFAULT_ACCENT;
  const isEmpty = !featured && rows.every((r) => r.items.length === 0);
  const heroCover = featured?.coverUrl
    ? { backgroundImage: `linear-gradient(120deg,rgba(7,9,14,.85),rgba(7,9,14,.2)),url(${featured.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(120deg,#0B1024 0%,#0B1733 44%,#103A66 72%,#0E5560 100%)" };

  return (
    <div className="nf-app" data-theme={isDark ? "dark" : "light"} style={{ minHeight: "100vh", background: "var(--nf-bg)", color: "var(--nf-text)", fontFamily: "'Manrope',system-ui,sans-serif", overflowX: "hidden", ["--nf-accent" as string]: accentVal, ...noryFlowVars(isDark) } as React.CSSProperties}>
      <style>{CSS}</style>

      {/* TOP BAR */}
      <header className="nf-top" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "var(--nf-topbar)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--nf-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 38, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <WorkspaceAvatar iconUrl={iconUrl} iconName={iconName} iconColor={iconColor} size="md" />
            <span style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tenantName}</span>
          </div>
          <nav className="nf-nav" style={{ display: "flex", alignItems: "center", gap: 26, fontSize: 14, fontWeight: 600 }}>
            <button type="button" className="nav-item" aria-current="page" style={{ color: "var(--nf-text)" }}>Início</button>
            <button type="button" className="nav-item" style={{ color: "var(--nf-muted)" }}>Cursos</button>
            <button type="button" className="nav-item" onClick={onProfile} style={{ color: "var(--nf-muted)" }}>Perfil</button>
          </nav>
        </div>
        <NoryFlowControls
          tenantSlug={tenantSlug}
          userId={userId}
          userLabel={userName ?? tenantName}
          accentBg="var(--nf-accent)"
          onSignOut={onSignOut}
        />
      </header>

      {loading ? (
        <div style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
          <Loader2 className="size-8 animate-spin" style={{ color: "var(--nf-muted)" }} />
        </div>
      ) : isEmpty ? (
        <div style={{ display: "grid", placeItems: "center", minHeight: "70vh", textAlign: "center", padding: "0 24px" }}>
          <div>
            <div style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Nenhum curso por aqui ainda</div>
            <div style={{ color: "var(--nf-muted)", fontSize: 14 }}>Quando você tiver acesso a cursos, eles aparecem aqui.</div>
          </div>
        </div>
      ) : (
        <>
      {/* HERO */}
      <section className="nf-hero" style={{ position: "relative", overflow: "hidden", ...heroCover }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 110% at 82% 18%,rgba(43,224,161,.4),transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 90% at 70% 40%,rgba(30,132,255,.35),transparent 60%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "min(45%,240px)", background: "linear-gradient(180deg,transparent,var(--nf-bg))" }} />

        <div className="nf-hero-content" style={{ position: "absolute" }}>
          <div style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 12, fontWeight: 600, color: "#2BE0A1", marginBottom: 16 }}>
            Curso em destaque
          </div>
          <h1 className="nf-hero-title" style={{ fontFamily: "'Sora'", fontWeight: 800, lineHeight: 1.04, letterSpacing: "-1.5px", margin: "0 0 16px", textWrap: "balance", color: "#fff" }}>
            {featured?.title ?? "Comece a aprender"}
          </h1>
          {featured?.description && (
            <p style={{ fontSize: 16, lineHeight: 1.5, color: "#D6E0F0", margin: "0 0 18px", maxWidth: 480, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {featured.description}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="nf-cta" onClick={featured?.onClick} style={{ border: "none", cursor: "pointer", background: ACCENT, color: "#fff", fontFamily: "'Manrope'", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 100, boxShadow: "0 10px 26px rgba(30,132,255,.42)", display: "flex", alignItems: "center", gap: 8 }}>
              <Play className="size-4" aria-hidden="true" /> {featured?.progress ? "Continuar" : "Começar"}
            </button>
            <button type="button" className="nf-cta" onClick={featured?.onClick} style={{ cursor: "pointer", background: "rgba(255,255,255,.1)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid var(--nf-border-strong)", fontFamily: "'Manrope'", fontWeight: 600, fontSize: 15, padding: "14px 24px", borderRadius: 100, display: "flex", alignItems: "center", gap: 8 }}>
              <Info className="size-4" aria-hidden="true" /> Detalhes
            </button>
          </div>
        </div>
      </section>

      {/* ROWS */}
      <div style={{ position: "relative", zIndex: 3, marginTop: "clamp(-70px,-7vw,-40px)", padding: "0 0 80px" }}>
        {rows.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </div>
        </>
      )}
    </div>
  );
}
