import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const admin = await createAdminClient();
      const fallbackName =
        typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "Membro";

      await admin.from("profiles").upsert({
        id: user.id,
        name: fallbackName,
        email: user.email ?? "",
        active: true
      });
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
