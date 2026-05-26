import { UserCircle } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <ComingSoonPage
      description={`Dados básicos, senha, produtos liberados e histórico de acesso. Conta atual: ${user?.email ?? "membro"}.`}
      icon={UserCircle}
      items={["Dados pessoais", "Alteração de senha", "Produtos liberados", "Histórico futuro"]}
      title="Minha conta"
    />
  );
}
