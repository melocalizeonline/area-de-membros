import { logout } from "@/app/actions/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

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
    <div className="flex min-h-screen bg-[#f5f7f8]">
      <AppSidebar isAdmin={isAdmin} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 bg-[#0f7b92] text-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            <div>
              <p className="text-sm font-semibold">Ola, {(name || "Membro").split(" ")[0]}!</p>
              <p className="text-xs text-white/70">Bem-vindo a sua area exclusiva</p>
            </div>
            <form action={logout}>
              <Button
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                variant="secondary"
                type="submit"
              >
                <LogOut className="mr-2 h-4 w-4" />
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
