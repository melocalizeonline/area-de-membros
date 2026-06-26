import { useEffect, useRef } from "react";
import { Lock, Check, Loader2 } from "lucide-react";
import { WorkspaceAvatar } from "@/components/admin/WorkspaceAvatar";

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
}

const DEFAULT_ACCENT = "linear-gradient(105deg,#1f6fe0,#3b8bff)";

const GRADS = [
  "linear-gradient(135deg,#1668FF,#34DE7E)",
  "linear-gradient(135deg,#00C2CB,#1668FF)",
  "linear-gradient(135deg,#1668FF,#00C2CB)",
  "linear-gradient(135deg,#163a8f,#0d6b6e)",
  "linear-gradient(135deg,#5a1f9e,#1668FF)",
  "linear-gradient(135deg,#0E2A6B,#00C2CB)",
];
const gradOf = (i: number) => GRADS[i % GRADS.length];
const ACCENT = "var(--nf-accent)";
const BRAND = "linear-gradient(105deg,#1668FF,#34DE7E)";

const CSS = `
.nf-app .row-scroll{scrollbar-width:none;-ms-overflow-style:none;}
.nf-app .row-scroll::-webkit-scrollbar{display:none;}
.nf-app .row-card{transition:transform .28s cubic-bezier(.2,.7,.2,1);}
.nf-app .row-card:hover{transform:scale(1.09);z-index:8;box-shadow:0 26px 60px rgba(0,0,0,.55);}
.nf-app .row-card .card-overlay{opacity:0;transition:opacity .25s ease;}
.nf-app .row-card:hover .card-overlay{opacity:1;}
.nf-app .nf-row .row-arrow{opacity:0;transition:opacity .2s ease;}
.nf-app .nf-row:hover .row-arrow{opacity:1;}
.nf-app .nav-item{cursor:pointer;}
.nf-app .nav-item:hover{color:#fff !important;}
.nf-app .row-slider{height:5px;margin:12px 44px 0;background:rgba(255,255,255,.07);border-radius:6px;position:relative;cursor:pointer;}
.nf-app .row-slider-thumb{position:absolute;top:0;bottom:0;left:0;width:30%;border-radius:6px;background:${ACCENT};transition:left .12s linear;}
.nf-app .row-slider:hover .row-slider-thumb{filter:brightness(1.15);}
`;

