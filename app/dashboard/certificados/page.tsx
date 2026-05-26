import { Award } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function CertificatesPage() {
  return (
    <ComingSoonPage
      description="Certificados poderão ser liberados conforme critérios de conclusão."
      icon={Award}
      items={["Critérios por curso", "Download em PDF", "Histórico de certificados", "Validação pública futura"]}
      title="Certificados"
    />
  );
}
