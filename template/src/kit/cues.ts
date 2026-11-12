/**
 * 元素级字幕锚定（纯函数，不依赖 Remotion，可单独跑自检）。
 *
 * 为什么需要：幕级时长已经由旁白决定（make-narration.py 回写），但幕里
 * 每个图形/标注/箭头的出点仍在手写 `delay={26}`。改一句旁白，delay 全部错位。
 * 这里用 edge-tts 的 words（字级边界）把一段短语定位到真实配音时间。
 *
 *   import { findAnchor, anchorFrame } from "../kit/cues";
 *   const rise = anchorFrame(T.mechanism, "蛇身法相");   // 幕内相对帧
 *
 * 找不到锚点（错字、词序不符、还没跑旁白）时返回 fallback，不会让渲染失败。
 */

export type CueWord = { text: string; start: number; end: number };

export type TimedScene = {
  id?: string;
  text: string;
  seconds?: number;
  audioSeconds?: number;
  words?: CueWord[];
};

// 与 make-srt.py / Captions.tsx 的 clean() 保持一致：标点与空白不参与对齐
const IGNORABLE = /[\s，。！？、；：,.!?;:"'“”‘’（）()[\]{}—–…·《》<>/\\|-]/g;
export const normalizeCue = (s: string) => s.replace(IGNORABLE, "");

/** 把 words 拼成一条字符流，并记录每个字符属于哪个词。 */
export function buildCharMap(words: readonly CueWord[]) {
  const chars: string[] = [];
  const owner: number[] = [];
  words.forEach((w, i) => {
    for (const ch of normalizeCue(w.text)) {
      chars.push(ch);
      owner.push(i);
    }
  });
  return { chars: chars.join(""), owner };
}

/**
 * 在 words 里定位一段短语，返回它在配音里的起止秒。
 * 多次出现取第一次（同一句里重复同一个词，第一个通常才是画面该出的时候）。
 */
export function findAnchor(words: readonly CueWord[] | undefined, anchor: string): { start: number; end: number } | null {
  if (!words || words.length === 0) return null;
  const needle = normalizeCue(anchor);
  if (!needle) return null;
  const { chars, owner } = buildCharMap(words);
  const at = chars.indexOf(needle);
  if (at < 0) return null;
  const first = owner[at];
  const last = owner[Math.min(at + needle.length - 1, owner.length - 1)];
  return { start: words[first].start, end: words[last].end };
}

/** 锚点相对幕首的帧号；找不到时用 fallback（默认 0，即幕首）。 */
export function anchorFrame(scene: TimedScene | undefined, anchor: string, fps = 30, fallback = 0): number {
  const hit = findAnchor(scene?.words, anchor);
  if (!hit) return fallback;
  return Math.max(0, Math.round(hit.start * fps));
}

/** 锚点的持续区间（相对幕首），给「说到哪高亮到哪」这类效果用。 */
export function anchorSpan(
  scene: TimedScene | undefined,
  anchor: string,
  fps = 30
): { from: number; to: number; found: boolean } {
  const hit = findAnchor(scene?.words, anchor);
  if (!hit) return { from: 0, to: 0, found: false };
  return { from: Math.round(hit.start * fps), to: Math.round(hit.end * fps), found: true };
}

/** 幕内所有锚点一次算完，便于在组件顶部集中声明。 */
export function anchorMap(
  scene: TimedScene | undefined,
  anchors: readonly string[],
  fps = 30
): Record<string, number> {
  return Object.fromEntries(anchors.map((a) => [a, anchorFrame(scene, a, fps)]));
}
