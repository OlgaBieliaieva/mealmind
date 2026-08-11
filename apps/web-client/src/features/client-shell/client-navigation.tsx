"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip } from "@/shared/ui";

import { clientNavigationItems } from "./client-routes";

export function ClientNavigation() {
  const pathname = usePathname();

  return (
    <nav className="client-navigation-region" aria-label="Основна навігація">
      <ul className="client-navigation">
        {clientNavigationItems.map((item) => {
          const isCurrent =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

          const Icon = item.icon;

          return (
            <li key={item.href} className="client-navigation__item">
              <Tooltip content={item.label}>
                <Link
                  className="client-navigation__link"
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-label={item.label}
                >
                  <Icon className="client-navigation__icon" aria-hidden="true" />
                </Link>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
