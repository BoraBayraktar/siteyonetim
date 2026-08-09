"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { PropertyUiMode } from "@/lib/admin-nav-capabilities-types";

type PropertyUiModeContextValue = {
  propertyUiMode: PropertyUiMode;
  setPropertyUiMode: (mode: PropertyUiMode) => void;
};

const PropertyUiModeContext = createContext<PropertyUiModeContextValue>({
  propertyUiMode: "standard",
  setPropertyUiMode: () => {},
});

export function PropertyUiModeProvider({ children }: { children: ReactNode }) {
  const [propertyUiMode, setPropertyUiMode] = useState<PropertyUiMode>("standard");
  const value = useMemo(
    () => ({ propertyUiMode, setPropertyUiMode }),
    [propertyUiMode],
  );
  return <PropertyUiModeContext.Provider value={value}>{children}</PropertyUiModeContext.Provider>;
}

export function usePropertyUiMode() {
  return useContext(PropertyUiModeContext);
}

export function PropertyUiModeSync({ propertyUiMode }: { propertyUiMode: PropertyUiMode }) {
  const { setPropertyUiMode } = usePropertyUiMode();
  useEffect(() => {
    setPropertyUiMode(propertyUiMode);
  }, [propertyUiMode, setPropertyUiMode]);
  return null;
}
