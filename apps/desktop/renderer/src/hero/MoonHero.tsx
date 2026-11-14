import { useEffect, useRef } from "react";
import { EnceliumScene } from "./encelium-scene.js";
import s from "./MoonHero.module.css";

// Room above the moon for the vapor to rise into.
const SIZE = { w: 300, h: 330, R: 100 };

/**
 * The moon from the launch design, on the home screen. Vapor rises while `active`.
 * It stops drawing when the window is hidden or the moon is off screen, and is gone
 * completely once a task opens (the home screen unmounts).
 */
export function MoonHero({ theme, active, className }: { theme: "light" | "dark"; active: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EnceliumScene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new EnceliumScene(canvas, {
      ...SIZE, theme, cx: SIZE.w / 2, cy: SIZE.h - SIZE.R - 8,
      plates: 100, jets: 8, speed: 80, rate: 2.4, active, seed: 7, transparent: true,
    });
    sceneRef.current = scene;
    const onVisibility = () => (document.hidden ? scene.pause() : scene.play());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      scene.destroy();
      sceneRef.current = null;
    };
    // The scene paints its lighting once, so a theme change builds a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => { sceneRef.current?.setActive(active); }, [active]);

  return <canvas ref={canvasRef} className={[s.moon, className].filter(Boolean).join(" ")} aria-hidden="true" />;
}
