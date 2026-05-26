"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Plug, Settings, Sparkles, Wrench } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const memberLinks = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/cursos", label: "Cursos", icon: BookOpen },
  { href: "/dashboard/ferramentas", label: "Ferramentas", icon: Wrench }
];

const adminLinks = [
  { href: "/admin", label: "Resumo", icon: Settings },
  { href: "/admin/produtos", label: "Produtos", icon: Sparkles },
  { href: "/admin/integracoes", label: "Integracoes", icon: Plug }
];

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
      <div className="border-b border-gray-200 px-5 py-5">
        <Logo />
      </div>
      <nav className="space-y-1 p-3">
        {memberLinks.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50",
                active && "bg-teal-50 font-medium text-teal-800"
              )}
              href={href}
              key={href}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-4">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Admin
            </div>
            {adminLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50",
                    active && "bg-teal-50 font-medium text-teal-800"
                  )}
                  href={href}
                  key={href}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
