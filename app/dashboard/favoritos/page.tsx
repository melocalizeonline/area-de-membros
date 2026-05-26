import { Heart } from "lucide-react";
import { ComingSoonPage } from "@/components/coming-soon-page";

export default function FavoritesPage() {
  return (
    <ComingSoonPage
      description="Cursos, aulas, ferramentas e materiais salvos pelo membro."
      icon={Heart}
      items={["Cursos favoritos", "Aulas favoritas", "Ferramentas favoritas", "Materiais favoritos"]}
      title="Favoritos"
    />
  );
}
