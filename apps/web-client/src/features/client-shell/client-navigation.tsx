"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { clientNavigationItems } from "./client-routes";

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

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
                  <HomeIcon />
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
