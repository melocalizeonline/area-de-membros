import { Link } from "react-router-dom";
import {
  BookOpen,
  Wrench,
  Zap,
  ShieldCheck,
  PlayCircle,
  Users,
  ArrowRight,
  Check,
} from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

/* ─── Nory Members — Brand Identity ─── */
const NAVY = "#0A1326";
const SURFACE = "#111C33";
const BLUE = "#1668FF";
const GREEN = "#34DE7E";
const MUTED = "#94A6C2";
const LIGHT = "#E3E9F2";
const BORDER = "rgba(148,166,194,.14)";
const GRADIENT = "linear-gradient(105deg,#1668FF,#34DE7E)";
const FONT_HEAD = "'Sora',sans-serif";
const FONT_BODY = "'Manrope',sans-serif";
const FONT_LABEL = "'Space Grotesk',sans-serif";
const LOGO = "/brand/logo-nory-dark.png"; // versão branca, para fundo escuro

const FEATURES = [
  { icon: BookOpen, title: "Cursos completos", desc: "Módulos e aulas organizados, com player de vídeo, materiais e acompanhamento de progresso para cada aluno." },
  { icon: Wrench, title: "Ferramentas exclusivas", desc: "Muito além de cursos: libere ferramentas e serviços exclusivos (como gestão de hospedagem e e-mail) na mesma área." },
  { icon: Zap, title: "Acesso automático", desc: "Integre com seus checkouts e libere o acesso na hora da compra — ou conceda manualmente quando quiser." },
  { icon: ShieldCheck, title: "Conteúdo protegido", desc: "Vídeos com proteção e controle de acesso por produto e por usuário. Seu conteúdo seguro." },
  { icon: PlayCircle, title: "Multi-provedor de vídeo", desc: "Suporte a Gumlet, Panda, Vimeo, Wistia e YouTube — você escolhe onde hospedar." },
  { icon: Users, title: "Gestão de membros", desc: "Acompanhe clientes, pedidos e acessos em um painel completo, com importação e convites." },
];

const STEPS = [
  { n: "1", title: "O cliente compra", desc: "Pelo seu checkout favorito (ou você libera manualmente)." },
  { n: "2", title: "Acesso liberado", desc: "A integração libera o curso ou a ferramenta automaticamente." },
  { n: "3", title: "Ele acessa tudo", desc: "Cursos e ferramentas exclusivas em uma única área de membros." },
];

export default function LandingPage() {
  return (
    <div style={{ background: NAVY, color: LIGHT, fontFamily: FONT_BODY, minHeight: "100vh", overflowX: "hidden" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: `1px solid ${BORDER}`, background: "rgba(10,19,38,.72)", backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/sobre"><img src={LOGO} alt={BRAND_NAME} style={{ height: 26 }} /></Link>
          <Link to="/admin/login" style={{ background: GRADIENT, color: "#06122B", fontWeight: 700, fontSize: 14, padding: "10px 20px", borderRadius: 100 }}>
            Acessar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ position: "relative", padding: "120px 24px 100px", textAlign: "center" }}>
        <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 900, height: 900, background: "radial-gradient(circle,rgba(22,104,255,.20),transparent 60%)", filter: "blur(20px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle,rgba(52,222,126,.15),transparent 60%)", filter: "blur(20px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 880, margin: "0 auto" }}>
          <div style={{ fontFamily: FONT_LABEL, fontSize: 13, letterSpacing: ".32em", textTransform: "uppercase", color: GREEN, fontWeight: 500, marginBottom: 28 }}>
            Cursos + ferramentas exclusivas
          </div>
          <h1 style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: "clamp(40px,7vw,68px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            A sua área de membros,{" "}
            <span style={{ background: GRADIENT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>completa</span>.
          </h1>
          <p style={{ margin: "28px auto 0", maxWidth: 620, fontSize: 18, lineHeight: 1.7, color: MUTED }}>
            A {BRAND_NAME} reúne seus cursos e ferramentas exclusivas em um só lugar, com acesso liberado
            automaticamente pelos seus checkouts ou manualmente para cada cliente.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 44 }}>
            <Link to="/admin/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GRADIENT, color: "#06122B", fontWeight: 700, fontSize: 15, padding: "14px 26px", borderRadius: 14 }}>
              Acessar plataforma <ArrowRight size={18} />
            </Link>
            <a href="#recursos" style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${BORDER}`, color: LIGHT, fontWeight: 600, fontSize: 15, padding: "14px 26px", borderRadius: 14 }}>
              Conhecer recursos
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" style={{ borderTop: `1px solid ${BORDER}`, padding: "88px 24px" }}>
        <div className="mx-auto max-w-6xl">
          <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto" }}>
            <h2 style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(28px,4vw,38px)", letterSpacing: "-0.02em" }}>
              Tudo o que você precisa para entregar valor
            </h2>
            <p style={{ marginTop: 12, color: MUTED }}>Uma plataforma pensada para vender e entregar cursos e serviços digitais.</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 26 }}>
                <div style={{ display: "flex", height: 46, width: 46, alignItems: "center", justifyContent: "center", borderRadius: 14, background: "rgba(52,222,126,.12)", color: GREEN }}>
                  <f.icon size={22} />
                </div>
                <h3 style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 19, marginTop: 18 }}>{f.title}</h3>
                <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.6, color: MUTED }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderTop: `1px solid ${BORDER}`, background: "linear-gradient(150deg,#0A1326,#102347)", padding: "88px 24px" }}>
        <div className="mx-auto max-w-5xl">
          <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto" }}>
            <h2 style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(28px,4vw,38px)", letterSpacing: "-0.02em" }}>Como funciona</h2>
            <p style={{ marginTop: 12, color: MUTED }}>Da compra ao acesso, sem fricção.</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 26 }}>
                <div style={{ display: "flex", height: 38, width: 38, alignItems: "center", justifyContent: "center", borderRadius: 100, background: GRADIENT, color: "#06122B", fontFamily: FONT_HEAD, fontWeight: 700 }}>{s.n}</div>
                <h3 style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 18, marginTop: 18 }}>{s.title}</h3>
                <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.6, color: MUTED }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "96px 24px" }}>
        <div className="mx-auto max-w-4xl">
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 28, border: `1px solid ${BORDER}`, background: "linear-gradient(160deg,#111C33,#0A1326)", padding: "64px 32px", textAlign: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(50% 80% at 50% 0%,rgba(22,104,255,.18),transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <h2 style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.02em" }}>Pronto para começar?</h2>
              <p style={{ margin: "16px auto 0", maxWidth: 520, color: MUTED }}>
                Entre na sua conta e comece a montar sua área de membros com cursos e ferramentas exclusivas.
              </p>
              <div style={{ marginTop: 32 }}>
                <Link to="/admin/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GRADIENT, color: "#06122B", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 14 }}>
                  Acessar agora <ArrowRight size={18} />
                </Link>
              </div>
              <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", justifyContent: "center", marginTop: 32, fontSize: 14, color: MUTED, listStyle: "none" }}>
                {["Cursos ilimitados", "Ferramentas exclusivas", "Acesso automático"].map((item) => (
                  <li key={item} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Check size={16} color={GREEN} /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "40px 24px" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row" style={{ fontSize: 14, color: MUTED }}>
          <span>© {BRAND_NAME}</span>
          <div style={{ display: "flex", gap: 24 }}>
            <Link to="/privacy" style={{ color: MUTED }}>Privacidade</Link>
            <Link to="/terms" style={{ color: MUTED }}>Termos</Link>
            <a href="mailto:members@nory.com.br" style={{ color: MUTED }}>Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
