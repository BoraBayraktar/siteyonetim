"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

const emptyServerParams = new URLSearchParams();

/**
 * Non-suspending search params for sidebar active states.
 * Re-reads when the route re-renders after navigation (no history patching).
 */
export function useClientSearchParams(): URLSearchParams {
  const pathname = usePathname();
  const search = typeof window === "undefined" ? "" : window.location.search;

  return useMemo(() => {
    if (typeof window === "undefined") {
      return emptyServerParams;
    }
    return new URLSearchParams(window.location.search);
  }, [pathname, search]);
}
