import type { Metadata } from "next";
import type { ReactNode } from "react";

import { readWebEnv } from "@/config/env";
import { AdminShell } from "@/features/admin-shell/admin-shell";

import { AppProviders } from "./providers";

import "./globals.css";
import "@/shared/ui/ui.css";
import "@/features/products/products.css";
import "@/features/recipes/recipes.css";
import "@/features/reference/reference.css";
import "@/features/auth/auth.css";

readWebEnv();

export const metadata: Metadata = {
  title: {
    default: "MealMind Admin",
    template: "%s | MealMind Admin",
  },
  description: "Адміністративний застосунок системи MealMind",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
        <AppProviders>
          <AdminShell>{children}</AdminShell>
        </AppProviders>
      </body>
    </html>
  );
}
