import type { Metadata } from "next";
import { AccountActivation } from "@/features/family/account-activation";

export const metadata: Metadata = { title: "Активація профілю" };

export default function AccountActivationPage() {
  return <AccountActivation />;
}
