"use client";

import { useState } from "react";

import { readWebEnv } from "@/config/env";
import { getBrowserSupabaseClient } from "@/shared/supabase/browser-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      className="auth-sign-out"
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await getBrowserSupabaseClient(readWebEnv()).auth.signOut();
        window.location.assign("/auth/sign-in");
      }}
    >
      {pending ? "Вихід…" : "Вийти"}
    </button>
  );
}
