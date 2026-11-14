import { useEffect, useRef } from "react";
import { EnceliumScene } from "./moon/encelium-scene.js";

/**
 * The moon from the app, on the site. Same scene file, so both stay identical.
 * It pauses when scrolled out of view, and turns off for people who prefer less motion.
 */
export function Moon({
  theme, w, h, r, plates = 110, jets = 11, speed = 95, rate = 3, seed = 7, active = true, className,
}: {
  theme: "light" | "dark"; w: number; h: number; r: number;
  plates?: number; jets?: number; speed?: number; rate?: number; seed?: number; active?: boolean; className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scene = new EnceliumScene(canvas, {
      w, h, theme, cx: w / 2, cy: h - r - 8, R: r, plates, jets, speed, rate, active, seed, transparent: true,
    });

    // Only draw while people can actually see it.
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? scene.play() : scene.pause()), { rootMargin: "80px" });
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? scene.pause() : scene.play());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      scene.destroy();
    };
    // The scene paints its lighting once, so a theme change builds a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, w, h, r]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
