import { useEffect, useRef } from "react";
import { EnceladusScene } from "./enceladus-scene.js";
import s from "./MoonHero.module.css";

const SIZE = { w: 200, h: 220, R: 74 };

/**
 * The moon from the launch design, small and calm on the home screen. Vapor rises while
 * `active`. It stops drawing when the window is hidden or the moon is off screen, and is
 * gone completely once a task opens (the home screen unmounts).
 */
export function MoonHero({ theme, active }: { theme: "light" | "dark"; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EnceladusScene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new EnceladusScene(canvas, {
      ...SIZE, theme, cx: SIZE.w / 2, cy: SIZE.h - SIZE.R - 12,
      plates: 90, jets: 7, speed: 60, rate: 2.2, active, seed: 7, transparent: true,
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

  return <canvas ref={canvasRef} className={s.moon} aria-hidden="true" />;
}
