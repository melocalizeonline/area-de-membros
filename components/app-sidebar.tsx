"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { adminNav, memberNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[230px] shrink-0 border-r border-gray-200 bg-white lg:block">
      <div className="border-b border-gray-200 px-5 py-5">
        <Logo />
      </div>
      <nav className="space-y-1 p-3">
        {memberNav.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 hover:text-gray-950",
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
            {adminNav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 hover:text-gray-950",
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
      <div className="mx-3 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-950">Proxima etapa</p>
        <p className="mt-1 text-xs leading-5 text-amber-800">
          Cadastre um produto e vincule cursos ou ferramentas para liberar conteudo.
        </p>
      </div>
    </aside>
  );
}
