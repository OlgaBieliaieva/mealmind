export const adminRoutes = {
  home: "/",
  products: "/products",
  recipes: "/recipes",
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
  {
    href: adminRoutes.recipes,
    label: "Рецепти",
  },
] as const;
