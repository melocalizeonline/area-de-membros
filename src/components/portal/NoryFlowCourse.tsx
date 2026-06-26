import { useState } from "react";

/* ─────────────────────────────────────────────
   NoryFlowCourse — página do curso (skin "netflix"):
   top bar + hero do curso + GRID de cards de módulo
   (capa estilo Netflix) + painel expansível com as
   aulas do módulo selecionado. Identidade Nory.
   Convertido do template claude.ai/design
   "PAGINA MODULOS".
   ───────────────────────────────────────────── */

const ACCENT = "linear-gradient(105deg,#1f6fe0,#3b8bff)";
const BRAND = "linear-gradient(105deg,#1668FF,#34DE7E)";
const COVERS = [
  "linear-gradient(135deg,#1668FF,#34DE7E)",
  "linear-gradient(135deg,#1f6fe0,#00C2CB)",
  "linear-gradient(135deg,#5a1f9e,#1668FF)",
  "linear-gradient(135deg,#163a8f,#0d6b6e)",
  "linear-gradient(135deg,#0E2A6B,#00C2CB)",
];

export type ModuleStatus = "done" | "progress" | "locked";
export type LessonStatus = "done" | "current" | "todo";

export interface CourseLessonItem {
  id: string;
  n: number;
  title: string;
  dur: string;
  status: LessonStatus;
  onClick: () => void;
}
export interface CourseModuleItem {
  id: string;
  num: number;
  title: string;
  count: number;
  progress: number; // 0–100
  status: ModuleStatus;
  lessons: CourseLessonItem[];
}

interface Props {
  tenantName: string;
  courseTitle: string;
  courseDescription?: string | null;
  coverUrl?: string | null;
  coursePercent: number;
  metaLine: string; // ex.: "62% concluído · 12 aulas · 4h30min"
  modules: CourseModuleItem[];
  defaultOpen?: number;
  onContinue: () => void;
  onStartFromBeginning: () => void;
  onBack: () => void;
  onSignOut: () => void;
}

const CSS = `
.nf-app .nav-item{cursor:pointer;}
.nf-app .nav-item:hover{color:#fff!important;}
.nf-app .modules-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
@media(max-width:900px){.nf-app .modules-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){.nf-app .modules-grid{grid-template-columns:1fr;}}
.nf-app .module-card{transition:transform .25s cubic-bezier(.2,.7,.2,1),border-color .25s,box-shadow .25s;cursor:pointer;}
.nf-app .module-card:hover{transform:translateY(-4px);}
.nf-app .module-card.active{border-color:#3b8bff!important;box-shadow:0 0 0 1px rgba(59,139,255,.5),0 18px 50px rgba(31,111,224,.28)!important;}
.nf-app .module-lessons{overflow:hidden;transition:grid-template-rows .42s cubic-bezier(.2,.7,.2,1),opacity .3s;display:grid;grid-template-rows:0fr;opacity:0;}
.nf-app .module-lessons.open{grid-template-rows:1fr;opacity:1;margin-top:18px;}
.nf-app .module-lessons>.ml-inner{min-height:0;}
.nf-app .lesson-row{transition:background .18s;text-decoration:none;cursor:pointer;}
.nf-app .lesson-row:hover{background:rgba(255,255,255,.05)!important;}
.nf-app .caret{transition:transform .3s;}
.nf-app .module-card.active .caret{transform:rotate(180deg);}
.nf-app .cover-play{opacity:0;transform:scale(.8);transition:opacity .25s,transform .25s;}
.nf-app .module-card:hover .cover-play{opacity:1;transform:scale(1);}
.nf-app .cover-num{transition:transform .35s cubic-bezier(.2,.7,.2,1);}
.nf-app .module-card:hover .cover-num{transform:translateX(6px) scale(1.04);}
`;

function badge(status: ModuleStatus) {
  const base: React.CSSProperties = {
    fontFamily: "'Space Grotesk'",
    textTransform: "uppercase",
    letterSpacing: ".12em",
    fontSize: 10,
    fontWeight: 700,
    padding: "5px 11px",
    borderRadius: 100,
    whiteSpace: "nowrap",
    background: "rgba(7,9,14,.55)",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(255,255,255,.12)",
  };
  if (status === "done") return { label: "Concluído", style: { ...base, color: "#3BF08F" } };
  if (status === "progress") return { label: "Em andamento", style: { ...base, color: "#6FB0FF" } };
  return { label: "Não iniciado", style: { ...base, color: "#C2CADA" } };
}

