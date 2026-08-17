import { House, UserRound } from "lucide-react";

export const clientRoutes = {
  home: "/",
  family: "/family",
  profile: "/profile",
} as const;

export const clientNavigationItems = [
  {
    href: clientRoutes.home,
    label: "Головна",
    icon: House,
    activePaths: [clientRoutes.home],
  },
  {
    href: clientRoutes.profile,
    label: "Мій профіль",
    icon: UserRound,
    activePaths: [clientRoutes.profile, clientRoutes.family],
  },
] as const;
