import { Link } from "react-router-dom";
import { BRAND_NAME } from "@/lib/brand";

export const LEGAL_CONTACT_EMAIL = "members@nory.com.br";
export const LEGAL_LAST_UPDATED = "25 de junho de 2026";

export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/admin/login" className="text-sm text-muted-foreground hover:text-foreground">
          ← {BRAND_NAME}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {LEGAL_LAST_UPDATED}</p>
        <div className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {children}
        </div>
      </div>
    </div>
  );
}
