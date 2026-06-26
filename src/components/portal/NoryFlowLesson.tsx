import { useState, type ReactNode } from "react";

/* ─────────────────────────────────────────────
   NoryFlowLesson — página de aula (skin "netflix"):
   layout "theater" (player real + abas) à esquerda e
   sidebar de aulas à direita. Identidade Nory.
   Convertido do template claude.ai/design
   "PAGINA PLAYER". O <player> e os corpos de
   arquivos/links são passados prontos (dados reais).
   ───────────────────────────────────────────── */

const ACCENT = "linear-gradient(105deg,#1f6fe0,#3b8bff)";
const BRAND = "linear-gradient(105deg,#1668FF,#34DE7E)";

export interface SidebarLesson {
  id: string;
  title: string;
  dur: string;
  status: "done" | "current" | "todo";
  onClick: () => void;
}
export interface SidebarModule {
  id: string;
  num: number;
  title: string;
  done: number;
  count: number;
  lessons: SidebarLesson[];
}

interface Props {
  tenantName: string;
  courseTitle: string;
  lessonTitle: string;
  lessonMeta: string; // "Aula 3 · Módulo 2 · Composição · 08:24"
  player: ReactNode;
  descriptionHtml?: string | null;
  filesNode?: ReactNode;
  hasFiles?: boolean;
  linksNode?: ReactNode;
  hasLinks?: boolean;
  coursePercent: number;
  modules: SidebarModule[];
  completed: boolean;
  onToggleComplete: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onBack: () => void;
  onSignOut: () => void;
}

const CSS = `
.nf-app .lesson-row{transition:background .18s;text-decoration:none;cursor:pointer;}
.nf-app .lesson-row:hover{background:rgba(255,255,255,.05)!important;}
.nf-app .tab{cursor:pointer;position:relative;padding-bottom:12px;transition:color .2s;}
.nf-app .tab:hover{color:#fff!important;}
.nf-app .sidebar-scroll{scrollbar-width:thin;scrollbar-color:rgba(148,166,194,.3) transparent;}
.nf-app .sidebar-scroll::-webkit-scrollbar{width:8px;}
.nf-app .sidebar-scroll::-webkit-scrollbar-thumb{background:rgba(148,166,194,.25);border-radius:6px;}
.nf-app .player-layout{display:grid;grid-template-columns:1fr 360px;gap:26px;align-items:start;}
@media(max-width:980px){.nf-app .player-layout{grid-template-columns:1fr;}.nf-app .course-sidebar{max-height:none!important;position:static!important;}}
.nf-app .nav-btn{transition:background .2s,border-color .2s;}
.nf-app .nav-btn:hover{background:rgba(255,255,255,.08)!important;border-color:rgba(255,255,255,.16)!important;}
.nf-app .nav-link:hover{color:#fff!important;}
`;

function SidebarRow({ ls }: { ls: SidebarLesson }) {
  const isCur = ls.status === "current";
  let statusStyle: React.CSSProperties = { flex: "0 0 22px", width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 };
  let icon = "○";
  let titleColor = "#8A93A5";
  let titleWeight = 500;
  if (ls.status === "done") {
    statusStyle = { ...statusStyle, background: "rgba(52,222,126,.16)", color: "#34DE7E", fontWeight: 700 };
    icon = "✓";
  } else if (isCur) {
    statusStyle = { flex: "0 0 24px", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, background: ACCENT, color: "#fff", boxShadow: "0 4px 12px rgba(31,111,224,.42)" };
    icon = "▶"; titleColor = "#fff"; titleWeight = 700;
  } else {
    statusStyle = { ...statusStyle, border: "1.5px solid rgba(255,255,255,.16)", color: "#8A93A5" };
  }
  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", ...(isCur ? { background: "rgba(31,111,224,.12)", boxShadow: "inset 3px 0 0 #3b8bff" } : {}) };
  return (
    <div className="lesson-row" onClick={ls.onClick} style={rowStyle}>
      <span style={statusStyle}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13.5, color: titleColor, fontWeight: titleWeight, lineHeight: 1.3 }}>{ls.title}</span>
      <span style={{ fontSize: 12, color: "#8A93A5", fontVariantNumeric: "tabular-nums" }}>{ls.dur}</span>
    </div>
  );
}

