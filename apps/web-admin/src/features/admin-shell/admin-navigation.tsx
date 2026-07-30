"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigationItems } from "./admin-routes";

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Основна навігація">
      <ul className="admin-navigation">
        {adminNavigationItems.map((item) => {
          const isCurrent = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                className="admin-navigation__link"
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
