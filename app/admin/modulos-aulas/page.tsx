import { Layers } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function AdminModulesLessonsPage() {
  return (
    <ComingSoonPage
      description="Área dedicada para edição detalhada de módulos e aulas. Hoje a criação básica está em Admin > Cursos."
      icon={Layers}
      items={["Reordenar módulos", "Editar aulas", "Preview como aluno", "Materiais por aula"]}
      title="Módulos e aulas"
    />
  );
}
