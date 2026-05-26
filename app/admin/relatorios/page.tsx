import { BarChart3 } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function AdminReportsPage() {
  return (
    <ComingSoonPage
      description="Relatórios futuros sobre membros, progresso, produtos, aulas e ferramentas."
      icon={BarChart3}
      items={["Membros ativos", "Conclusão de cursos", "Uso de ferramentas", "Eventos de acesso"]}
      title="Relatórios"
    />
  );
}
