import type { LucideIcon } from "lucide-react";
import { Card, CardText, CardTitle } from "@/components/ui/card";

export function ComingSoonPage({
  icon: Icon,
  title,
  description,
  items
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Estrutura preparada</CardTitle>
            <CardText>
              Esta página já faz parte da navegação e será evoluída nas próximas fases sem quebrar o fluxo atual.
            </CardText>
            <div className="mt-5 grid gap-2 md:grid-cols-2">
              {items.map((item) => (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
