import { Swords } from "lucide-react";

/**
 * Solearn brand logo — text + sword icon.
 * Uses the brutalist display font treatment.
 */
export function SolearnLogo({ size = "default" }: { size?: "default" | "sm" }) {
  return (
    <a href="/" className="flex items-center gap-2 no-underline">
      <Swords
        className="text-brand-jade"
        strokeWidth={3}
        size={size === "sm" ? 20 : 28}
      />
      <span
        className={
          size === "sm"
            ? "font-heading text-xl font-black tracking-tight"
            : "heading-xl"
        }
      >
        solearn
      </span>
    </a>
  );
}
