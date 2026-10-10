export interface EnceladusSceneOptions {
  w: number; h: number; theme: "dark" | "light";
  cx: number; cy: number; R: number;
  plates?: number; tilt?: number; jets?: number; speed?: number; rate?: number;
  active?: boolean; seed?: number; transparent?: boolean;
}
export declare class EnceladusScene {
  constructor(canvas: HTMLCanvasElement, options: EnceladusSceneOptions);
  setActive(on: boolean): void;
  play(): void;
  pause(): void;
  destroy(): void;
}
