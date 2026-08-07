"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const emptyServerParams = new URLSearchParams();

/**
 * Search params for client UI (e.g. sidebar active tab) without Suspense.
 * First paint matches SSR (empty); real query string applies after mount.
 */
export function useClientSearchParams(): URLSearchParams {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return useMemo(() => {
    if (!mounted || typeof window === "undefined") {
      return emptyServerParams;
    }
    return new URLSearchParams(window.location.search);
  }, [pathname, mounted]);
}
