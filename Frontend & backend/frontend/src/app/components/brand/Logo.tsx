import { motion } from "motion/react";
import { useTheme } from "../../lib/theme";
import logoLight from "../../../system_images/Alink_whitemode_logo.jpeg";
import logoDark from "../../../system_images/Alink_darkmode_logo.jpeg";

export function Logo({ size = 28, withMark = true, withWord = true, className = "" }: { size?: number; withMark?: boolean; withWord?: boolean; className?: string }) {
  const { theme } = useTheme();
  const logoSrc = theme === "dark" ? logoDark : logoLight;
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {withMark && (
        <motion.img
          src={logoSrc}
          alt="ALink logo"
          width={size}
          height={size}
          className="block"
          style={{ width: size, height: size }}
          initial={{ rotate: -8, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
        />
      )}
      {withWord && (
        <span className="font-serif text-[1.35em] leading-none tracking-tight">
          A<span className="brand-gradient-text">link</span>
        </span>
      )}
    </div>
  );
}
