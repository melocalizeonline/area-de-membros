import { BRAND_NAME } from "@/lib/brand";
import { LegalLayout, LEGAL_CONTACT_EMAIL } from "./LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout title="Termos de Serviço">
      <p>
        Estes Termos de Serviço regem o uso da plataforma <strong>{BRAND_NAME}</strong>. Ao criar uma
        conta ou utilizar a plataforma, você concorda com estes termos.
      </p>

      <h2>1. O serviço</h2>
      <p>
        A {BRAND_NAME} é uma área de membros que disponibiliza cursos e ferramentas digitais, com acesso
        liberado de forma manual ou automática a partir de integrações de checkout.
      </p>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>Você é responsável por manter a confidencialidade das suas credenciais de acesso.</li>
        <li>As informações fornecidas no cadastro devem ser verdadeiras e atualizadas.</li>
        <li>O acesso é pessoal e intransferível, salvo autorização expressa.</li>
      </ul>

      <h2>3. Uso aceitável</h2>
      <p>Você concorda em não:</p>
      <ul>
        <li>Compartilhar, copiar ou redistribuir o conteúdo sem autorização.</li>
        <li>Tentar burlar mecanismos de segurança ou de controle de acesso.</li>
        <li>Utilizar a plataforma para fins ilegais ou que violem direitos de terceiros.</li>
      </ul>

      <h2>4. Conteúdo e propriedade intelectual</h2>
      <p>
        Os cursos, ferramentas, marcas e materiais disponibilizados são protegidos por direitos de
        propriedade intelectual e não podem ser reproduzidos sem autorização.
      </p>

      <h2>5. Pagamentos e acesso</h2>
      <p>
        Quando o acesso for vinculado a uma compra, ele é concedido conforme as condições do produto
        adquirido e da plataforma de checkout utilizada. Reembolsos seguem a política do produto e a
        legislação aplicável.
      </p>

      <h2>6. Cancelamento e suspensão</h2>
      <p>
        Podemos suspender ou encerrar o acesso em caso de violação destes termos. Você pode solicitar o
        encerramento da sua conta a qualquer momento pelo e-mail de contato.
      </p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>
        A plataforma é fornecida "no estado em que se encontra". Na medida permitida em lei, não nos
        responsabilizamos por danos indiretos decorrentes do uso ou da indisponibilidade do serviço.
      </p>

      <h2>8. Alterações</h2>
      <p>
        Estes termos podem ser atualizados periodicamente. O uso continuado da plataforma após mudanças
        representa concordância com a versão vigente.
      </p>

      <h2>9. Lei aplicável</h2>
      <p>
        Estes termos são regidos pelas leis da República Federativa do Brasil.
      </p>

      <h2>10. Contato</h2>
      <p>
        Dúvidas sobre estes termos? Fale com a gente em{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
