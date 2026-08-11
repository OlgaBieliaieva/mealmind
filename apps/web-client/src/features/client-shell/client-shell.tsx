"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/sign-out-button";

import { ClientNavigation } from "./client-navigation";
import { clientRoutes } from "./client-routes";

export interface ClientShellProps {
  readonly children: ReactNode;
}

export function ClientShell({ children }: ClientShellProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/auth/") || pathname === "/onboarding") {
    return (
      <>
        <a className="skip-link" href="#main-content">
          Перейти до основного вмісту
        </a>
        <main id="main-content" className="auth-page-shell" tabIndex={-1}>
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Перейти до основного вмісту
      </a>

      <div className="client-shell">
        <header className="client-header">
          <div className="client-header__content">
            <Link
              className="client-brand"
              href={clientRoutes.home}
              aria-label="MealMind — на головну"
            >
              <span className="client-brand__mark" aria-hidden="true">
                M
              </span>

              <span>
                <span className="client-brand__name">MealMind</span>
                <span className="client-brand__description">Сімейне планування харчування</span>
              </span>
            </Link>

            <SignOutButton />
          </div>
        </header>

        <div className="client-shell__body">
          <aside className="client-navigation-region" aria-label="Розділи застосунку">
            <ClientNavigation />
          </aside>

          <main id="main-content" className="client-main" tabIndex={-1}>
            {children}
          </main>
        </div>

        <footer className="client-footer">MealMind · Планування харчування для родини</footer>
      </div>
    </>
  );
}
