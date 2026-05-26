import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  Sparkles,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

const coverThemes = [
  "from-teal-700 via-cyan-700 to-slate-900",
  "from-slate-900 via-indigo-800 to-teal-700",
  "from-amber-600 via-rose-700 to-slate-900",
  "from-emerald-700 via-teal-800 to-gray-950"
];

export function ContentCard({
  href,
  title,
  description,
  label,
  icon = "BookOpen",
  progress,
  external,
  index = 0
}: {
  href: string;
  title: string;
  description: string;
  label: string;
  icon?: string | null;
  progress?: number;
  external?: boolean;
  index?: number;
}) {
  const theme = coverThemes[index % coverThemes.length];

  return (
    <Link href={href} target={external ? "_blank" : undefined}>
      <article className="group h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-500 hover:shadow-md">
        <div className={cn("relative h-32 bg-gradient-to-br p-4 text-white", theme)}>
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_26%),linear-gradient(135deg,white_0,transparent_1px)] [background-size:120px_120px,18px_18px]" />
          <div className="relative flex h-full flex-col justify-between">
            <span className="w-fit rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              {label}
            </span>
            <div className="flex items-end justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                {renderIcon(icon)}
              </div>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        <div className="p-4">
          <h3 className="line-clamp-1 text-sm font-semibold text-gray-950">{title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{description}</p>
          {typeof progress === "number" && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-teal-600" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

function renderIcon(icon: string | null | undefined) {
  const className = "h-5 w-5";
  if (icon === "Sparkles") return <Sparkles className={className} />;
  if (icon === "ClipboardCheck") return <ClipboardCheck className={className} />;
  if (icon === "ExternalLink") return <ExternalLink className={className} />;
  if (icon === "Wrench") return <Wrench className={className} />;
  return <BookOpen className={className} />;
}
