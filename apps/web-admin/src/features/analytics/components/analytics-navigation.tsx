"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/analytics", label: "Загальний" },
  { href: "/analytics/users", label: "Користувачі" },
  { href: "/analytics/products", label: "Продукти" },
  { href: "/analytics/recipes", label: "Рецепти" },
  { href: "/analytics/references", label: "Довідники" },
] as const;

export function AnalyticsNavigation() {
  const pathname = usePathname();
  return (
    <nav className="analytics-navigation" aria-label="Розділи огляду">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
