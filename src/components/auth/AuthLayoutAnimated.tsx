import { useState, useEffect, useRef, ReactNode } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BRAND_NAME, BRAND_LOGO_DARK, BRAND_LOGO_LIGHT } from "@/lib/brand";
import { StudentJourneyScene } from "./StudentJourneyScene";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/* ─────────────────────────────────────────────
   Personagens Nory — PNGs do mascote (corpo fixo).
   Os olhos originais foram apagados da arte; aqui
   desenhamos olhos "vivos" por cima, na posição
   detectada (fração da imagem). Eles seguem o
   mouse e piscam de forma aleatória.
   Palco: 550×400, alinhado na base.
   ───────────────────────────────────────────── */
const STAGE_W = 550;
const STAGE_H = 400;

interface Eye {
  x: number; // centro X (fração da largura da imagem)
  y: number; // centro Y (fração da altura da imagem)
  w: number; // largura do olho (fração)
  h: number; // altura do olho (fração)
}

interface CharDef {
  key: string;
  src: string;
  width: number; // largura exibida (px)
  left: number;
  bottom: number;
  z: number;
  eyes: Eye[];
}

const CHARACTERS: CharDef[] = [
  // fila de trás
  {
    key: "roxo", src: "/brand/characters/nory-roxo.webp", width: 188, left: 78, bottom: 58, z: 1,
    eyes: [
      { x: 0.362, y: 0.3106, w: 0.1457, h: 0.1022 },
      { x: 0.6518, y: 0.3304, w: 0.1549, h: 0.1444 },
    ],
  },
  {
    key: "preto", src: "/brand/characters/nory-preto.webp", width: 150, left: 272, bottom: 70, z: 2,
    eyes: [
      { x: 0.3667, y: 0.3263, w: 0.1546, h: 0.134 },
      { x: 0.6465, y: 0.3269, w: 0.1635, h: 0.1432 },
    ],
  },
  // fila da frente
  {
    key: "laranja", src: "/brand/characters/nory-laranja.webp", width: 215, left: 36, bottom: 0, z: 3,
    eyes: [
      { x: 0.3855, y: 0.3312, w: 0.155, h: 0.1737 },
      { x: 0.6728, y: 0.3354, w: 0.1481, h: 0.1765 },
    ],
  },
  {
    key: "amarelo", src: "/brand/characters/nory-amarelo.webp", width: 168, left: 372, bottom: 0, z: 3,
    eyes: [
      { x: 0.3701, y: 0.2886, w: 0.1339, h: 0.0949 },
      { x: 0.6488, y: 0.2987, w: 0.137, h: 0.1177 },
    ],
  },
  // bebê azul — centro da frente
  {
    key: "azul", src: "/brand/characters/nory-azul.webp", width: 140, left: 240, bottom: 0, z: 5,
    eyes: [
      { x: 0.3522, y: 0.3621, w: 0.1551, h: 0.1649 },
      { x: 0.6551, y: 0.3606, w: 0.1609, h: 0.1679 },
    ],
  },
];

// fator de cobertura da esclera (cobre a marca do olho apagado)
const SCLERA_SCALE = 1.18;

/* Bolhas decorativas animadas (cores da marca) */
const BUBBLE_COLORS = ["#7C5CFF", "#3BA8FF", "#36D399", "#FF9B4D", "#F5D44A"];

/* ─────────────────────────────────────────────
   Hook — piscar aleatório
   ───────────────────────────────────────────── */
function useRandomBlink() {
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 140);
      }, Math.random() * 4000 + 2500);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);
  return blinking;
}

/* ─────────────────────────────────────────────
   LiveEye — esclera branca + pupila que segue o
   mouse, sobre a posição do olho original.
   ───────────────────────────────────────────── */
