import { FileText } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function AdminMaterialsPage() {
  return (
    <ComingSoonPage
      description="Administração futura de materiais digitais vinculados a produtos, cursos, aulas e ferramentas."
      icon={FileText}
      items={["Criar material", "Vincular contexto", "Publicar ou rascunho", "Ordenar materiais"]}
      title="Materiais"
    />
  );
}
