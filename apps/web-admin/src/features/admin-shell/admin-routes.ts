export const adminRoutes = {
  home: "/",
  products: "/products",
} as const;

export const adminNavigationItems = [
  {
    href: adminRoutes.home,
    label: "Огляд",
  },
  {
    href: adminRoutes.products,
    label: "Продукти",
  },
] as const;
