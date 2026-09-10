import { BookOpen, CalendarDays, ShoppingCart, UserRound, ChartNoAxesCombined } from "lucide-react";

export const clientRoutes = {
  root: "/",
  analytics: "/analytics",
  family: "/family",
  profile: "/profile",
  plan: "/plan",
  shop: "/shop",
  diary: "/diary",
} as const;

export const clientNavigationItems = [
  {
    href: clientRoutes.shop,
    label: "Списки покупок",
    icon: ShoppingCart,
    activePaths: [clientRoutes.shop],
  },
  {
    href: clientRoutes.plan,
    label: "План харчування",
    icon: CalendarDays,
    activePaths: [clientRoutes.plan, "/food"],
  },
  {
    href: clientRoutes.diary,
    label: "Щоденник",
    icon: BookOpen,
    activePaths: [clientRoutes.diary],
  },
  {
    href: clientRoutes.analytics,
    label: "Аналітика",
    icon: ChartNoAxesCombined,
    activePaths: [clientRoutes.analytics],
  },
  {
    href: clientRoutes.profile,
    label: "Мій профіль",
    icon: UserRound,
    activePaths: [clientRoutes.profile, clientRoutes.family],
  },
] as const;
