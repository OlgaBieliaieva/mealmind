export const adminRoutes = {
  home: "/analytics",
  reference: "/reference",
  products: "/products",
  productImport: "/product-import",
  recipes: "/recipes",
} as const;

export const adminNavigationItems = [
  {
    href: adminRoutes.home,
    label: "Огляд",
  },
  {
    href: adminRoutes.reference,
    label: "Довідники",
  },
  {
    href: adminRoutes.products,
    label: "Продукти",
  },
  {
    href: adminRoutes.productImport,
    label: "Перевірка імпорту",
  },
  {
    href: adminRoutes.recipes,
    label: "Рецепти",
  },
] as const;
