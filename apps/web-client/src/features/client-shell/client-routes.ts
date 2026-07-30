export const clientRoutes = {
  home: "/",
} as const;

export const clientNavigationItems = [
  {
    href: clientRoutes.home,
    label: "Головна",
  },
] as const;
