import type { Metadata } from "next";
import type { ReactNode } from "react";

import { readWebEnv } from "@/config/env";

import "./globals.css";

readWebEnv();

export const metadata: Metadata = {
  title: "MealMind Admin",
  description: "Адміністративний застосунок системи MealMind",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
