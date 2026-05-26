import Link from "next/link";
import { Play, Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";

export function FeaturedLesson({
  href,
  title,
  courseTitle,
  duration
}: {
  href: string;
  title: string;
  courseTitle: string;
  duration: string;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid lg:grid-cols-[1fr_0.85fr]">
        <div className="relative min-h-64 bg-gradient-to-br from-gray-950 via-teal-900 to-cyan-800 p-6 text-white">
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_30%_25%,white_0,transparent_24%),radial-gradient(circle_at_75%_55%,white_0,transparent_20%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                Continue assistindo
              </p>
              <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm text-white/70">{courseTitle}</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/75">
              <Clock3 className="h-4 w-4" />
              {duration}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between p-6">
          <div>
            <h3 className="text-base font-semibold text-gray-950">Sua proxima acao</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Continue pela aula recomendada ou abra a lista completa de modulos do curso.
            </p>
          </div>
          <Link
            className="mt-6 inline-flex h-10 w-fit items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-medium text-white transition hover:bg-teal-800"
            href={href}
          >
            <Play className="mr-2 h-4 w-4" />
            Continuar
          </Link>
        </div>
      </div>
    </Card>
  );
}
