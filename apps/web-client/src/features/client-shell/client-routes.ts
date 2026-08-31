import { CalendarDays, House, ShoppingCart, UserRound } from "lucide-react";

export const clientRoutes = {
  home: "/",
  family: "/family",
  profile: "/profile",
  plan: "/plan",
  shop: "/shop",
} as const;

export const clientNavigationItems = [
  {
    href: clientRoutes.home,
    label: "Головна",
    icon: House,
    activePaths: [clientRoutes.home],
  },
  {
    href: clientRoutes.plan,
    label: "План харчування",
    icon: CalendarDays,
    activePaths: [clientRoutes.plan, "/food"],
  },
  {
    href: clientRoutes.shop,
    label: "Списки покупок",
    icon: ShoppingCart,
    activePaths: [clientRoutes.shop],
  },
  {
    href: clientRoutes.profile,
    label: "Мій профіль",
    icon: UserRound,
    activePaths: [clientRoutes.profile, clientRoutes.family],
  },
] as const;
