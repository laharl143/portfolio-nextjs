"use client";

import { Button } from "@/components/ui/button";
import { FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "next-themes";

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="md"
      className="rounded-full"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <FaSun className="absolute h-10 w-10 rotate-0 scale-100 dark:-rotate-90 dark:scale-0">Light</FaSun>
      <FaMoon className="absolute h-10 w-10 rotate-90 scale-0 dark:-rotate-90 dark:scale-100">Dark</FaMoon>
    </Button>
  );
}
