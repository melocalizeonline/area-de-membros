import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, is_admin, active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin || !profile.active) redirect("/dashboard");

  return (
    <AppShell isAdmin name={profile.name}>
      {children}
    </AppShell>
  );
}
