import type { Metadata } from "next";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
export const metadata: Metadata = { title: "Початкове налаштування" };
export default function OnboardingPage() {
  return (
    <div className="onboarding-page">
      <OnboardingWizard />
    </div>
  );
}
