import { motion, AnimatePresence } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../lib/theme";

export function ThemeToggle({ size = "default", className = "" }: { size?: "default" | "lg"; className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const dim = size === "lg" ? 44 : 36;
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`relative rounded-full border border-border bg-card hover:bg-muted transition overflow-hidden ${className}`}
      style={{ width: dim, height: dim }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -16, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 16, opacity: 0, rotate: 90 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          className="absolute inset-0 grid place-items-center"
        >
          {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function ThemeSwitchPair({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={`relative inline-flex p-1 rounded-full border border-border bg-card ${className}`}>
      {(["light", "dark"] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={`relative z-10 px-3 h-8 rounded-full text-xs inline-flex items-center gap-1.5 transition ${
            theme === t ? "text-white" : "text-foreground/70 hover:text-foreground"
          }`}
        >
          {theme === t && (
            <motion.span
              layoutId="themePill"
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="absolute inset-0 rounded-full brand-gradient -z-10"
            />
          )}
          {t === "light" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          <span className="capitalize">{t}</span>
        </button>
      ))}
    </div>
  );
}
