import { useCurrentFrame, useVideoConfig } from "remotion";
import { anchorFrame, anchorSpan, type TimedScene } from "./cues";

/**
 * React 侧的锚点工具：把 cues.ts 的纯计算接到当前帧上。
 * 组件里用 `const rise = useAnchor(T.mechanism, "蛇身法相")`，
 * 再把它当 delay 传给 ClipReveal / 箭头 / 标注，改旁白不必重数帧。
 */

/** 锚点相对幕首的帧号（同一幕内所有元素共用一条时间轴）。 */
export function useAnchor(scene: TimedScene | undefined, anchor: string, fallback = 0): number {
  const { fps } = useVideoConfig();
  return anchorFrame(scene, anchor, fps, fallback);
}

/** 0→1 的进度：说到该短语之前是 0，说完之后是 1；找不到锚点时按 fadeFrames 淡入。 */
export function useAnchorProgress(scene: TimedScene | undefined, anchor: string, fadeFrames = 4): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { from, to, found } = anchorSpan(scene, anchor, fps);
  if (!found) return Math.min(1, (frame + 1) / Math.max(1, fadeFrames));
  if (frame <= from) return 0;
  if (frame >= to) return 1;
  return Math.min(1, (frame - from) / Math.max(1, to - from));
}

/** 当前是否正处于该短语的播读区间（做「高亮跟读」用）。 */
export function useAnchorActive(scene: TimedScene | undefined, anchor: string): boolean {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { from, to, found } = anchorSpan(scene, anchor, fps);
  return found && frame >= from && frame <= to;
}
