import { BRAND_NAME } from "@/lib/brand";
import { LegalLayout, LEGAL_CONTACT_EMAIL } from "./LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidade">
      <p>
        Esta Política de Privacidade descreve como a plataforma <strong>{BRAND_NAME}</strong> coleta,
        usa, armazena e protege as informações dos usuários. Ao utilizar a plataforma, você concorda
        com as práticas aqui descritas.
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Dados de cadastro:</strong> nome, e-mail e foto de perfil (incluindo dados básicos do seu perfil Google, quando você opta por entrar com o Google).</li>
        <li><strong>Dados de uso:</strong> conteúdos acessados, progresso em cursos, ferramentas utilizadas e registros de acesso.</li>
        <li><strong>Dados de compra:</strong> informações de pedidos e liberação de acesso provenientes de integrações de checkout.</li>
        <li><strong>Dados técnicos:</strong> endereço IP, tipo de dispositivo e navegador, para segurança e funcionamento do serviço.</li>
      </ul>

      <h2>2. Como usamos os dados</h2>
      <ul>
        <li>Autenticar seu acesso e manter sua conta segura.</li>
        <li>Liberar e gerenciar o acesso a cursos e ferramentas adquiridos.</li>
        <li>Enviar comunicações transacionais (boas-vindas, redefinição de senha, convites e avisos).</li>
        <li>Melhorar a plataforma e prevenir fraudes e abusos.</li>
      </ul>

      <h2>3. Login com o Google</h2>
      <p>
        Ao escolher entrar com o Google, recebemos apenas as informações básicas do seu perfil
        (nome, e-mail e foto) para criar e autenticar sua conta. Não acessamos seus contatos, e-mails
        ou quaisquer outros dados da sua conta Google, e não publicamos nada em seu nome.
      </p>

      <h2>4. Compartilhamento com terceiros</h2>
      <p>Utilizamos prestadores de serviço para operar a plataforma, que tratam dados apenas conforme necessário:</p>
      <ul>
        <li><strong>Supabase</strong> — autenticação e banco de dados.</li>
        <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
        <li><strong>Google</strong> — login social (OAuth), quando utilizado.</li>
        <li><strong>Resend</strong> — envio de e-mails transacionais.</li>
        <li><strong>Provedores de checkout/pagamento</strong> — processamento de compras e liberação de acesso.</li>
      </ul>
      <p>Não vendemos seus dados pessoais.</p>

      <h2>5. Armazenamento e segurança</h2>
      <p>
        Os dados são armazenados em servidores de nossos prestadores e protegidos por medidas técnicas
        e organizacionais. Mantemos os dados pelo tempo necessário para prestar o serviço e cumprir
        obrigações legais.
      </p>

      <h2>6. Seus direitos (LGPD)</h2>
      <p>
        Você pode solicitar acesso, correção, exclusão ou portabilidade dos seus dados, bem como revogar
        consentimentos, entrando em contato pelo e-mail abaixo. Trataremos sua solicitação conforme a
        Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
      </p>

      <h2>7. Cookies</h2>
      <p>
        Utilizamos cookies e armazenamento local essenciais para autenticação, preferências (tema e idioma)
        e funcionamento da plataforma.
      </p>

      <h2>8. Alterações</h2>
      <p>
        Podemos atualizar esta política periodicamente. Mudanças relevantes serão comunicadas pelos canais
        da plataforma.
      </p>

      <h2>9. Contato</h2>
      <p>
        Dúvidas sobre privacidade? Fale com a gente em{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
