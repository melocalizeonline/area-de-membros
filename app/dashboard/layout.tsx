import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  if (profile && !profile.active) redirect("/login");

  return (
    <AppShell isAdmin={profile?.is_admin ?? false} name={profile?.name ?? user.email ?? ""}>
      {children}
    </AppShell>
  );
}
