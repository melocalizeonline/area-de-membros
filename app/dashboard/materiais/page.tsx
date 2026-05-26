import { FileText } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function MaterialsPage() {
  return (
    <ComingSoonPage
      description="Materiais liberados por produto, curso, módulo, aula ou ferramenta."
      icon={FileText}
      items={["PDFs e apostilas", "Planilhas", "Links úteis", "Templates e arquivos"]}
      title="Materiais"
    />
  );
}
