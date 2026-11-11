import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { ease } from "./tokens";

/** 裁切显现：从下往上揭开一行字（比淡入高级，且中文尤其吃这个） */
export const ClipReveal: React.FC<{
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, duration = 22, children, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const rise = (1 - p) * 18;
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <div
        style={{
          transform: `translateY(${rise}px)`,
          clipPath: `inset(${(1 - p) * 100}% 0% 0% 0%)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** 通用插值，统一使用曲线表而不是 linear */
export const useEase = (delay: number, duration: number, curve: readonly [number, number, number, number] = ease.standard) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => cubicBezier(t, ...curve),
  });
};

/** 极简 cubic-bezier 求值（x → y），避免额外依赖 */
export function cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  let lo = 0;
  let hi = 1;
  let u = t;
  for (let i = 0; i < 18; i++) {
    const x = sampleX(u);
    if (Math.abs(x - t) < 1e-5) break;
    if (x < t) lo = u;
    else hi = u;
    u = (lo + hi) / 2;
  }
  return sampleY(u);
}

/** 逐项错开（stagger）：让元素依次进入，而不是一起出现 */
export const stagger = (index: number, delay = 0, gap = 5) => delay + index * gap;
