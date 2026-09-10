"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/sign-out-button";
import { useFamily } from "@/features/family/hooks/use-family";

import { ClientNavigation } from "./client-navigation";
import { clientRoutes } from "./client-routes";

export interface ClientShellProps {
  readonly children: ReactNode;
}

export function ClientShell({ children }: ClientShellProps) {
  const pathname = usePathname();
  const publicShell =
    pathname.startsWith("/auth/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/account-activation");
  const immersive =
    pathname.startsWith("/plan") ||
    pathname.startsWith("/food/") ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/diary") ||
    pathname.startsWith("/analytics");
  const family = useFamily(!publicShell && !immersive);

  if (publicShell) {
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
        {immersive ? null : (
          <header className="client-header">
            <div className="client-header__content">
              <Link
                className="client-brand"
                href={clientRoutes.diary}
                aria-label="MealMind — до щоденника"
              >
                <span className="client-brand__mark" aria-hidden="true">
                  M
                </span>

                <span>
                  <span className="client-brand__name">MealMind</span>
                  <span className="client-brand__description">
                    {family.data?.name ?? "Сімейне планування харчування"}
                  </span>
                </span>
              </Link>

              <SignOutButton />
            </div>
          </header>
        )}

        <div className="client-shell__body">
          <aside className="client-navigation-region" aria-label="Розділи застосунку">
            <ClientNavigation />
          </aside>

          <main
            id="main-content"
            className={immersive ? "client-main client-main--immersive" : "client-main"}
            tabIndex={-1}
          >
            {children}
          </main>
        </div>

        {immersive ? null : (
          <footer className="client-footer">MealMind · Планування харчування для родини</footer>
        )}
      </div>
    </>
  );
}
