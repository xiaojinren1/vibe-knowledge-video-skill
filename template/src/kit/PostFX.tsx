import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { post } from "./tokens";

/**
 * 后期质感层 —— 把「PPT 感」压下去的最便宜的一层。
 * 全部确定性：同一帧永远渲染出同一张图（seed 固定 + 只依赖 frame）。
 */
export const PostFX: React.FC<{
  grain?: number;
  vignette?: number;
  bloom?: number;
  aberration?: number;
}> = ({
  grain = post.grain,
  vignette = post.vignette,
  bloom = post.bloom,
  aberration = post.aberration,
}) => {
  const frame = useCurrentFrame();
  // 颗粒每 2 帧换一次种子，避免"死噪点"看起来像屏幕脏了
  const seed = Math.floor(frame / 2) % 7;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 暗角：径向渐变，压住四角 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 78% 68% at 50% 46%, rgba(0,0,0,0) 42%, rgba(0,0,0,${vignette}) 100%)`,
        }}
      />
      {/* 极轻度色差：只在中心区域，模拟镜头 */}
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: aberration * 12,
          background: `radial-gradient(circle at 50% 50%, rgba(255,60,60,0.5) 0%, rgba(0,0,0,0) 60%)`,
          transform: `translateX(${aberration * 100}px)`,
        }}
      />
      {/* 颗粒：feTurbulence，确定性 seed */}
      <AbsoluteFill style={{ opacity: grain, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id={`grain-${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} seed={seed} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
        </svg>
      </AbsoluteFill>
      {/* 高光泛光：中心一层柔光，让亮部"呼吸" */}
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: bloom,
          background: `radial-gradient(ellipse 40% 34% at 50% 40%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** 细网格背景：1px，极低对比，给画面一条"隐形的骨" */
export const GridBg: React.FC<{ color: string; step?: number; opacity?: number }> = ({
  color,
  step = 96,
  opacity = 0.06,
}) => (
  <AbsoluteFill
    style={{
      opacity,
      backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
      backgroundSize: `${step}px ${step}px`,
    }}
  />
);

/** 纸纹：低频湍流 + 叠加，替代纯色平面 */
export const PaperTexture: React.FC<{ opacity?: number }> = ({ opacity = 0.16 }) => (
  <AbsoluteFill style={{ opacity, mixBlendMode: "multiply" }}>
    <svg width="100%" height="100%">
      <filter id="paper">
        <feTurbulence type="fractalNoise" baseFrequency={0.008} numOctaves={4} seed={11} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper)" />
    </svg>
  </AbsoluteFill>
);
