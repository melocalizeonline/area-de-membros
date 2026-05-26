import { Settings } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function AdminSettingsPage() {
  return (
    <ComingSoonPage
      description="Configurações gerais da área, domínio, suporte, preferências e integrações futuras."
      icon={Settings}
      items={["Dados da plataforma", "Suporte", "Preferências visuais", "Configurações futuras"]}
      title="Configurações"
    />
  );
}
