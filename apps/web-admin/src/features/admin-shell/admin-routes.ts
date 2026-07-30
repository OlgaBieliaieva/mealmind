export const adminRoutes = {
  home: "/",
} as const;

export const adminNavigationItems = [
  {
    href: adminRoutes.home,
    label: "Огляд",
  },
] as const;
