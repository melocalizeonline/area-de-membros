import {
  Award,
  BarChart3,
  BookOpen,
  FileText,
  Heart,
  HelpCircle,
  Home,
  Layers,
  Plug,
  Settings,
  Sparkles,
  UserCircle,
  Users,
  Webhook,
  Wrench
} from "lucide-react";

export const memberNav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/cursos", label: "Meus cursos", icon: BookOpen },
  { href: "/dashboard/ferramentas", label: "Minhas ferramentas", icon: Wrench },
  { href: "/dashboard/materiais", label: "Materiais", icon: FileText },
  { href: "/dashboard/favoritos", label: "Favoritos", icon: Heart },
  { href: "/dashboard/certificados", label: "Certificados", icon: Award },
  { href: "/dashboard/suporte", label: "Suporte", icon: HelpCircle },
  { href: "/dashboard/minha-conta", label: "Minha conta", icon: UserCircle }
];

export const adminNav = [
  { href: "/admin", label: "Admin Dashboard", icon: Settings },
  { href: "/admin/membros", label: "Membros", icon: Users },
  { href: "/admin/produtos", label: "Produtos", icon: Sparkles },
  { href: "/admin/cursos", label: "Cursos", icon: BookOpen },
  { href: "/admin/modulos-aulas", label: "Módulos e aulas", icon: Layers },
  { href: "/admin/ferramentas", label: "Ferramentas", icon: Wrench },
  { href: "/admin/materiais", label: "Materiais", icon: FileText },
  { href: "/admin/integracoes", label: "Integrações", icon: Plug },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings }
];
