"use client";

import { useServerInsertedHTML } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type Theme = "light" | "dark" | "system";

export type ThemeProviderProps = {
  children: ReactNode;
  attribute?: "class" | `data-${string}`;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
};

type ThemeContextValue = {
  theme?: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  resolvedTheme?: "light" | "dark";
  systemTheme?: "light" | "dark";
  themes: Theme[];
};

const ThemeContext = createContext<ThemeContextValue>({
  setTheme: () => undefined,
  themes: ["light", "dark", "system"],
});

const STORAGE_KEY = "theme";

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return fallback;
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(
  theme: Theme,
  enableSystem: boolean,
  systemTheme: "light" | "dark",
): "light" | "dark" {
  if (theme === "system" && enableSystem) {
    return systemTheme;
  }
  return theme === "dark" ? "dark" : "light";
}

function applyThemeClass(resolved: "light" | "dark", disableTransitionOnChange: boolean) {
  const root = document.documentElement;
  let cleanup: (() => void) | undefined;

  if (disableTransitionOnChange) {
    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{transition:none!important}",
      ),
    );
    document.head.appendChild(style);
    cleanup = () => {
      window.getComputedStyle(document.body);
      document.head.removeChild(style);
    };
  }

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.colorScheme = resolved;

  cleanup?.();
}

function buildThemeInitScript(
  storageKey: string,
  defaultTheme: Theme,
  enableSystem: boolean,
): string {
  return `(function(){try{var key=${JSON.stringify(storageKey)};var stored=localStorage.getItem(key)||${JSON.stringify(defaultTheme)};var resolved=stored;${enableSystem ? "if(stored==='system'){resolved=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}" : "if(stored==='system'){resolved='light'}"};var root=document.documentElement;if(resolved==='dark'){root.classList.add('dark')}else{root.classList.remove('dark')}root.style.colorScheme=resolved}catch(e){}})();`;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(storageKey, defaultTheme));
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useServerInsertedHTML(() => (
    <script
      dangerouslySetInnerHTML={{
        __html: buildThemeInitScript(storageKey, defaultTheme, enableSystem),
      }}
    />
  ));

  const resolvedTheme = resolveTheme(theme, enableSystem, systemTheme);

  useEffect(() => {
    applyThemeClass(resolvedTheme, disableTransitionOnChange);
  }, [disableTransitionOnChange, resolvedTheme]);

  useEffect(() => {
    if (!enableSystem) return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [enableSystem]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      setThemeState(readStoredTheme(storageKey, defaultTheme));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [defaultTheme, storageKey]);

  const setTheme: Dispatch<SetStateAction<Theme>> = (value) => {
    setThemeState((current) => {
      const next = typeof value === "function" ? value(current) : value;
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme: enableSystem ? systemTheme : undefined,
      themes: (enableSystem ? ["light", "dark", "system"] : ["light", "dark"]) as Theme[],
    }),
    [enableSystem, resolvedTheme, setTheme, systemTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
