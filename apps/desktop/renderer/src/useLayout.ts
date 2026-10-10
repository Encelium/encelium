import { useEffect, useState } from "react";

/** True while the media query matches (e.g. the window is narrow). */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** A remembered on/off choice (a per-computer convenience; fine to lose). */
export function useRemembered(key: string, initial: boolean) {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(key); return v === null ? initial : v === "1"; } catch { return initial; }
  });
  const set = (next: boolean) => {
    setValue(next);
    try { localStorage.setItem(key, next ? "1" : "0"); } catch { /* storage off: just don't remember */ }
  };
  return [value, set] as const;
}

/** A remembered number, e.g. the chat column's width. */
export function useRememberedNumber(key: string, initial: number) {
  const [value, setValue] = useState(() => {
    try { const v = Number(localStorage.getItem(key)); return Number.isFinite(v) && v > 0 ? v : initial; } catch { return initial; }
  });
  const set = (next: number) => {
    setValue(next);
    try { localStorage.setItem(key, String(Math.round(next))); } catch { /* not remembered */ }
  };
  return [value, set] as const;
}
