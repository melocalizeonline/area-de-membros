import { Webhook } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function AdminWebhooksPage() {
  return (
    <ComingSoonPage
      description="Visualização futura dos eventos recebidos, erros, reprocessamento e idempotência."
      icon={Webhook}
      items={["Eventos recebidos", "Erros recentes", "Reprocessamento seguro", "Status por plataforma"]}
      title="Webhooks"
    />
  );
}
