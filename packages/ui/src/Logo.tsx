import { useId } from "react";

/**
 * The Enceladus mark: the moon with the Greek Ε (Epsilon) cut into it like its cracks.
 * Uses currentColor, so it follows the surrounding text color in both themes.
 */
export function Logo({ size = 20, title }: { size?: number; title?: string }) {
  const mask = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
          <rect width="48" height="48" fill="#fff" />
          <rect x="18" y="14.6" width="34" height="3.8" rx="1.9" fill="#000" />
          <rect x="18" y="29.6" width="34" height="3.8" rx="1.9" fill="#000" />
          <rect x="36" y="16" width="14" height="16" fill="#000" />
        </mask>
      </defs>
      <circle cx="24" cy="24" r="20" fill="currentColor" mask={`url(#${mask})`} />
    </svg>
  );
}
