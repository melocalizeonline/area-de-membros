import { HelpCircle } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function SupportPage() {
  return (
    <ComingSoonPage
      description="Central para orientar membros sobre acesso, pagamentos, aulas e ferramentas."
      icon={HelpCircle}
      items={["Links de suporte", "FAQ", "Contato", "Tickets futuros"]}
      title="Suporte"
    />
  );
}
