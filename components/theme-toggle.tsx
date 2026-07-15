/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useTheme } from "./theme-provider";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-[100px] bg-muted/40 rounded-lg animate-pulse" />;
  }

  const modes = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "System" },
  ];

  return (
    <div className="flex items-center bg-muted/40 border border-border p-1 rounded-lg select-none">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = theme === mode.value;

        return (
          <button
            key={mode.value}
            onClick={() => setTheme(mode.value)}
            title={`Switch to ${mode.label} theme`}
            className={`flex items-center justify-center p-1.5 rounded-md transition-all cursor-pointer ${
              isActive
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            <Icon className="size-3.5" />
            <span className="sr-only">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