function LiveEye({ eye, mouseX, mouseY, blinking }: { eye: Eye; mouseX: number; mouseY: number; blinking: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  // direção/deslocamento da pupila em px (limitado dentro da esclera)
  const offset = (() => {
    const el = ref.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = mouseX - cx;
    const dy = mouseY - cy;
    const angle = Math.atan2(dy, dx);
    const max = r.width * 0.17;
    const dist = Math.min(Math.hypot(dx, dy), max);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  })();

  return (
    <div
      ref={ref}
      className="absolute"
      style={{
        left: `${eye.x * 100}%`,
        top: `${eye.y * 100}%`,
        width: `${eye.w * SCLERA_SCALE * 100}%`,
        height: `${eye.h * SCLERA_SCALE * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* fecha como pálpebra (de cima para baixo) ao piscar */}
      <div
        className="w-full h-full"
        style={{
          transformOrigin: "center top",
          transform: `scaleY(${blinking ? 0.08 : 1})`,
          transition: "transform 0.1s ease",
        }}
      >
        {/* esclera */}
        <div
          className="relative w-full h-full rounded-full bg-white overflow-hidden"
          style={{ boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.18)" }}
        >
          {/* pupila */}
          <div
            className="absolute rounded-full"
            style={{
              width: "56%",
              height: "56%",
              left: "50%",
              top: "50%",
              backgroundColor: "#23263a",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              transition: "transform 0.12s ease-out",
            }}
          >
            {/* brilho */}
            <div
              className="absolute rounded-full bg-white/90"
              style={{ width: "30%", height: "30%", left: "18%", top: "16%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Character — corpo fixo + olhos vivos
   ───────────────────────────────────────────── */
function Character({ def, mouseX, mouseY }: { def: CharDef; mouseX: number; mouseY: number }) {
  const blinking = useRandomBlink();
  return (
    <div className="absolute" style={{ left: def.left, bottom: def.bottom, width: def.width, zIndex: def.z }}>
      <div className="relative">
        <img src={def.src} alt="" draggable={false} className="block w-full h-auto select-none" />
        {def.eyes.map((eye, i) => (
          <LiveEye key={i} eye={eye} mouseX={mouseX} mouseY={mouseY} blinking={blinking} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AnimatedCharacters — cena no painel esquerdo
   ───────────────────────────────────────────── */
export interface CharacterState {
  /** campo de email focado */
  isTypingEmail: boolean;
  /** campo de senha focado */
  isTypingPassword: boolean;
  /** senha visível (olho aberto) */
  showPassword: boolean;
  /** senha já tem valor */
  hasPassword: boolean;
}

/** Cena legada das geleias — preservada (não renderizada por padrão). */
export function AnimatedCharacters(_state: CharacterState) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // bolhas geradas uma única vez (posições estáveis)
  const [bubbles] = useState(() =>
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 8 + 4,
      color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
      dur: Math.random() * 3 + 3,
      delay: Math.random() * 4,
    })),
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div className="relative" style={{ width: STAGE_W, height: STAGE_H }}>
      {/* bolhas animadas */}
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="absolute rounded-full animate-bubble-float"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: b.size,
            height: b.size,
            backgroundColor: b.color,
            animationDuration: `${b.dur}s`,
            animationDelay: `${b.delay}s`,
            filter: "blur(0.3px)",
          }}
        />
      ))}

      {/* personagens (corpo fixo, olhos vivos) */}
      {CHARACTERS.map((def) => (
        <Character key={def.key} def={def} mouseX={mouse.x} mouseY={mouse.y} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   AuthLayoutAnimated — layout split-screen
   Esquerda: personagens | Direita: formulário
   ───────────────────────────────────────────── */
export interface AuthLayoutAnimatedProps {
  children: ReactNode;
  characterState?: CharacterState;
}

export function AuthLayoutAnimated({
  children,
  characterState = {
    isTypingEmail: false,
    isTypingPassword: false,
    showPassword: false,
    hasPassword: false,
  },
}: AuthLayoutAnimatedProps) {
  return (
    <div translate="no" className="min-h-screen grid lg:grid-cols-2 notranslate">
      {/* ═══ Painel esquerdo — personagens ═══ */}
      <div className="relative hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-foreground/90 via-foreground to-foreground/80 p-12 text-background">
        {/* Logo */}
        <div className="absolute top-12 left-12 z-20">
          <div className="flex items-center gap-2">
            <img
              src={BRAND_LOGO_DARK}
              alt={BRAND_NAME}
              width={150}
              height={48}
              className="h-12 w-auto hidden dark:block"
            />
            <img
              src={BRAND_LOGO_LIGHT}
              alt={BRAND_NAME}
              width={150}
              height={48}
              className="h-12 w-auto dark:hidden"
            />
          </div>
        </div>

        {/* Jornada do aluno (Framer Motion) */}
        <div className="relative z-20 flex items-center justify-center">
          <StudentJourneyScene />
        </div>


        {/* Elementos decorativos */}
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:20px_20px]" />
        <div className="absolute top-1/4 right-1/4 size-64 bg-background/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-96 bg-background/5 rounded-full blur-3xl" />
      </div>

      {/* ═══ Painel direito — formulário ═══ */}
      <div className="flex items-center justify-center p-8 bg-background relative">
        {/* Logo mobile */}
        <div className="lg:hidden fixed top-0 left-0 z-10 p-6">
          <img
            src={BRAND_LOGO_LIGHT}
            alt={BRAND_NAME}
            className="h-10 w-auto hidden dark:block"
          />
          <img
            src={BRAND_LOGO_DARK}
            alt={BRAND_NAME}
            className="h-10 w-auto dark:hidden"
          />
        </div>

        {/* Theme + Language Switcher */}
        <div className="fixed top-0 right-0 z-10 p-6">
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>

        {/* Conteúdo do formulário */}
        <div className="w-full max-w-[420px] space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
