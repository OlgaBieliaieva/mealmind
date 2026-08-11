import { House, Users } from "lucide-react";

export const clientRoutes = {
  home: "/",
  family: "/family",
} as const;

export const clientNavigationItems = [
  {
    href: clientRoutes.home,
    label: "Головна",
    icon: House,
  },
  {
    href: clientRoutes.family,
    label: "Сім’я",
    icon: Users,
  },
] as const;