function ModuleCard({ mod, index, active, onToggle }: { mod: CourseModuleItem; index: number; active: boolean; onToggle: () => void }) {
  const b = badge(mod.status);
  const cta = mod.status === "done" ? "Revisar módulo" : mod.status === "progress" ? "Continuar módulo" : "Começar módulo";
  return (
    <div
      className={`module-card${active ? " active" : ""}`}
      onClick={onToggle}
      style={{ background: "linear-gradient(160deg,#0E1119,#080A10)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <div className="module-cover" style={{ position: "relative", height: 132, overflow: "hidden", background: COVERS[index % COVERS.length] }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 130% at 12% 8%,rgba(255,255,255,.22),transparent 52%)" }} />
        <div className="cover-num" style={{ position: "absolute", right: -6, bottom: -26, fontFamily: "'Sora'", fontWeight: 800, fontSize: 120, lineHeight: 1, color: "rgba(255,255,255,.16)" }}>{mod.num}</div>
        <div style={{ position: "absolute", top: 12, left: 12, width: 26, height: 26, borderRadius: 8, background: "rgba(7,9,14,.42)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora'", fontWeight: 800, fontSize: 13, color: "#fff" }}>N</div>
        <span style={{ position: "absolute", top: 12, right: 12, ...b.style }}>{b.label}</span>
        <div style={{ position: "absolute", left: 14, bottom: 12, fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".18em", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.85)", textShadow: "0 1px 6px rgba(0,0,0,.4)" }}>Módulo {mod.num}</div>
        <div className="cover-play" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 46, height: 46, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(31,111,224,.42)" }}>
          <div style={{ width: 0, height: 0, borderLeft: "12px solid #fff", borderTop: "8px solid transparent", borderBottom: "8px solid transparent", marginLeft: 3 }} />
        </div>
      </div>

      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <div style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 20, letterSpacing: "-.3px" }}>{mod.title}</div>
          <div style={{ fontSize: 13, color: "#8A93A5", whiteSpace: "nowrap" }}>{mod.count} aulas</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8A93A5", marginBottom: 8 }}>
          <span>Progresso</span><span style={{ color: "#fff", fontWeight: 600 }}>{mod.progress}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 100, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
          <div style={{ width: `${mod.progress}%`, height: "100%", borderRadius: 100, background: mod.status === "done" ? BRAND : ACCENT }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{cta}</span>
          <span className="caret" style={{ fontSize: 12, color: "#8A93A5" }}>▼</span>
        </div>
      </div>
    </div>
  );
}

function LessonRow({ ls }: { ls: CourseLessonItem }) {
  const isCur = ls.status === "current";
  const rowBase: React.CSSProperties = { display: "flex", alignItems: "center", gap: 16, padding: "15px 22px", borderBottom: "1px solid rgba(255,255,255,.07)" };
  let statusStyle: React.CSSProperties = { flex: "0 0 26px", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 };
  let icon = "○";
  let titleColor = "#8A93A5";
  let titleWeight = 500;
  let numColor = "#8A93A5";
  let numWeight = 400;
  if (ls.status === "done") {
    statusStyle = { ...statusStyle, background: "rgba(52,222,126,.16)", color: "#34DE7E", fontWeight: 700 };
    icon = "✓";
  } else if (isCur) {
    statusStyle = { flex: "0 0 30px", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: ACCENT, color: "#fff", boxShadow: "0 4px 14px rgba(31,111,224,.42)" };
    icon = "▶";
    titleColor = "#fff"; titleWeight = 700; numColor = "#fff"; numWeight = 600;
  } else {
    statusStyle = { ...statusStyle, border: "1.5px solid rgba(255,255,255,.16)", color: "#8A93A5" };
  }
  const rowStyle = { ...rowBase, ...(isCur ? { background: "rgba(31,111,224,.10)", boxShadow: "inset 3px 0 0 #3b8bff" } : {}) };

  return (
    <div className="lesson-row" onClick={ls.onClick} style={rowStyle}>
      <span style={statusStyle}>{icon}</span>
      <span style={{ flex: "0 0 26px", fontSize: 14, fontVariantNumeric: "tabular-nums", color: numColor, fontWeight: numWeight }}>{String(ls.n).padStart(2, "0")}</span>
      <span style={{ flex: 1, fontSize: 15, color: titleColor, fontWeight: titleWeight }}>{ls.title}</span>
      <span style={{ fontSize: 13, color: titleColor, fontVariantNumeric: "tabular-nums" }}>{ls.dur}</span>
      <span style={{ fontSize: 14, color: "#8A93A5" }}>›</span>
    </div>
  );
}

