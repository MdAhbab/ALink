import * as React from "react";
import { MotionConfig } from "motion/react";
import { useAuth } from "./auth";

type AppearancePrefs = {
  density?: "comfortable" | "compact";
  accent?: "violet" | "amber" | "mint" | "rose";
  reduceMotion?: boolean;
};

function readLocalPrefs(): AppearancePrefs {
  try {
    const raw = localStorage.getItem("alink:prefs");
    return raw ? (JSON.parse(raw) as AppearancePrefs) : {};
  } catch {
    return {};
  }
}

/**
 * Applies the user's appearance preferences globally and at boot.
 *
 * Previously the Settings → Appearance "Reduce motion" and "Density" toggles
 * were persisted but never took effect: density was only set on <html> while
 * the Settings route was mounted, and reduce-motion was ignored entirely
 * (Framer Motion's JS-driven animations don't respond to a CSS media query).
 *
 * This gate reads the signed-in user's prefs (falling back to the locally
 * cached copy when logged out), reflects density via `data-density`, the accent
 * via `data-accent`, toggles a `reduce-motion` class for CSS transitions, and
 * wraps the tree in `MotionConfig` so Framer animations honour the toggle too.
 */
export function PreferencesGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const prefs = React.useMemo<AppearancePrefs>(
    () => ({ ...readLocalPrefs(), ...((user?.prefs as AppearancePrefs | undefined) ?? {}) }),
    [user?.prefs],
  );
  const reduceMotion = Boolean(prefs.reduceMotion);

  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = prefs.density ?? "comfortable";
    root.dataset.accent = prefs.accent ?? "violet";
    root.classList.toggle("reduce-motion", reduceMotion);
  }, [prefs.density, prefs.accent, reduceMotion]);

  return <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>{children}</MotionConfig>;
}
