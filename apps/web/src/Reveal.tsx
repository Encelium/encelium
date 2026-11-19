import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Scroll reveal: children rise gently into place once, when they enter the view.
 * With reduced motion they are simply there — nothing moves.
 */
export function Reveal({ as: Tag = "div", delay = 0, className, style, children, ...rest }: {
  as?: "div" | "section" | "li" | "figure";
  delay?: number; className?: string; style?: CSSProperties; children?: ReactNode;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.classList.add("rv-in"); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("rv-in"); io.disconnect(); }
    }, { threshold: 0, rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    // @ts-expect-error — polymorphic tag
    <Tag ref={ref} className={["rv", className].filter(Boolean).join(" ")} style={{ "--d": `${delay}ms`, ...style }} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Parallax: decorative layers drift at their own speed while scrolling.
 * A single rAF loop per element, transform-only, disabled for reduced motion.
 */
 export function useParallax(speed: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const centerDelta = rect.top + rect.height / 2 - innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-centerDelta * speed).toFixed(1)}px, 0)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);
  return ref;
}
