import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Play } from "lucide-react";
import { WorkspaceAvatar } from "@/components/admin/WorkspaceAvatar";

/* ─────────────────────────────────────────────
   NoryFlowLesson — página de aula (skin "netflix"):
   layout "theater" (player real + abas) à esquerda e
   sidebar de aulas à direita. Identidade Nory.
   Convertido do template claude.ai/design
   "PAGINA PLAYER". O <player> e os corpos de
   arquivos/links são passados prontos (dados reais).
   ───────────────────────────────────────────── */

const ACCENT = "var(--nf-accent)";
const DEFAULT_ACCENT = "linear-gradient(105deg,#1668D9,#1E84FF)";
const BRAND = "linear-gradient(105deg,#1668D9,#2BE0A1)";

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
  iconUrl?: string | null;
  iconName?: string | null;
  iconColor?: string | null;
  accent?: string | null;
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
.nf-app{--nf-gut:clamp(16px,4vw,32px);}
.nf-app .nf-top{padding:14px var(--nf-gut);}
.nf-app .nf-body{padding:clamp(18px,3vw,26px) var(--nf-gut) 80px;}
.nf-app .lesson-row{transition:background .18s;text-decoration:none;cursor:pointer;}
.nf-app .lesson-row:hover{background:rgba(255,255,255,.05)!important;}
.nf-app .tab{cursor:pointer;position:relative;padding:0 0 12px;background:none;border:none;font:inherit;transition:color .2s;}
.nf-app .tab:hover{color:#fff!important;}
.nf-app .tab:focus-visible,.nf-app .nav-btn:focus-visible,.nf-app .nf-cta:focus-visible,.nf-app .lesson-row:focus-visible,.nf-app .nf-icon-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(30,132,255,.7);}
.nf-app .sidebar-scroll{scrollbar-width:thin;scrollbar-color:rgba(148,166,194,.3) transparent;}
.nf-app .sidebar-scroll::-webkit-scrollbar{width:8px;}
.nf-app .sidebar-scroll::-webkit-scrollbar-thumb{background:rgba(148,166,194,.25);border-radius:6px;}
.nf-app .player-layout{display:grid;grid-template-columns:1fr 360px;gap:26px;align-items:start;}
@media(max-width:980px){.nf-app .player-layout{grid-template-columns:1fr;}.nf-app .course-sidebar{max-height:none!important;position:static!important;}}
@media(max-width:560px){.nf-app .nf-back-label{display:none;}.nf-app .nf-footer-nav{width:100%;}.nf-app .nf-footer-nav .nav-btn{flex:1;justify-content:center;}}
.nf-app .nav-btn{transition:background .2s,border-color .2s;}
.nf-app .nav-btn:hover{background:rgba(255,255,255,.08)!important;border-color:rgba(255,255,255,.16)!important;}
.nf-app .nav-link:hover{color:#fff!important;}
@media(prefers-reduced-motion:reduce){.nf-app *{transition:none!important;animation:none!important;}}
`;

function SidebarRow({ ls }: { ls: SidebarLesson }) {
  const isCur = ls.status === "current";
  let statusStyle: React.CSSProperties = { flex: "0 0 22px", width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 };
  let statusIcon: React.ReactNode = null;
  let titleColor = "#9AA6BC";
  let titleWeight = 500;
  if (ls.status === "done") {
    statusStyle = { ...statusStyle, background: "rgba(52,222,126,.16)", color: "#2BE0A1", fontWeight: 700 };
    statusIcon = <Check className="size-3" aria-hidden="true" />;
  } else if (isCur) {
    statusStyle = { flex: "0 0 24px", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: ACCENT, color: "#fff", boxShadow: "0 4px 12px rgba(30,132,255,.42)" };
    statusIcon = <Play className="size-2.5" style={{ marginLeft: 1 }} aria-hidden="true" />; titleColor = "#fff"; titleWeight = 700;
  } else {
    statusStyle = { ...statusStyle, border: "1.5px solid rgba(255,255,255,.16)", color: "#9AA6BC" };
  }
  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", ...(isCur ? { background: "rgba(31,111,224,.12)", boxShadow: "inset 3px 0 0 #1E84FF" } : {}) };
  return (
    <div
      className="lesson-row"
      onClick={ls.onClick}
      role="button"
      tabIndex={0}
      aria-label={`${ls.title}${isCur ? " (atual)" : ""}`}
      aria-current={isCur ? "true" : undefined}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ls.onClick(); } }}
      style={rowStyle}
    >
      <span style={statusStyle}>{statusIcon}</span>
      <span style={{ flex: 1, fontSize: 13.5, color: titleColor, fontWeight: titleWeight, lineHeight: 1.3 }}>{ls.title}</span>
      <span style={{ fontSize: 12, color: "#9AA6BC", fontVariantNumeric: "tabular-nums" }}>{ls.dur}</span>
    </div>
  );
}

export function NoryFlowLesson({
  tenantName, iconUrl, iconName, iconColor, accent, courseTitle, lessonTitle, lessonMeta, player,
  descriptionHtml, filesNode, hasFiles, linksNode, hasLinks,
  coursePercent, modules, completed, onToggleComplete, onPrev, onNext, onBack, onSignOut,
}: Props) {
  const accentVal = accent || DEFAULT_ACCENT;
  const hasDesc = !!descriptionHtml;
  const firstTab: "desc" | "files" | "links" = hasDesc ? "desc" : hasFiles ? "files" : "links";
  const [tab, setTab] = useState<"desc" | "files" | "links">(firstTab);

  const tabStyle = (active: boolean): React.CSSProperties => ({ fontSize: 14, fontWeight: 600, color: active ? "#fff" : "#9AA6BC" });
  const underline = (active: boolean): React.CSSProperties => ({ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, borderRadius: 2, background: ACCENT, display: active ? "block" : "none" });

  return (
    <div className="nf-app" style={{ minHeight: "100vh", background: "#0B0F1A", color: "#fff", fontFamily: "'Manrope',system-ui,sans-serif", ["--nf-accent" as string]: accentVal } as React.CSSProperties}>
      <style>{CSS}</style>

      {/* TOP BAR */}
      <header className="nf-top" style={{ position: "sticky", top: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "rgba(7,9,14,.82)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
          <button type="button" className="nav-btn" onClick={onBack} aria-label="Voltar ao curso" style={{ display: "flex", alignItems: "center", gap: 9, color: "#fff", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 100, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Manrope'", flex: "0 0 auto" }}><ArrowLeft className="size-4" aria-hidden="true" /><span className="nf-back-label">Voltar ao curso</span></button>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <WorkspaceAvatar iconUrl={iconUrl} iconName={iconName} iconColor={iconColor} size="sm" />
            <span style={{ fontFamily: "'Sora'", fontWeight: 600, fontSize: 15, color: "#9AA6BC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{courseTitle}</span>
          </div>
        </div>
        <button type="button" className="nf-icon-btn" onClick={onSignOut} aria-label="Sair" title="Sair" style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--nf-accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora'", fontWeight: 700, fontSize: 14, color: "#fff", boxShadow: "0 4px 14px rgba(30,132,255,.42)", flex: "0 0 auto" }}>
          {tenantName.charAt(0).toUpperCase()}
        </button>
      </header>

      {/* BODY */}
      <div className="player-layout nf-body" style={{ maxWidth: 1320, margin: "0 auto" }}>
        {/* MAIN */}
        <main>
          {/* video stage (player real) */}
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 16, overflow: "hidden", background: "radial-gradient(120% 130% at 50% 40%,#13203B,#06080D)", border: "1px solid rgba(255,255,255,.07)" }}>
            {player}
          </div>

          {/* título + meta */}
          <div style={{ marginTop: 22 }}>
            <div style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 11, fontWeight: 600, color: completed ? "#2BE0A1" : "#2BE0A1", marginBottom: 10 }}>
              {completed ? "Aula concluída" : "Aula em andamento"}
            </div>
            <h1 style={{ fontFamily: "'Sora'", fontWeight: 700, fontSize: 30, letterSpacing: "-.6px", margin: "0 0 10px" }}>{lessonTitle}</h1>
            <div style={{ fontSize: 14, color: "#9AA6BC" }}>{lessonMeta}</div>
          </div>

          {/* abas */}
          <div role="tablist" style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 24, borderBottom: "1px solid rgba(255,255,255,.07)" }}>
            {hasDesc && (
              <button type="button" role="tab" aria-selected={tab === "desc"} className="tab" onClick={() => setTab("desc")} style={tabStyle(tab === "desc")}>Descrição<span style={underline(tab === "desc")} /></button>
            )}
            {hasFiles && (
              <button type="button" role="tab" aria-selected={tab === "files"} className="tab" onClick={() => setTab("files")} style={tabStyle(tab === "files")}>Arquivos<span style={underline(tab === "files")} /></button>
            )}
            {hasLinks && (
              <button type="button" role="tab" aria-selected={tab === "links"} className="tab" onClick={() => setTab("links")} style={tabStyle(tab === "links")}>Links<span style={underline(tab === "links")} /></button>
            )}
          </div>

          {/* corpo das abas */}
          <div style={{ marginTop: 22, minHeight: 140 }}>
            {tab === "desc" && hasDesc && (
              <div className="prose prose-invert max-w-[640px]" style={{ color: "#C3CEDD" }} dangerouslySetInnerHTML={{ __html: descriptionHtml! }} />
            )}
            {tab === "files" && <div className="dark">{filesNode}</div>}
            {tab === "links" && <div className="dark">{linksNode}</div>}
          </div>

          {/* footer actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.07)", flexWrap: "wrap" }}>
            <button type="button" className="nf-cta" onClick={onToggleComplete} aria-pressed={completed} style={{ border: "none", cursor: "pointer", background: completed ? "rgba(52,222,126,.16)" : ACCENT, color: completed ? "#2BE0A1" : "#fff", fontFamily: "'Manrope'", fontWeight: 700, fontSize: 15, padding: "14px 26px", borderRadius: 100, boxShadow: completed ? "none" : "0 10px 26px rgba(30,132,255,.42)", display: "flex", alignItems: "center", gap: 9 }}>
              <Check className="size-4" aria-hidden="true" /> {completed ? "Aula concluída" : "Concluir aula"}
            </button>
            <div className="nf-footer-nav" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" className="nav-btn" onClick={onPrev} disabled={!onPrev} style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 100, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: onPrev ? "pointer" : "not-allowed", opacity: onPrev ? 1 : 0.4, fontFamily: "'Manrope'" }}><ArrowLeft className="size-4" aria-hidden="true" /> Aula anterior</button>
              <button type="button" className="nav-btn" onClick={onNext} disabled={!onNext} style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 100, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: onNext ? "pointer" : "not-allowed", opacity: onNext ? 1 : 0.4, fontFamily: "'Manrope'" }}>Próxima aula <ArrowRight className="size-4" aria-hidden="true" /></button>
            </div>
          </div>
        </main>

        {/* SIDEBAR */}
        <aside className="course-sidebar" style={{ position: "sticky", top: 90, maxHeight: "calc(100vh - 110px)", background: "linear-gradient(160deg,#141A29,#0E1422)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 11, fontWeight: 600, color: "#9AA6BC", marginBottom: 10 }}>Aulas do curso</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div role="progressbar" aria-valuenow={coursePercent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do curso" style={{ flex: 1, height: 5, borderRadius: 100, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                <div style={{ width: `${coursePercent}%`, height: "100%", background: BRAND, borderRadius: 100 }} />
              </div>
              <span style={{ fontSize: 12, color: "#9AA6BC", fontWeight: 600, whiteSpace: "nowrap" }}>{coursePercent}%</span>
            </div>
          </div>

          <div className="sidebar-scroll" style={{ overflowY: "auto", padding: "8px 0" }}>
            {modules.map((mod) => (
              <div key={mod.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 8px" }}>
                  <span style={{ fontFamily: "'Space Grotesk'", textTransform: "uppercase", letterSpacing: ".16em", fontSize: 11, fontWeight: 600, color: "#1E84FF" }}>Módulo {mod.num} · {mod.title}</span>
                  <span style={{ fontSize: 11, color: "#9AA6BC" }}>{mod.done}/{mod.count}</span>
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
