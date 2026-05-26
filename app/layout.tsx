import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Area de Membros",
  description: "Cursos, ferramentas e materiais exclusivos."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
