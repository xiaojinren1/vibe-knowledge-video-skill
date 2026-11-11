import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/* ========================================================================
   卷宗档案风零件（archive-dossier）
   一套里只有这几件：纸、页眉页脚、印章、红线、证物框、按行切分的字幕。
   全部 frame 驱动、全部确定性（同帧永远同图）。
   ======================================================================== */

export type DossierTokens = {
  ink: string;
  paper: string;
  card: string;
  muted: string;
  accent: string;
  fonts: { title: string; body: string; mono: string };
  captions: { baseline: number; maxCharsPerCue: number; leadIn: number; leadOut: number; backdrop: string; textColor: string };
  layout: { header: { left: number; top: number }; headerRule: { left: number; right: number; top: number }; footerRule: { top: number }; footer: { left: number; top: number }; safeArea: { top: number; bottom: number } };
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 纸：底色 + 纤维 + 边缘泛黄。全片一层，不要每个场景各画一遍。 */
export const PaperBg: React.FC<{ t: DossierTokens }> = ({ t }) => (
  <AbsoluteFill style={{ background: t.paper }}>
    <AbsoluteFill style={{ opacity: 0.55 }}>
      <svg width="100%" height="100%">
        <filter id="dossier-fibers">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed={9} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#dossier-fibers)" opacity={0.14} />
      </svg>
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 78% 66% at 50% 44%, rgba(0,0,0,0) 40%, rgba(74,58,34,0.28) 100%)" }} />
  </AbsoluteFill>
);

/** 页眉页脚：全片同一套锚点，别每幕重摆 */
export const Chrome: React.FC<{ t: DossierTokens; page: number; total: number; label?: string; caseNo?: string }> = ({
  t,
  page,
  total,
  label,
  caseNo = "CASE No. 0000",
}) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{ position: "absolute", left: t.layout.header.left, top: t.layout.header.top, fontFamily: t.fonts.mono, fontSize: 22, letterSpacing: "0.24em", color: t.muted }}>{caseNo}</div>
    <div style={{ position: "absolute", right: t.layout.header.left, top: t.layout.header.top, fontFamily: t.fonts.mono, fontSize: 22, letterSpacing: "0.18em", color: t.muted }}>
      {String(page).padStart(2, "0")} / {String(total).padStart(2, "0")}
    </div>
    <div style={{ position: "absolute", left: t.layout.headerRule.left, right: t.layout.headerRule.right, top: t.layout.headerRule.top, height: 2, background: "rgba(32,32,29,0.22)" }} />
    {label ? <div style={{ position: "absolute", left: t.layout.header.left, top: t.layout.headerRule.top + 16, fontFamily: t.fonts.body, fontSize: 24, letterSpacing: "0.18em", color: t.muted }}>{label}</div> : null}
    <div style={{ position: "absolute", left: t.layout.headerRule.left, right: t.layout.headerRule.right, top: t.layout.footerRule.top, height: 2, background: "rgba(32,32,29,0.22)" }} />
    <div style={{ position: "absolute", left: t.layout.footer.left, top: t.layout.footer.top, fontFamily: t.fonts.mono, fontSize: 20, letterSpacing: "0.1em", color: "rgba(32,32,29,0.4)" }}>
      内部资料 · 非最终结论
    </div>
  </AbsoluteFill>
);

