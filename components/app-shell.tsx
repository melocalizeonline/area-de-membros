import { logout } from "@/app/actions/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  name,
  isAdmin
}: {
  children: React.ReactNode;
  name: string;
  isAdmin: boolean;
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar isAdmin={isAdmin} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            <div>
              <p className="text-sm font-medium text-gray-950">{name || "Membro"}</p>
              <p className="text-xs text-gray-500">Sua area exclusiva</p>
            </div>
            <form action={logout}>
              <Button variant="secondary" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
