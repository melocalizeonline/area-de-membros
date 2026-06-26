import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

/* ─────────────────────────────────────────────
   ModernAuthScene — arte do painel de login em
   Framer Motion: aurora animada (cores da marca),
   formas de vidro com parallax no mouse, orbe
   central com anel girando e partículas subindo.
   Substitui a cena das geleias. Decorativa.
   ───────────────────────────────────────────── */

const BRAND = {
  roxo: "#7C5CFF",
  azul: "#3BA8FF",
  verde: "#36D399",
  laranja: "#FF9B4D",
  amarelo: "#F5D44A",
};

/** Formas de vidro flutuantes (glassmorphism). */
const SHAPES = [
  { x: "8%", y: "16%", size: 92, radius: 26, depth: 26, dur: 7, delay: 0 },
  { x: "70%", y: "10%", size: 64, radius: 18, depth: 40, dur: 6, delay: 0.6 },
  { x: "78%", y: "62%", size: 110, radius: 32, depth: 18, dur: 8, delay: 1.1 },
  { x: "12%", y: "68%", size: 72, radius: 20, depth: 34, dur: 6.5, delay: 0.3 },
  { x: "46%", y: "82%", size: 54, radius: 16, depth: 48, dur: 5.5, delay: 0.9 },
];

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: (i * 53) % 100,
  size: (i % 3) + 3,
  color: Object.values(BRAND)[i % 5],
  dur: 6 + (i % 5),
  delay: (i % 7) * 0.8,
  drift: (i % 2 ? 1 : -1) * (8 + (i % 4) * 6),
}));

export function ModernAuthScene() {
  const reduce = useReducedMotion();

  // parallax: posição do mouse normalizada (-0.5..0.5), suavizada
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 50, damping: 20, mass: 0.6 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my, reduce]);

  return (
    <div className="relative h-[500px] w-full max-w-[480px] overflow-hidden">
      {/* ── aurora (blobs de cor da marca, à deriva) ── */}
      <Aurora reduce={!!reduce} color={BRAND.roxo} className="left-[-10%] top-[6%] h-72 w-72" delay={0} />
      <Aurora reduce={!!reduce} color={BRAND.azul} className="right-[-12%] top-[24%] h-80 w-80" delay={1.5} />
      <Aurora reduce={!!reduce} color={BRAND.verde} className="bottom-[2%] left-[18%] h-64 w-64" delay={2.6} />
      <Aurora reduce={!!reduce} color={BRAND.laranja} className="bottom-[16%] right-[10%] h-56 w-56" delay={3.4} />

      {/* grade sutil */}
      <div className="absolute inset-0 bg-grid-white/[0.04] bg-[size:22px_22px]" />

      {/* ── orbe central com anel girando ── */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="relative grid place-items-center"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.15 }}
        >
          {/* anel cônico girando */}
          {!reduce && (
            <motion.div
              className="absolute h-52 w-52 rounded-full opacity-70"
              style={{
                background: `conic-gradient(from 0deg, ${BRAND.roxo}, ${BRAND.azul}, ${BRAND.verde}, ${BRAND.amarelo}, ${BRAND.laranja}, ${BRAND.roxo})`,
                maskImage: "radial-gradient(closest-side, transparent 64%, #000 66%, #000 74%, transparent 76%)",
                WebkitMaskImage: "radial-gradient(closest-side, transparent 64%, #000 66%, #000 74%, transparent 76%)",
                filter: "blur(0.4px)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />
          )}
          {/* orbe de vidro pulsando */}
          <motion.div
            className="h-32 w-32 rounded-full border border-white/20 backdrop-blur-md"
            style={{
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.35), rgba(124,92,255,.25) 45%, rgba(59,168,255,.18) 100%)`,
              boxShadow: `0 10px 50px ${BRAND.roxo}55, inset 0 0 30px rgba(255,255,255,.15)`,
            }}
            animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      {/* ── formas de vidro com parallax ── */}
      {SHAPES.map((s, i) => (
        <GlassShape key={i} shape={s} sx={sx} sy={sy} reduce={!!reduce} />
      ))}

      {/* ── partículas subindo ── */}
      {!reduce &&
        PARTICLES.map((p) => (
          <motion.span
            key={p.id}
            className="absolute bottom-[-6%] rounded-full"
            style={{ left: `${p.left}%`, width: p.size, height: p.size, backgroundColor: p.color, filter: "blur(.3px)" }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -520, x: p.drift, opacity: [0, 0.9, 0.9, 0] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
          />
        ))}

      {/* vinheta */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,.35))]" />
    </div>
  );
}

function Aurora({ color, className, delay, reduce }: { color: string; className: string; delay: number; reduce: boolean }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${className}`}
      style={{ backgroundColor: color, opacity: 0.4 }}
      animate={reduce ? undefined : { scale: [1, 1.25, 1], x: [0, 18, 0], y: [0, -14, 0], opacity: [0.32, 0.5, 0.32] }}
      transition={{ duration: 10, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function GlassShape({
  shape,
  sx,
  sy,
  reduce,
}: {
  shape: (typeof SHAPES)[number];
  sx: ReturnType<typeof useSpring>;
  sy: ReturnType<typeof useSpring>;
  reduce: boolean;
}) {
  // parallax: profundidade -> deslocamento
  const tx = useTransform(sx, (v) => v * shape.depth);
  const ty = useTransform(sy, (v) => v * shape.depth);

  return (
    <motion.div
      className="absolute rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md"
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.size,
        height: shape.size,
        borderRadius: shape.radius,
        x: tx,
        y: ty,
        boxShadow: "0 8px 32px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.18)",
      }}
      animate={reduce ? undefined : { y: [0, -12, 0], rotate: [0, 4, 0] }}
      transition={{ duration: shape.dur, delay: shape.delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
