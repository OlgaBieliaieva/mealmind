"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { clientNavigationItems } from "./client-routes";

export function ClientNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Основна навігація">
      <ul className="client-navigation">
        {clientNavigationItems.map((item) => {
          const isCurrent = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                className="client-navigation__link"
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
              >
                <span className="client-navigation__mark" aria-hidden="true">
                  M
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
