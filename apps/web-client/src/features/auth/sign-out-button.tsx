"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { readWebEnv } from "@/config/env";
import { getBrowserSupabaseClient } from "@/shared/supabase/browser-client";

export function SignOutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <button
      className="auth-sign-out"
      type="button"
      disabled={isSubmitting}
      onClick={async () => {
        setIsSubmitting(true);
        await getBrowserSupabaseClient(readWebEnv()).auth.signOut();
        router.replace("/auth/sign-in");
      }}
    >
      {isSubmitting ? "Вихід…" : "Вийти"}
    </button>
  );
}
