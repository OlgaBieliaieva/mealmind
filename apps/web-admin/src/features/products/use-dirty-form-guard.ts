"use client";

import { useEffect } from "react";

const MESSAGE = "У вас є незбережені зміни. Залишити сторінку?";

export function useDirtyFormGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const linkNavigation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") return;

      const destination = new URL(link.href, window.location.href);
      if (
        destination.href === window.location.href ||
        destination.origin !== window.location.origin
      )
        return;
      if (!window.confirm(MESSAGE)) event.preventDefault();
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", linkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", linkNavigation, true);
    };
  }, [isDirty]);
}
