import { useEffect, useState } from "react";
import { motion, AnimatePresence, animate, useReducedMotion } from "framer-motion";
import { Play, Award } from "lucide-react";

/* ─────────────────────────────────────────────
   StudentJourneyScene — jornada do aluno em loop
   (aula em andamento → concluída → progresso →
   certificado), com a IDENTIDADE NORY MEMBERS:
   navy #0A1326, gradiente azul→verde, Sora/Manrope/
   Space Grotesk. Cards flutuantes, luz sutil.
   ───────────────────────────────────────────── */

const C = {
  navy: "#0A1326",
  surface: "#111C33",
  blue: "#1668FF",
  green: "#34DE7E",
  teal: "#00C2CB",
  text2: "#CDD8E8",
  muted: "#94A6C2",
  border: "rgba(148,166,194,.22)",
  grad: "linear-gradient(105deg,#1668FF,#34DE7E)",
  gradTeal: "linear-gradient(105deg,#1668FF,#00C2CB 52%,#34DE7E)",
  cardBg: "linear-gradient(160deg,#1A2C50,#0D1A31)",
};
const FONT = {
  display: "'Sora',sans-serif",
  body: "'Manrope',sans-serif",
  label: "'Space Grotesk',sans-serif",
};

const STEP_MS = 4000;
const STEPS = 4;
const GLOW = [C.blue, C.green, C.teal, C.green];
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const eyebrow = (color = C.green) =>
  ({
    fontFamily: FONT.label,
    color,
    letterSpacing: ".22em",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
  }) as const;
const title = { fontFamily: FONT.display, color: "#fff", fontWeight: 700 } as const;
const sub = { fontFamily: FONT.body, color: C.muted } as const;

export function StudentJourneyScene() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS), STEP_MS);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="relative grid h-[520px] w-[420px] place-items-center" style={{ fontFamily: FONT.body }}>
      {/* palco navy (spotlight) — contraste em qualquer tema */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[40px]"
        style={{
          background:
            "radial-gradient(ellipse 82% 72% at 50% 46%, #0A1326 0%, rgba(10,19,38,.95) 46%, rgba(10,19,38,0) 78%)",
        }}
      />

      {/* glow da marca que muda por etapa */}
      <motion.div
        className="pointer-events-none absolute h-[360px] w-[360px] rounded-full"
        style={{ filter: "blur(90px)" }}
        animate={{ backgroundColor: GLOW[step], opacity: 0.34 }}
        transition={{ duration: 1 }}
      />

      <motion.div
        className="relative"
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* cards-fantasma (profundidade) */}
        <div
          className="absolute left-1/2 top-1/2 -z-10 h-[380px] w-[300px] -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-[22px]"
          style={{ background: "rgba(19,32,59,.55)", border: `1px solid ${C.border}` }}
        />
        <div
          className="absolute left-1/2 top-1/2 -z-10 h-[380px] w-[300px] -translate-x-1/2 -translate-y-1/2 rotate-[5deg] rounded-[22px]"
          style={{ background: "rgba(19,32,59,.4)", border: `1px solid ${C.border}` }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -26, scale: 0.96 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="w-[332px] p-5"
            style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderRadius: 22,
              boxShadow:
                "0 30px 70px -22px rgba(0,0,0,.8), 0 0 60px -16px rgba(22,104,255,.4), inset 0 1px 0 rgba(255,255,255,.1)",
            }}
          >
            {step === 0 && <LessonPlaying />}
            {step === 1 && <LessonDone />}
            {step === 2 && <ModuleProgress />}
            {step === 3 && <Certificate />}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* indicador de etapas */}
      <div className="absolute bottom-3 flex gap-2">
        {Array.from({ length: STEPS }).map((_, i) => (
          <motion.span
            key={i}
            className="h-1.5 rounded-full"
            animate={{
              width: i === step ? 22 : 6,
              background: i === step ? C.grad : "rgba(148,166,194,.3)",
            }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Etapa 1: aula em andamento ── */
function LessonPlaying() {
  return (
    <div className="flex h-[360px] flex-col">
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ ...eyebrow(C.green), background: "rgba(52,222,126,.12)", letterSpacing: ".12em" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.green }} /> Em andamento
        </span>
        <span style={{ ...sub, fontSize: 12 }}>Aula 3 de 12</span>
      </div>

      {/* player */}
      <div
        className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(160deg,#0C1729,#0A1326)", border: `1px solid ${C.border}` }}
      >
        <div className="absolute inset-0 opacity-15 [background:repeating-linear-gradient(90deg,#94A6C2_0_1px,transparent_1px_38px)]" />
        <div
          className="absolute -left-6 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle,#1668FF,transparent 70%)", filter: "blur(20px)" }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <motion.div
            className="grid h-14 w-14 place-items-center rounded-full"
            style={{ background: "#fff", boxShadow: "0 8px 24px rgba(22,104,255,.4)" }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Play className="h-6 w-6 translate-x-0.5" style={{ fill: C.navy, color: C.navy }} />
          </motion.div>
        </div>
      </div>

      <h3 className="mt-4 text-base" style={title}>
        Fundamentos do Design
      </h3>
      <p className="text-sm" style={sub}>
        Hierarquia visual e composição
      </p>

      <div className="mt-auto">
        <div className="mb-1.5 flex justify-between text-xs" style={sub}>
          <span>12:30</span>
          <span>18:45</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(148,166,194,.15)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: C.grad }}
            initial={{ width: "28%" }}
            animate={{ width: "70%" }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Etapa 2: aula concluída ── */
function LessonDone() {
  return (
    <div className="flex h-[360px] flex-col items-center justify-center text-center">
      <motion.div
        className="grid h-20 w-20 place-items-center rounded-full"
        style={{ background: "rgba(52,222,126,.14)", border: `1px solid rgba(52,222,126,.3)` }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 13 }}
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10">
          <motion.path
            d="M5 13l4 4L19 7"
            fill="none"
            stroke={C.green}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          />
        </svg>
      </motion.div>

      <h3 className="mt-5 text-lg" style={title}>
        Aula concluída!
      </h3>
      <p className="mt-1 text-sm" style={sub}>
        Parabéns, você concluiu a aula.
      </p>

      <div className="mt-6 w-full max-w-[230px]">
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(148,166,194,.15)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: C.grad }}
            initial={{ width: "70%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          />
        </div>
        <p className="mt-2 text-xs" style={{ ...eyebrow(C.green), letterSpacing: ".08em" }}>
          100% concluído
        </p>
      </div>
    </div>
  );
}

/* ── Etapa 3: progresso do módulo ── */
function ModuleProgress() {
  return (
    <div className="flex h-[360px] flex-col">
      <span style={eyebrow(C.teal)}>Módulo 2</span>
      <h3 className="mt-1.5 text-base" style={title}>
        Seu progresso
      </h3>

      <div className="mt-5 flex items-center gap-5">
        <CircularProgress value={75} />
        <div>
          <p className="text-2xl" style={{ ...title, fontWeight: 800 }}>
            9<span className="text-base" style={{ color: C.muted, fontWeight: 500 }}>/12</span>
          </p>
          <p className="text-sm" style={sub}>
            aulas concluídas
          </p>
        </div>
      </div>

      <div className="mt-auto flex h-24 items-end gap-2">
        {[42, 60, 48, 78, 70, 88].map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-md"
            style={{ background: C.grad }}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.7, delay: i * 0.09, ease: "easeOut" }}
          />
        ))}
      </div>
      <p className="mt-2 text-xs" style={sub}>
        Evolução nas últimas semanas
      </p>
    </div>
  );
}

