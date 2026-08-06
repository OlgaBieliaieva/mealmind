"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/sign-out-button";

import { AdminNavigation } from "./admin-navigation";
import { adminRoutes } from "./admin-routes";

export interface AdminShellProps {
  readonly children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/auth/")) {
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

      <div className="admin-shell">
        <header className="admin-header">
          <div className="admin-header__content">
            <Link
              className="admin-brand"
              href={adminRoutes.home}
              aria-label="MealMind Admin — на головну"
            >
              <span className="admin-brand__mark" aria-hidden="true">
                M
              </span>

              <span>
                <span className="admin-brand__name">MealMind Admin</span>
                <span className="admin-brand__description">Керування каталогом і рецептами</span>
              </span>
            </Link>

            <SignOutButton />
          </div>
        </header>

        <div className="admin-shell__body">
          <aside className="admin-sidebar" aria-label="Розділи панелі керування">
            <AdminNavigation />
          </aside>

          <main id="main-content" className="admin-main" tabIndex={-1}>
            {children}
          </main>
        </div>

        <footer className="admin-footer">MealMind · Адміністративна панель</footer>
      </div>
    </>
  );
}
