import { Card, CardText, CardTitle } from "@/components/ui/card";

const integrations = [
  {
    name: "Kiwify",
    status: "Webhook preparado",
    endpoint: "/api/webhooks/kiwify"
  },
  {
    name: "Eduzz",
    status: "Webhook preparado",
    endpoint: "/api/webhooks/eduzz"
  },
  {
    name: "Videos",
    status: "YouTube, Vimeo, Panda e embed planejados",
    endpoint: "Configurado por aula"
  }
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Integracoes</h1>
        <p className="mt-1 text-sm text-gray-600">
          Central para conectar vendas, liberacoes e provedores de video.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardTitle>{integration.name}</CardTitle>
            <CardText>{integration.status}</CardText>
            <p className="mt-4 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {integration.endpoint}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