export function NoryFlowCourse({
  tenantName, courseTitle, courseDescription, coverUrl, coursePercent, metaLine,
  modules, defaultOpen = 0, onContinue, onStartFromBeginning, onBack, onSignOut,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const active = open >= 0 ? modules[open] : undefined;

  const heroCover = coverUrl
    ? { backgroundImage: `linear-gradient(120deg,rgba(7,9,14,.9),rgba(7,9,14,.25)),url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(120deg,#07090E 0%,#0B1733 44%,#103A66 72%,#0E5560 100%)" };

  return (
    <div className="nf-app" style={{ minHeight: "100vh", background: "#07090E", color: "#fff", fontFamily: "'Manrope',system-ui,sans-serif", overflowX: "hidden" }}>
      <style>{CSS}</style>

      {/* TOP BAR */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 44px", background: "rgba(7,9,14,.72)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 38 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: BRAND, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora'", fontWeight: 800, fontSize: 17, color: "#fff", boxShadow: "0 4px 14px rgba(31,111,224,.42)" }}>N</div>
            <span style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 17 }}>{tenantName}</span>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 26, fontSize: 14, fontWeight: 600 }}>
            <span className="nav-item" onClick={onBack} style={{ color: "#8A93A5" }}>Início</span>
            <span className="nav-item" style={{ color: "#fff" }}>Cursos</span>
            <span className="nav-item" style={{ color: "#8A93A5" }}>Perfil</span>
          </nav>
        </div>
        <button type="button" onClick={onSignOut} title="Sair" style={{ width: 38, height: 38, borderRadius: "50%", background: BRAND, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora'", fontWeight: 700, fontSize: 15, color: "#fff", boxShadow: "0 4px 14px rgba(31,111,224,.42)" }}>
          {tenantName.charAt(0).toUpperCase()}
        </button>
      </header>

      {/* HERO */}
      <section style={{ position: "relative", height: 520, overflow: "hidden", ...heroCover }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 110% at 82% 18%,rgba(52,222,126,.4),transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 90% at 70% 40%,rgba(22,104,255,.35),transparent 60%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 240, background: "linear-gradient(180deg,transparent,#07090E)" }} />

        <div style={{ position: "absolute", left: 44, bottom: 74, maxWidth: 580 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#8A93A5", marginBottom: 18 }}>
            <span style={{ cursor: "pointer" }} onClick={onBack}>Cursos</span><span>›</span><span style={{ color: "#fff" }}>{courseTitle}</span>
          </div>
          <div style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 12, fontWeight: 600, color: "#34DE7E", marginBottom: 14 }}>Curso</div>
          <h1 style={{ fontFamily: "'Sora'", fontWeight: 800, fontSize: 52, lineHeight: 1.03, letterSpacing: "-1.4px", margin: "0 0 14px" }}>{courseTitle}</h1>
          {courseDescription && <p style={{ fontSize: 16, lineHeight: 1.5, color: "#D6E0F0", margin: "0 0 16px", maxWidth: 510 }}>{courseDescription}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#8A93A5", marginBottom: 16 }}>
            <span style={{ fontWeight: 700, color: "#34DE7E" }}>{coursePercent}% concluído</span><span>·</span><span>{metaLine}</span>
          </div>
          <div style={{ maxWidth: 510, height: 6, borderRadius: 100, background: "rgba(255,255,255,.12)", overflow: "hidden", marginBottom: 24 }}>
            <div style={{ width: `${coursePercent}%`, height: "100%", borderRadius: 100, background: BRAND }} />
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <button type="button" onClick={onContinue} style={{ border: "none", cursor: "pointer", background: ACCENT, color: "#fff", fontFamily: "'Manrope'", fontWeight: 700, fontSize: 15, padding: "14px 30px", borderRadius: 100, boxShadow: "0 10px 26px rgba(31,111,224,.42)" }}>▶ Continuar</button>
            <button type="button" onClick={onStartFromBeginning} style={{ cursor: "pointer", background: "rgba(255,255,255,.1)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(255,255,255,.16)", fontFamily: "'Manrope'", fontWeight: 600, fontSize: 15, padding: "14px 26px", borderRadius: 100 }}>Começar do início</button>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <div style={{ position: "relative", zIndex: 3, marginTop: -50, maxWidth: 1180, marginRight: "auto", padding: "0 44px 100px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 12, fontWeight: 600, color: "#8A93A5", marginBottom: 8 }}>Conteúdo do curso</div>
            <h2 style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 26, letterSpacing: "-.4px", margin: 0 }}>
              {modules.length} módulos, {modules.reduce((s, m) => s + m.count, 0)} aulas
            </h2>
          </div>
          <span style={{ fontSize: 14, color: "#8A93A5" }}>Clique em um módulo para ver as aulas</span>
        </div>

        <div className="modules-grid">
          {modules.map((mod, i) => (
            <ModuleCard key={mod.id} mod={mod} index={i} active={open === i} onToggle={() => setOpen((o) => (o === i ? -1 : i))} />
          ))}
        </div>

        {/* painel de aulas do módulo ativo */}
        <div className={`module-lessons${active ? " open" : ""}`}>
          <div className="ml-inner">
            {active && (
              <div style={{ marginTop: 18, background: "linear-gradient(160deg,#0E1119,#080A10)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, overflow: "hidden", boxShadow: "0 18px 50px rgba(31,111,224,.18)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".18em", fontSize: 11, fontWeight: 600, color: "#3b8bff" }}>Módulo {active.num}</span>
                    <span style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 19 }}>{active.title}</span>
                  </div>
                  <span style={{ fontSize: 13, color: "#8A93A5" }}>{active.count} aulas · {active.progress}%</span>
                </div>
                {active.lessons.map((ls) => (
                  <LessonRow key={ls.id} ls={ls} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
