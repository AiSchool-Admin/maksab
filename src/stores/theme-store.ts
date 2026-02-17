import { create } from "zustand";

const THEME_KEY = "maksab_theme";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",

  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
      // Update theme-color meta tag for PWA
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", theme === "dark" ? "#0f1117" : "#1B7A3D");
      }
    }
  },

  toggle: () => {
    const next = get().theme === "light" ? "dark" : "light";
    get().setTheme(next);
  },

  init: () => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored === "dark" || stored === "light") {
      get().setTheme(stored);
    } else {
      // Default to dark mode for new users
      get().setTheme("dark");
    }
  },
}));
