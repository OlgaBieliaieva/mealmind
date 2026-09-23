"use client";

import { useEffect } from "react";

export function useScreenWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    let disposed = false;
    let sentinel: WakeLockSentinel | null = null;
    const wakeLock = navigator.wakeLock;

    const acquire = async () => {
      if (disposed || document.visibilityState !== "visible" || !wakeLock) return;
      try {
        const requested = await wakeLock.request("screen");
        if (disposed) {
          await requested.release();
          return;
        }
        sentinel = requested;
      } catch {
        // Wake Lock is a progressive enhancement and may be denied by the OS/browser.
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, [active]);
}