export function NoryFlowLesson({
  tenantName, courseTitle, lessonTitle, lessonMeta, player,
  descriptionHtml, filesNode, hasFiles, linksNode, hasLinks,
  coursePercent, modules, completed, onToggleComplete, onPrev, onNext, onBack, onSignOut,
}: Props) {
  const hasDesc = !!descriptionHtml;
  const firstTab: "desc" | "files" | "links" = hasDesc ? "desc" : hasFiles ? "files" : "links";
  const [tab, setTab] = useState<"desc" | "files" | "links">(firstTab);

  const tabStyle = (active: boolean): React.CSSProperties => ({ fontSize: 14, fontWeight: 600, color: active ? "#fff" : "#8A93A5" });
  const underline = (active: boolean): React.CSSProperties => ({ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, borderRadius: 2, background: ACCENT, display: active ? "block" : "none" });

  return (
    <div className="nf-app" style={{ minHeight: "100vh", background: "#07090E", color: "#fff", fontFamily: "'Manrope',system-ui,sans-serif" }}>
      <style>{CSS}</style>

      {/* TOP BAR */}
      <header style={{ position: "sticky", top: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", background: "rgba(7,9,14,.82)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button type="button" className="nav-btn" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 9, color: "#fff", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 100, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Manrope'" }}>← Voltar ao curso</button>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: BRAND, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora'", fontWeight: 800, fontSize: 14, color: "#fff" }}>N</div>
            <span style={{ fontFamily: "'Sora'", fontWeight: 600, fontSize: 15, color: "#8A93A5" }}>{courseTitle}</span>
          </div>
        </div>
        <button type="button" onClick={onSignOut} title="Sair" style={{ width: 36, height: 36, borderRadius: "50%", background: BRAND, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora'", fontWeight: 700, fontSize: 14, color: "#fff", boxShadow: "0 4px 14px rgba(31,111,224,.42)" }}>
          {tenantName.charAt(0).toUpperCase()}
        </button>
      </header>

      {/* BODY */}
      <div className="player-layout" style={{ maxWidth: 1320, margin: "0 auto", padding: "26px 32px 80px" }}>
        {/* MAIN */}
        <main>
          {/* video stage (player real) */}
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 16, overflow: "hidden", background: "radial-gradient(120% 130% at 50% 40%,#13203B,#06080D)", border: "1px solid rgba(255,255,255,.07)" }}>
            {player}
          </div>

          {/* título + meta */}
          <div style={{ marginTop: 22 }}>
            <div style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 11, fontWeight: 600, color: completed ? "#34DE7E" : "#34DE7E", marginBottom: 10 }}>
              {completed ? "Aula concluída" : "Aula em andamento"}
            </div>
            <h1 style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 30, letterSpacing: "-.6px", margin: "0 0 10px" }}>{lessonTitle}</h1>
            <div style={{ fontSize: 14, color: "#8A93A5" }}>{lessonMeta}</div>
          </div>

          {/* abas */}
          <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 24, borderBottom: "1px solid rgba(255,255,255,.07)" }}>
            {hasDesc && (
              <span className="tab" onClick={() => setTab("desc")} style={tabStyle(tab === "desc")}>Descrição<span style={underline(tab === "desc")} /></span>
            )}
            {hasFiles && (
              <span className="tab" onClick={() => setTab("files")} style={tabStyle(tab === "files")}>Arquivos<span style={underline(tab === "files")} /></span>
            )}
            {hasLinks && (
              <span className="tab" onClick={() => setTab("links")} style={tabStyle(tab === "links")}>Links<span style={underline(tab === "links")} /></span>
            )}
          </div>

          {/* corpo das abas */}
          <div style={{ marginTop: 22, minHeight: 140 }}>
            {tab === "desc" && hasDesc && (
              <div className="prose prose-invert max-w-[640px]" style={{ color: "#C2CADA" }} dangerouslySetInnerHTML={{ __html: descriptionHtml! }} />
            )}
            {tab === "files" && <div className="dark">{filesNode}</div>}
            {tab === "links" && <div className="dark">{linksNode}</div>}
          </div>

          {/* footer actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.07)", flexWrap: "wrap" }}>
            <button type="button" onClick={onToggleComplete} style={{ border: "none", cursor: "pointer", background: completed ? "rgba(52,222,126,.16)" : ACCENT, color: completed ? "#34DE7E" : "#fff", fontFamily: "'Manrope'", fontWeight: 700, fontSize: 15, padding: "14px 26px", borderRadius: 100, boxShadow: completed ? "none" : "0 10px 26px rgba(31,111,224,.42)", display: "flex", alignItems: "center", gap: 9 }}>
              {completed ? "✓ Aula concluída" : "✓ Concluir aula"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" className="nav-btn" onClick={onPrev} disabled={!onPrev} style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 100, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: onPrev ? "pointer" : "not-allowed", opacity: onPrev ? 1 : 0.4, fontFamily: "'Manrope'" }}>← Aula anterior</button>
              <button type="button" className="nav-btn" onClick={onNext} disabled={!onNext} style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 100, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: onNext ? "pointer" : "not-allowed", opacity: onNext ? 1 : 0.4, fontFamily: "'Manrope'" }}>Próxima aula →</button>
            </div>
          </div>
        </main>

        {/* SIDEBAR */}
        <aside className="course-sidebar" style={{ position: "sticky", top: 90, maxHeight: "calc(100vh - 110px)", background: "linear-gradient(160deg,#0E1119,#080A10)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 11, fontWeight: 600, color: "#8A93A5", marginBottom: 10 }}>Aulas do curso</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 100, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                <div style={{ width: `${coursePercent}%`, height: "100%", background: BRAND, borderRadius: 100 }} />
              </div>
              <span style={{ fontSize: 12, color: "#8A93A5", fontWeight: 600, whiteSpace: "nowrap" }}>{coursePercent}%</span>
            </div>
          </div>

          <div className="sidebar-scroll" style={{ overflowY: "auto", padding: "8px 0" }}>
            {modules.map((mod) => (
              <div key={mod.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 8px" }}>
                  <span style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".16em", fontSize: 11, fontWeight: 600, color: "#3b8bff" }}>Módulo {mod.num} · {mod.title}</span>
                  <span style={{ fontSize: 11, color: "#8A93A5" }}>{mod.done}/{mod.count}</span>
                </div>
                {mod.lessons.map((ls) => (
                  <SidebarRow key={ls.id} ls={ls} />
                ))}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
