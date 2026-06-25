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
import { Button } from "@/components/ui/button";
import { BRAND_NAME, BRAND_LOGO_DARK, BRAND_LOGO_LIGHT } from "@/lib/brand";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Cursos completos",
    desc: "Módulos e aulas organizados, com player de vídeo, materiais e acompanhamento de progresso para cada aluno.",
  },
  {
    icon: Wrench,
    title: "Ferramentas exclusivas",
    desc: "Muito além de cursos: libere ferramentas e serviços exclusivos (como gestão de hospedagem e e-mail) dentro da mesma área.",
  },
  {
    icon: Zap,
    title: "Acesso automático",
    desc: "Integre com seus checkouts e libere o acesso na hora da compra — ou conceda manualmente quando quiser.",
  },
  {
    icon: ShieldCheck,
    title: "Conteúdo protegido",
    desc: "Vídeos com proteção, controle de acesso por produto e por usuário. Seu conteúdo seguro.",
  },
  {
    icon: PlayCircle,
    title: "Multi-provedor de vídeo",
    desc: "Suporte a Gumlet, Panda, Vimeo, Wistia e YouTube — você escolhe onde hospedar.",
  },
  {
    icon: Users,
    title: "Gestão de membros",
    desc: "Acompanhe clientes, pedidos e acessos em um painel completo, com importação e convites.",
  },
];

const STEPS = [
  { n: "1", title: "O cliente compra", desc: "Pelo seu checkout favorito (ou você libera manualmente)." },
  { n: "2", title: "Acesso liberado", desc: "A integração libera o curso ou a ferramenta automaticamente." },
  { n: "3", title: "Ele acessa tudo", desc: "Cursos e ferramentas exclusivas em uma única área de membros." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/sobre" className="shrink-0">
            <img src={BRAND_LOGO_DARK} alt={BRAND_NAME} className="h-6 dark:hidden" />
            <img src={BRAND_LOGO_LIGHT} alt={BRAND_NAME} className="hidden h-6 dark:block" />
          </Link>
          <Button asChild>
            <Link to="/admin/login">Acessar</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(124,58,237,0.18),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
            Cursos + ferramentas exclusivas
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
            A sua área de membros, <span className="text-[#7C3AED]">completa</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            A {BRAND_NAME} reúne seus cursos e ferramentas exclusivas em um só lugar, com acesso
            liberado automaticamente pelos seus checkouts ou manualmente para cada cliente.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild className="gap-2">
              <Link to="/admin/login">
                Acessar plataforma <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <a href="#recursos">Conhecer recursos</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="border-t border-border/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Tudo o que você precisa para entregar valor</h2>
            <p className="mt-3 text-muted-foreground">
              Uma plataforma pensada para vender e entregar cursos e serviços digitais.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 transition hover:border-[#7C3AED]/50 hover:shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED]">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Como funciona</h2>
            <p className="mt-3 text-muted-foreground">Da compra ao acesso, sem fricção.</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7C3AED] text-sm font-semibold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,rgba(124,58,237,0.15),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pronto para começar?</h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Entre na sua conta e comece a montar sua área de membros com cursos e ferramentas exclusivas.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild className="gap-2">
                  <Link to="/admin/login">
                    Acessar agora <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <ul className="mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["Cursos ilimitados", "Ferramentas exclusivas", "Acesso automático"].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-[#7C3AED]" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {BRAND_NAME}</span>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-foreground">Privacidade</Link>
            <Link to="/terms" className="hover:text-foreground">Termos</Link>
            <a href="mailto:members@nory.com.br" className="hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