function CourseCard({ course, index }: { course: GalleryCourse; index: number }) {
  const cover = course.coverUrl
    ? { backgroundImage: `url(${course.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: gradOf(index) };
  const cta = course.locked ? "Solicitar acesso" : course.completed ? "↻ Revisar" : course.progress ? "▶ Continuar" : "▶ Começar";

  return (
    <div
      className="row-card"
      onClick={course.locked ? undefined : course.onClick}
      style={{
        position: "relative",
        flex: "0 0 256px",
        height: 150,
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        ...cover,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 120% at 18% 12%,rgba(255,255,255,.18),transparent 55%)" }} />

      {course.completed && (
        <span style={{ position: "absolute", top: 10, right: 10, fontSize: 11, fontWeight: 700, color: "#0A1326", background: "#fff", padding: "4px 10px", borderRadius: 100 }}>✓ Concluído</span>
      )}
      {course.locked && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(7,9,14,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Lock className="size-7" style={{ color: "rgba(255,255,255,.85)" }} />
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
        <div style={{ fontSize: 12, color: course.completed ? "#34DE7E" : "#8A93A5", marginBottom: 11 }}>
          {course.locked
            ? "Disponível para acesso"
            : course.lessonsLabel ?? (course.description ? String(course.description).slice(0, 48) : "Curso")}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {course.locked ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); course.onRequestAccess?.(); }}
              disabled={course.requested}
              style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: course.requested ? "rgba(255,255,255,.12)" : ACCENT, border: course.requested ? "1px solid rgba(255,255,255,.16)" : "none", padding: "7px 15px", borderRadius: 100, cursor: course.requested ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {course.requested ? <><Check className="size-3.5" /> Solicitado</> : cta}
            </button>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: course.completed ? "rgba(255,255,255,.12)" : ACCENT, border: course.completed ? "1px solid rgba(255,255,255,.16)" : "none", padding: "7px 15px", borderRadius: 100 }}>{cta}</span>
          )}
          <span style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#fff" }}>+</span>
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
      <div style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 12, fontWeight: 600, color: "#8A93A5", margin: "0 0 14px", padding: "0 44px" }}>
        {row.label}
      </div>
      <button className="row-arrow" onClick={() => scroll(-1)} style={{ position: "absolute", left: 8, top: 48, bottom: 0, width: 36, zIndex: 9, border: "none", cursor: "pointer", background: "rgba(10,19,38,.6)", color: "#fff", fontSize: 20, borderRadius: 8 }}>‹</button>
      <button className="row-arrow" onClick={() => scroll(1)} style={{ position: "absolute", right: 8, top: 48, bottom: 0, width: 36, zIndex: 9, border: "none", cursor: "pointer", background: "rgba(10,19,38,.6)", color: "#fff", fontSize: 20, borderRadius: 8 }}>›</button>
      <div ref={ref} className="row-scroll" style={{ display: "flex", gap: 14, overflowX: "auto", padding: "6px 44px 18px" }}>
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

export function NoryFlowGallery({ userName, tenantName, iconUrl, iconName, iconColor, accent, loading, featured, rows, onSignOut, onProfile }: Props) {
  const accentVal = accent || DEFAULT_ACCENT;
  const isEmpty = !featured && rows.every((r) => r.items.length === 0);
  const heroCover = featured?.coverUrl
    ? { backgroundImage: `linear-gradient(120deg,rgba(7,9,14,.85),rgba(7,9,14,.2)),url(${featured.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(120deg,#07090E 0%,#0B1733 44%,#103A66 72%,#0E5560 100%)" };

  return (
    <div className="nf-app" style={{ minHeight: "100vh", background: "#07090E", color: "#fff", fontFamily: "'Manrope',system-ui,sans-serif", overflowX: "hidden", ["--nf-accent" as string]: accentVal } as React.CSSProperties}>
      <style>{CSS}</style>

      {/* TOP BAR */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 44px", background: "linear-gradient(180deg,rgba(10,19,38,.92),rgba(10,19,38,0))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 38 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <WorkspaceAvatar iconUrl={iconUrl} iconName={iconName} iconColor={iconColor} size="md" />
            <span style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 17 }}>{tenantName}</span>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 26, fontSize: 14, fontWeight: 600 }}>
            <span className="nav-item" style={{ color: "#fff" }}>Início</span>
            <span className="nav-item" style={{ color: "#8A93A5" }}>Cursos</span>
            <span className="nav-item" onClick={onProfile} style={{ color: "#8A93A5" }}>Perfil</span>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#8A93A5" }}>⌕</div>
          <button type="button" onClick={onSignOut} title="Sair" style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--nf-accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora'", fontWeight: 700, fontSize: 15, color: "#fff", boxShadow: "0 4px 14px rgba(31,111,224,.42)" }}>
            {(userName ?? tenantName).charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
          <Loader2 className="size-8 animate-spin" style={{ color: "#8A93A5" }} />
        </div>
      ) : isEmpty ? (
        <div style={{ display: "grid", placeItems: "center", minHeight: "70vh", textAlign: "center", padding: "0 24px" }}>
          <div>
            <div style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Nenhum curso por aqui ainda</div>
            <div style={{ color: "#8A93A5", fontSize: 14 }}>Quando você tiver acesso a cursos, eles aparecem aqui.</div>
          </div>
        </div>
      ) : (
        <>
      {/* HERO */}
      <section style={{ position: "relative", height: 560, overflow: "hidden", ...heroCover }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 110% at 82% 18%,rgba(52,222,126,.4),transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 90% at 70% 40%,rgba(22,104,255,.35),transparent 60%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 240, background: "linear-gradient(180deg,transparent,#07090E)" }} />

        <div style={{ position: "absolute", left: 44, bottom: 118, maxWidth: 560 }}>
          <div style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 12, fontWeight: 600, color: "#34DE7E", marginBottom: 16 }}>
            Curso em destaque
          </div>
          <h1 style={{ fontFamily: "'Sora'", fontWeight: 800, fontSize: 56, lineHeight: 1.02, letterSpacing: "-1.5px", margin: "0 0 16px" }}>
            {featured?.title ?? "Comece a aprender"}
          </h1>
          {featured?.description && (
            <p style={{ fontSize: 16, lineHeight: 1.5, color: "#D6E0F0", margin: "0 0 18px", maxWidth: 480 }}>
              {featured.description}
            </p>
          )}
          <div style={{ display: "flex", gap: 14 }}>
            <button type="button" onClick={featured?.onClick} style={{ border: "none", cursor: "pointer", background: ACCENT, color: "#fff", fontFamily: "'Manrope'", fontWeight: 700, fontSize: 15, padding: "14px 30px", borderRadius: 100, boxShadow: "0 10px 26px rgba(31,111,224,.42)", display: "flex", alignItems: "center", gap: 8 }}>
              ▶ {featured?.progress ? "Continuar" : "Começar"}
            </button>
            <button type="button" onClick={featured?.onClick} style={{ cursor: "pointer", background: "rgba(255,255,255,.1)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(255,255,255,.16)", fontFamily: "'Manrope'", fontWeight: 600, fontSize: 15, padding: "14px 26px", borderRadius: 100, display: "flex", alignItems: "center", gap: 8 }}>
              ⓘ Detalhes
            </button>
          </div>
        </div>
      </section>

      {/* ROWS */}
      <div style={{ position: "relative", zIndex: 3, marginTop: -70, padding: "0 0 80px" }}>
        {rows.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </div>
        </>
      )}
    </div>
  );
}