/** 印章：砸下来带过冲；1–3 字横排，4 字排 2×2，5 字以上竖排 */
export const Stamp: React.FC<{
  t: DossierTokens;
  x: number;
  y: number;
  text: string;
  size?: number;
  rot?: number;
  delay?: number;
  fontSize?: number;
  outline?: boolean;
}> = ({ t, x, y, text, size = 200, rot = -9, delay = 0, fontSize = 54, outline = false }) => {
  const f = useCurrentFrame();
  if (f < delay) return null;
  const p = clamp01((f - delay) / 7);
  const scale = 1 + (1 - easeOut(p)) * 0.55;
  const chars = Array.from(text);
  const layout: React.CSSProperties =
    chars.length > 4
      ? { writingMode: "vertical-rl" }
      : chars.length === 4
        ? { display: "grid", gridTemplateColumns: "1fr 1fr", placeItems: "center" }
        : {};
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${scale})`,
        border: `${Math.max(4, size * 0.035)}px solid ${t.accent}`,
        borderRadius: size * 0.06,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: t.accent,
        background: outline ? "transparent" : "rgba(165,50,42,0.03)",
        fontFamily: t.fonts.title,
        fontWeight: 700,
        fontSize,
        letterSpacing: "0.04em",
        lineHeight: 1.1,
        opacity: 0.55 + 0.45 * easeOut(p),
      }}
    >
      <div style={{ ...layout, textAlign: "center" }}>{chars.length === 4 ? chars.map((c, i) => <span key={i}>{c}</span>) : text}</div>
    </div>
  );
};

/** 手绘抖动线：把折线拆成小段加偏移。红线、时间轴、批注箭头都用它 */
export const handLine = (pts: [number, number][], seed = 1, jitter = 2) => {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const steps = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 24));
    for (let s = 1; s <= steps; s++) {
      const k = s / steps;
      const x = x0 + (x1 - x0) * k + (rnd(seed + i * 7 + s) - 0.5) * jitter;
      const y = y0 + (y1 - y0) * k + (rnd(seed + i * 13 + s * 3) - 0.5) * jitter;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  return d;
};

/** 红线：逐段生长，只表示"来源 → 结论" */
export const RedString: React.FC<{ t: DossierTokens; width: number; height: number; pts: [number, number][]; delay?: number; dur?: number; lineWidth?: number; seed?: number }> = ({
  t,
  width,
  height,
  pts,
  delay = 0,
  dur = 26,
  lineWidth = 2.6,
  seed = 5,
}) => {
  const f = useCurrentFrame();
  const p = easeOut((f - delay) / dur);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
      <path d={handLine(pts, seed, 1.6)} fill="none" stroke={t.accent} strokeWidth={lineWidth} opacity={0.85} strokeDasharray={2400} strokeDashoffset={2400 * (1 - p)} strokeLinecap="round" />
    </svg>
  );
};

/** 证物框。没有授权素材时，用抽象条纹 + EVIDENCE 编号占位，绝不放无授权图片 */
export const PhotoCard: React.FC<{
  t: DossierTokens;
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  code: string;
  title: string;
  delay?: number;
}> = ({ t, x, y, w, h, rot = 0, code, title, delay = 0 }) => {
  const f = useCurrentFrame();
  if (f < delay) return null;
  const p = easeOut((f - delay) / 14);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `rotate(${rot}deg) translateY(${(1 - p) * 22}px)`,
        opacity: p,
        background: t.card,
        border: `2px solid ${t.ink}`,
        padding: 12,
        boxShadow: "0 4px 0 rgba(32,32,29,0.16)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: h - 74,
          background: "repeating-linear-gradient(135deg, rgba(32,32,29,0.13) 0 9px, rgba(32,32,29,0.05) 9px 18px)",
          border: "1px solid rgba(32,32,29,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: t.fonts.mono,
          fontSize: 18,
          letterSpacing: "0.2em",
          color: "rgba(32,32,29,0.45)",
        }}
      >
        {code}
      </div>
      <div style={{ marginTop: 10, fontFamily: t.fonts.body, fontSize: 26, color: t.ink, letterSpacing: "0.06em" }}>{title}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  字幕：按人工写好的行切分                                            */
/* ------------------------------------------------------------------ */
export type Word = { text: string; start: number; end: number };

/**
 * 为什么不按字数均分：中文 TTS 的字级边界是"词"，不是"字"。
 * 均分会把句子切在词组中间（"有人把旧 | 录像截出"）。
 * 正确做法：人工写好每一行字幕，再按"每行字数"去吃掉对应的 word 边界。
 */
export const buildCues = (words: Word[], lines: string[]) => {
  if (!lines.length || !words.length) return [];
  const stripped = lines.map((l) => l.replace(/[，。、；：？！,.;:?!\s“”—·]/g, ""));
  const cues: { text: string; start: number; end: number }[] = [];
  let wi = 0;
  for (let i = 0; i < lines.length; i++) {
    const target = stripped[i].length || 1;
    let acc = 0;
    const start = words[wi]?.start ?? 0;
    while (wi < words.length && acc < target) {
      acc += words[wi].text.trim().length;
      wi++;
    }
    const end = words[Math.max(0, wi - 1)]?.end ?? start + 1;
    cues.push({ text: lines[i], start, end: Math.max(end, start + 0.4) });
  }
  return cues;
};

export const Captions: React.FC<{ t: DossierTokens; words: Word[]; lines: string[] }> = ({ t, words, lines }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = f / fps;
  const cues = React.useMemo(() => buildCues(words, lines), [words, lines]);
  const cue = cues.find((c) => now >= c.start - t.captions.leadIn && now <= c.end + t.captions.leadOut);
  if (!cue) return null;
  const local = clamp01((now - cue.start + t.captions.leadIn) / 0.18);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: t.captions.baseline, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          background: t.captions.backdrop,
          color: t.captions.textColor,
          fontFamily: t.fonts.title,
          fontSize: t.captions.maxCharsPerCue > 16 ? 42 : 46,
          fontWeight: 700,
          letterSpacing: "0.05em",
          padding: "16px 30px",
          borderRadius: 4,
          opacity: local,
          transform: `translateY(${(1 - local) * 8}px)`,
        }}
      >
        {cue.text}
      </div>
    </div>
  );
};
