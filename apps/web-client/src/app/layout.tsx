import type { Metadata } from "next";
import type { ReactNode } from "react";

import { readWebEnv } from "@/config/env";

import { AppProviders } from "./providers";

import "./globals.css";

readWebEnv();

export const metadata: Metadata = {
  title: {
    default: "MealMind",
    template: "%s | MealMind",
  },
  description: "Система планування сімейного харчування",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="uk">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
