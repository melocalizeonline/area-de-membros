// Edge function PÚBLICA (verify_jwt=false): callback do fluxo authorize-application do WordPress.
//
// O WordPress, após o tenant clicar "Aprovar" no wp-admin, redireciona o NAVEGADOR para cá
// (GET) anexando ?site_url=...&user_login=...&password=... ao success_url que enviamos
// (que já contém nosso ?token=...). Validamos o token (uso único, não expirado), gravamos a
// Application Password em wp_connections e redirecionamos o usuário de volta ao app.
//
// Segurança: sem token válido nada é gravado. O token foi criado por um tenant autenticado
// (ação wp_connect_start), então só quem iniciou consegue concluir. A senha trafega na URL —
// é o desenho nativo do WordPress; ocorre sobre HTTPS e é consumida imediatamente.

import { createClient } from "jsr:@supabase/supabase-js@2";

function redirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } });
}
function htmlMessage(msg: string, status = 200) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:2rem">${msg}</body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const userLogin = url.searchParams.get("user_login") ?? "";
  const password = url.searchParams.get("password") ?? "";
  const siteUrl = url.searchParams.get("site_url") ?? "";

  if (!token) return htmlMessage("Token ausente. Reinicie a conexão pelo painel.", 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 1. Resolve e valida o token
  const { data: tok } = await admin
    .from("wp_connect_tokens")
    .select("token, assignment_id, domain, wp_url, return_url, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (!tok) return htmlMessage("Token inválido. Reinicie a conexão pelo painel.", 400);
  if (tok.consumed_at) return htmlMessage("Este link já foi utilizado. Reinicie a conexão se necessário.", 400);
  if (new Date(tok.expires_at).getTime() < Date.now()) {
    return htmlMessage("Link expirado. Reinicie a conexão pelo painel.", 400);
  }

  const fail = (reason: string) => {
    const back = tok.return_url ? `${tok.return_url}${tok.return_url.includes("?") ? "&" : "?"}wp=error` : null;
    return back ? redirect(back) : htmlMessage(`Não foi possível conectar: ${reason}`, 400);
  };

  // O WordPress só envia user_login/password quando o usuário APROVA.
  if (!userLogin || !password) return fail("autorização não concluída");

  // 2. Grava a credencial (upsert por assignment_id + wp_url)
  const wpUrl = (siteUrl || tok.wp_url).replace(/\/$/, "");
  const { error: upErr } = await admin
    .from("wp_connections")
    .upsert(
      {
        assignment_id: tok.assignment_id,
        domain: tok.domain,
        wp_url: wpUrl,
        wp_user: userLogin,
        app_password: password,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,wp_url" },
    );
  if (upErr) return fail("erro ao salvar credencial");

  // 3. Consome o token (uso único)
  await admin.from("wp_connect_tokens").update({ consumed_at: new Date().toISOString() }).eq("token", token);

  // 4. Volta para o app
  if (tok.return_url) {
    return redirect(`${tok.return_url}${tok.return_url.includes("?") ? "&" : "?"}wp=connected`);
  }
  return htmlMessage("WordPress conectado! Você já pode fechar esta aba e voltar ao painel.");
});
