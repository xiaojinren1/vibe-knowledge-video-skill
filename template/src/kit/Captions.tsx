import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { cubicBezier } from "./anim";
import { captions as capTok, font, palette } from "./tokens";

/**
 * 字幕：优先用 edge-tts 的字级边界（narration-timing.json 的 words），
 * 做到「说到哪个字，字幕就跟到哪个字」；没有 words 时按字数均分兜底。
 */

export type Word = { text: string; start: number; end: number };

const IGNORABLE = /[\s，。！？、；：,.!?;:"'“”‘’（）()[\]{}—–…·《》<>/\\|-]/g;
const clean = (s: string) => s.replace(IGNORABLE, "");

// 句尾不留句号/逗号：字幕惯例（问号、感叹号保留）
const TRAILING = /[。，、；：,.;:\s　]+$/;
const stripTail = (s: string) => s.replace(TRAILING, "").trim();

const splitChunks = (text: string, limit: number): string[] => {
  const out: string[] = [];
  const sentences = text.split(/(?<=[。！？!?])/).map((s) => s.trim()).filter(Boolean);
  for (const sentence of sentences) {
    if (clean(sentence).length <= limit) {
      out.push(sentence);
      continue;
    }
    let buf = "";
    for (const clause of sentence.split(/(?<=[，、；,;：:])/)) {
      if (clean(buf + clause).length > limit && buf) {
        out.push(buf);
        buf = clause;
      } else buf += clause;
    }
    if (buf) out.push(buf);
  }
  return out;
};

const charSpans = (words: Word[]): Array<[number, number]> => {
  const spans: Array<[number, number]> = [];
  for (const w of words) {
    const text = clean(w.text ?? "");
    for (let i = 0; i < text.length; i++) spans.push([w.start, w.end]);
  }
  return spans;
};

const cuesFromWords = (text: string, chunks: string[], words: Word[], leadIn: number) => {
  const spans = charSpans(words);
  const total = clean(text).length;
  if (!spans.length || !total) return null;
  if (Math.abs(spans.length - total) > Math.max(3, Math.floor(total * 0.15))) return null; // 对齐不可靠，回退
  const cues: Array<{ text: string; from: number; to: number }> = [];
  let cursor = 0;
  for (const chunk of chunks) {
    const n = clean(chunk).length;
    if (!n) continue;
    const from = leadIn + spans[Math.min(cursor, spans.length - 1)][0];
    cursor += n;
    const to = leadIn + spans[Math.min(cursor, spans.length) - 1][1];
    cues.push({ text: stripTail(chunk), from, to });
  }
  return cues;
};

const cuesProportional = (chunks: string[], audioSeconds: number, leadIn: number) => {
  const weights = chunks.map((c) => Math.max(1, clean(c).length));
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = leadIn;
  return chunks.map((chunk, i) => {
    const dur = (audioSeconds * weights[i]) / total;
    const cue = { text: stripTail(chunk), from: cursor, to: cursor + dur };
    cursor += dur;
    return cue;
  });
};

export const Captions: React.FC<{ text: string; audioSeconds: number; words?: Word[] }> = ({ text, audioSeconds, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunks = splitChunks(text, capTok.maxCharsPerCue);
  const leadIn = capTok.leadIn;
  const cues = (words && cuesFromWords(text, chunks, words, leadIn)) || cuesProportional(chunks, audioSeconds, leadIn);

  const t = frame / fps;
  const active = cues.find((c) => t >= c.from && t < c.to + 0.12);
  if (!active) return null;
  const p = cubicBezier(Math.min(1, Math.max(0, (t - active.from) / 0.16)), 0.16, 1, 0.3, 1);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: capTok.bottom,
        display: "flex",
        justifyContent: "center",
        opacity: p * 0.92,
        transform: `translateY(${(1 - p) * 8}px)`,
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          padding: "14px 30px",
          background: capTok.backdrop,
          borderRadius: 3,
          fontFamily: font.serif,
          fontSize: 36,
          lineHeight: 1.5,
          letterSpacing: "0.02em",
          color: palette.bInk,
          textAlign: "center",
        }}
      >
        {active.text}
      </div>
    </div>
  );
};
