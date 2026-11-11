// 单一风格来源：styles/<id>.json → token
// 换风格只改这一个文件（或用 STYLE_ID 指向另一份 JSON），组件不动。
import styleJson from "../../styles/paper-editorial.json";

export const style = styleJson;

export const palette = {
  bInk: style.palette.ink,
  bPaper: style.palette.paper,
  bMuted: style.palette.muted,
  bSeal: style.palette.accent,
};

export const font = style.fonts;

export type TypeToken = { size: number; weight: number; track: string; leading: number };

const pick = (key: keyof typeof style.typography): TypeToken => {
  const t = style.typography[key] as { size: number; weight: number; track: string; leading: number };
  return { size: t.size, weight: t.weight, track: t.track, leading: t.leading };
};

export const type = {
  display: pick("display"),
  h1: pick("h1"),
  h2: pick("h2"),
  body: pick("body"),
  kicker: pick("kicker"),
};

export const ease = {
  emphasized: style.motion.reveal.curve as unknown as readonly [number, number, number, number],
  standard: style.motion.standard.curve as unknown as readonly [number, number, number, number],
  exit: style.motion.exit.curve as unknown as readonly [number, number, number, number],
};

export const springSoft = style.motion.springSoft;
export const springSnap = style.motion.springSnap;

export const post = style.postEffects;

export const captions = style.captions;
export const layout = style.layout;
export const audio = style.audio;
