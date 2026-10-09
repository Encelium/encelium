import type { SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

type IconDef = { paths: string[]; directional?: boolean };

// Stroke icons on a 24px grid. "directional" icons mirror in right-to-left layouts.
const defs = {
  plus: { paths: ["M12 5v14", "M5 12h14"] },
  arrowUp: { paths: ["M12 19V5", "M5 12l7-7 7 7"] },
  arrowRight: { paths: ["M5 12h14", "M12 5l7 7-7 7"], directional: true },
  check: { paths: ["M5 12.5l4.5 4.5L19 7.5"] },
  close: { paths: ["M6 6l12 12", "M18 6L6 18"] },
  paperclip: { paths: ["M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l8-8"] },
  folder: { paths: ["M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"] },
  rewind: { paths: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"], directional: true },
  wrench: { paths: ["M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"] },
  trash: { paths: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"] },
  download: { paths: ["M12 3v12", "M7 10l5 5 5-5", "M4 19h16"] },
  shield: { paths: ["M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z", "M8.5 12.5l2.5 2.5 4.5-5"] },
  lock: { paths: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"] },
  browser: { paths: ["M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z", "M3 9h18", "M7 6.5h.01", "M10 6.5h.01"] },
  folderSort: { paths: ["M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z", "M8 14h8"] },
  repeat: { paths: ["M17 2l4 4-4 4", "M3 11v-1a4 4 0 0 1 4-4h14", "M7 22l-4-4 4-4", "M21 13v1a4 4 0 0 1-4 4H3"] },
  plug: { paths: ["M9 7V3", "M15 7V3", "M7 7h10v4a5 5 0 0 1-10 0z", "M12 16v5"] },
  alert: { paths: ["M12 4l9.5 16.5h-19z", "M12 10v4", "M12 17.3v.1"] },
  info: { paths: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v5", "M12 7.8v.1"] },
  settings: { paths: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"] },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof defs;

export function Icon({ name, size = 16, className, ...rest }: IconProps & { name: IconName }) {
  const def: IconDef = defs[name];
  const cls = [def.directional ? "enc-directional" : "", className ?? ""].join(" ").trim() || undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cls}
      {...rest}
    >
      {def.paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
