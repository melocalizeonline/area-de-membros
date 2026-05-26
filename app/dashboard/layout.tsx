import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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

  let currentProfile = profile;

  if (!currentProfile) {
    const admin = await createAdminClient();
    const fallbackName =
      typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "Membro";

    const { data: createdProfile } = await admin
      .from("profiles")
      .upsert({
        id: user.id,
        name: fallbackName,
        email: user.email ?? "",
        active: true
      })
      .select("name, is_admin, active")
      .single();

    currentProfile = createdProfile;
  }

  if (currentProfile && !currentProfile.active) redirect("/login");

  return (
    <AppShell isAdmin={currentProfile?.is_admin ?? false} name={currentProfile?.name ?? user.email ?? ""}>
      {children}
    </AppShell>
  );
}
