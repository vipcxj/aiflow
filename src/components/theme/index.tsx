'use client'

import { ThemeProvider as NextThemeProvider, useTheme } from "next-themes";
import { Moon } from "../icons/moon";
import { Sun } from "../icons/sun";
import { PropsWithChildren, useCallback } from "react";

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  return (
    <NextThemeProvider
      value={{
        light: 'light',
        dark: 'dark',
      }}
    >
      {children}
    </NextThemeProvider>
  )
}

export const ThemeButton = () => {
  const { theme, setTheme } = useTheme();
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
    document.documentElement.classList.remove(theme === 'light' ? 'light' : 'dark');
    document.documentElement.classList.add(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);
  return (
    <label className="btn btn-circle btn-ghost swap swap-rotate">
      {/* this hidden checkbox controls the state */}
      <input type="checkbox" className="theme-controller" checked={theme === 'light'} onChange={toggleTheme} />
      <Sun className="h-8 w-8 swap-on" />
      <Moon className="h-8 w-8 swap-off" />
    </label>
  );
}