function CircularProgress({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);

  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(148,166,194,.18)" strokeWidth={8} />
        <motion.circle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          stroke="url(#cpg)"
          strokeWidth={8}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="cpg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.blue} />
            <stop offset="55%" stopColor={C.teal} />
            <stop offset="100%" stopColor={C.green} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-xl" style={{ ...title, fontWeight: 800 }}>
          {n}%
        </span>
      </div>
    </div>
  );
}

/* ── Etapa 4: certificado emitido ── */
function Certificate() {
  return (
    <div className="flex h-[360px] flex-col items-center justify-center text-center">
      <motion.div
        className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-2xl"
        style={{ background: C.gradTeal, boxShadow: "0 16px 40px -8px rgba(22,104,255,.5)" }}
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 13 }}
      >
        <Award className="h-10 w-10 text-white" />
        <motion.div
          className="absolute -inset-y-3 w-1/3 -skew-x-12 bg-white/40 blur-md"
          initial={{ x: "-180%" }}
          animate={{ x: "420%" }}
          transition={{ duration: 1.1, delay: 0.5, ease: "easeInOut" }}
        />
      </motion.div>

      <p className="mt-5" style={eyebrow(C.green)}>
        Certificado emitido
      </p>
      <h3 className="mt-1.5 text-lg" style={title}>
        Fundamentos do Design
      </h3>
      <p className="mt-1 text-sm" style={sub}>
        Conclusão completa do curso
      </p>

      <motion.button
        type="button"
        className="mt-5 rounded-full px-5 py-2.5 text-sm"
        style={{ background: C.grad, color: "#06101F", fontFamily: FONT.display, fontWeight: 700, boxShadow: "0 10px 26px -6px rgba(52,222,126,.45)" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
      >
        Ver certificado
      </motion.button>
    </div>
  );
}
