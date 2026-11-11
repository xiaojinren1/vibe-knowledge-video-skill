import React from "react";
import { AbsoluteFill, Audio, Series, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import timing from "../../narration-timing.json";
import { ClipReveal, cubicBezier } from "../kit/anim";
import { audio as audioTok, captions as capTok, font, palette, post } from "../kit/tokens";
import { PaperTexture, PostFX } from "../kit/PostFX";

/* ========================================================================
   AI 十四年 · 纸感编辑风
   6 幕：hook / foundation / scale / multimodal / china / prospect
   ===================================================================== */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const prog = (frame: number, delay: number, dur: number, curve: readonly [number, number, number, number] = [0.16, 1, 0.3, 1]) =>
  cubicBezier(clamp01((frame - delay) / dur), ...curve);

/* ---------------- 字幕 ---------------- */
const splitChunks = (text: string): string[] => {
  const parts = text.split(/(?<=[。！？])/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p.length <= capTok.maxCharsPerCue) {
      out.push(p);
      continue;
    }
    let buf = "";
    for (const seg of p.split(/(?<=[，、；])/)) {
      if ((buf + seg).length > capTok.maxCharsPerCue && buf) {
        out.push(buf);
        buf = seg;
      } else buf += seg;
    }
    if (buf) out.push(buf);
  }
  return out;
};

const Captions: React.FC<{ text: string; audioSeconds: number }> = ({ text, audioSeconds }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunks = splitChunks(text);
  const totalChars = chunks.reduce((n, c) => n + c.length, 0) || 1;
  const start = capTok.leadIn * fps;
  const span = Math.max(1, audioSeconds * fps);
  let acc = 0;
  const cues = chunks.map((c) => {
    const from = start + (acc / totalChars) * span;
    acc += c.length;
    const to = start + (acc / totalChars) * span;
    return { text: c, from, to };
  });
  const active = cues.find((c) => frame >= c.from && frame < c.to + 0.35 * fps);
  if (!active) return null;
  const p = prog(frame, active.from, 12);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: capTok.bottom, display: "flex", justifyContent: "center", opacity: p * 0.92 }}>
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

/* ---------------- 版式零件 ---------------- */
const Header: React.FC<{ index: string; title: string }> = ({ index, title }) => (
  <ClipReveal delay={8} style={{ position: "absolute", left: 140, top: 96 }}>
    <div style={{ fontFamily: font.mono, fontSize: 22, letterSpacing: "0.24em", color: palette.bMuted }}>
      {index} · {title}
    </div>
  </ClipReveal>
);

const Rule: React.FC<{ delay?: number }> = ({ delay = 6 }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, delay, 30);
  return (
    <div
      style={{
        position: "absolute",
        left: 140,
        right: 140,
        top: 150,
        height: 1,
        background: palette.bInk,
        opacity: 0.28 * p,
        transform: `scaleX(${p})`,
        transformOrigin: "left center",
      }}
    />
  );
};

const Source: React.FC<{ text: string; delay?: number }> = ({ text, delay = 40 }) => (
  <ClipReveal delay={delay} style={{ position: "absolute", right: 140, bottom: 76 }}>
    <div style={{ fontFamily: font.mono, fontSize: 17, letterSpacing: "0.05em", color: palette.bMuted, opacity: 0.8 }}>{text}</div>
  </ClipReveal>
);

const Serif: React.FC<{ size: number; weight?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  size,
  weight = 700,
  color = palette.bInk,
  children,
  style,
}) => (
  <div style={{ fontFamily: font.serif, fontSize: size, fontWeight: weight, color, lineHeight: 1.3, letterSpacing: "0.02em", ...style }}>
    {children}
  </div>
);

const Mono: React.FC<{ size?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  size = 22,
  color = palette.bMuted,
  children,
  style,
}) => <div style={{ fontFamily: font.mono, fontSize: size, color, letterSpacing: "0.14em", ...style }}>{children}</div>;

const BigNumber: React.FC<{ value: number; decimals?: number; suffix?: string; size?: number; color?: string; frame: number; delay: number; dur?: number }> = ({
  value,
  decimals = 0,
  suffix = "",
  size = 200,
  color = palette.bSeal,
  frame,
  delay,
  dur = 40,
}) => {
  const p = prog(frame, delay, dur);
  const shown = (value * p).toFixed(decimals);
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      <div
        style={{
          fontFamily: font.serif,
          fontSize: size,
          fontWeight: 700,
          lineHeight: 0.95,
          color,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {shown}
      </div>
      {suffix ? (
        <div style={{ fontFamily: font.serif, fontSize: size * 0.34, fontWeight: 700, color, marginTop: size * 0.08, marginLeft: 10 }}>{suffix}</div>
      ) : null}
    </div>
  );
};

/* ---------------- 幕 1：钩子 ---------------- */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const chips = ["参数", "数据", "智能体"];
  return (
    <AbsoluteFill>
      <Header index="壹" title="十四年" />
      <Rule />
      <div style={{ position: "absolute", left: 140, top: 236, width: 1500 }}>
        <ClipReveal delay={16} duration={30}>
          <Serif size={132} style={{ lineHeight: 1.24 }}>
            十四年
          </Serif>
        </ClipReveal>
        <ClipReveal delay={30} duration={30}>
          <Serif size={132} color={palette.bSeal} style={{ lineHeight: 1.24, marginLeft: 110 }}>
            三次换主角
          </Serif>
        </ClipReveal>
      </div>

      <div style={{ position: "absolute", left: 146, top: 660, display: "flex", gap: 26 }}>
        {chips.map((c, i) => {
          const p = prog(frame, 96 + i * 16, 24);
          const last = i === chips.length - 1;
          return (
            <div
              key={c}
              style={{
                opacity: p,
                transform: `translateY(${(1 - p) * 14}px)`,
                border: `1px solid ${last ? palette.bSeal : "rgba(28,24,20,0.25)"}`,
                background: last ? "rgba(178,58,47,0.07)" : "rgba(255,255,255,0.45)",
                padding: "16px 34px",
              }}
            >
              <Serif size={38} weight={700} color={last ? palette.bSeal : palette.bInk}>
                {c}
              </Serif>
            </div>
          );
        })}
      </div>
      <Mono style={{ position: "absolute", left: 146, top: 610, opacity: prog(frame, 88, 20) }}>三次范式转移</Mono>
      <div
        style={{
          position: "absolute",
          right: 150,
          top: 300,
          writingMode: "vertical-rl",
          fontFamily: font.mono,
          fontSize: 26,
          letterSpacing: "0.42em",
          color: palette.bMuted,
          opacity: prog(frame, 110, 30) * 0.75,
        }}
      >
        2012 — 2026
      </div>
      <Source text="叙事概括 · 非单点事实" delay={130} />
    </AbsoluteFill>
  );
};

/* ---------------- 幕 2：地基 ---------------- */
const Foundation: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = [
    { label: "2011 · 最好的传统方法", value: 26.2, color: palette.bMuted },
    { label: "2012 · AlexNet", value: 15.3, color: palette.bSeal },
  ];
  return (
    <AbsoluteFill>
      <Header index="贰" title="地基 · 2012 / 2017" />
      <Rule />
      <div style={{ position: "absolute", left: 140, top: 226, width: 900 }}>
        <ClipReveal delay={10}>
          <Serif size={62} style={{ lineHeight: 1.4 }}>
            错误率一刀砍掉
          </Serif>
        </ClipReveal>
        <ClipReveal delay={18}>
          <Serif size={62} color={palette.bSeal} style={{ lineHeight: 1.4 }}>
            十一个百分点
          </Serif>
        </ClipReveal>
      </div>

      {/* 下落对比条 */}
      <div style={{ position: "absolute", left: 140, top: 520, width: 900 }}>
        {rows.map((r, i) => {
          const p = prog(frame, 52 + i * 14, 34);
          return (
            <div key={r.label} style={{ marginBottom: 40, opacity: p }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", width: 820 }}>
                <Serif size={32} weight={500}>
                  {r.label}
                </Serif>
                <Mono size={30} color={r.color}>
                  {r.value.toFixed(1)}%
                </Mono>
              </div>
              <div style={{ marginTop: 12, height: 10, width: 820, background: "rgba(28,24,20,0.09)" }}>
                <div style={{ height: 10, width: (820 * r.value) / 30, background: r.color }} />
              </div>
            </div>
          );
        })}
        <div style={{ opacity: prog(frame, 96, 24) }}>
          <Serif size={30} weight={500} color={palette.bMuted} style={{ lineHeight: 1.7 }}>
            同一场比赛（ILSVRC），同一年代，换了一个网络结构。
          </Serif>
        </div>
      </div>

      {/* 2017 Transformer */}
      <div style={{ position: "absolute", right: 140, top: 300, width: 640 }}>
        <div
          style={{
            opacity: prog(frame, 120, 26),
            transform: `translateY(${(1 - prog(frame, 120, 26)) * 18}px)`,
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(28,24,20,0.16)",
            boxShadow: "0 14px 34px rgba(28,24,20,0.10)",
            padding: "30px 32px",
          }}
        >
          <Mono size={20}>2017 · 论文</Mono>
          <div style={{ marginTop: 14 }}>
            <Serif size={44} style={{ lineHeight: 1.45 }}>
              Attention
              <br />
              Is All You Need
            </Serif>
          </div>
          <div style={{ marginTop: 18 }}>
            <Serif size={29} weight={500} color={palette.bInk} style={{ opacity: 0.78, lineHeight: 1.7 }}>
              注意力取代循环结构：
              <br />
              模型第一次能并行读完一整段文字。
            </Serif>
          </div>
        </div>
      </div>
      <Source text="AlexNet 2012 · Vaswani 等 2017" delay={150} />
    </AbsoluteFill>
  );
};

/* ---------------- 幕 3：规模 ---------------- */
const Scale: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Header index="叁" title="规模 · 2020 / 2022" />
      <Rule />
      <div style={{ position: "absolute", left: 140, top: 230 }}>
        <Mono size={20}>2020 · GPT-3 参数量</Mono>
        <div style={{ marginTop: 6 }}>
          <BigNumber value={1750} suffix="亿" size={190} frame={frame} delay={16} dur={50} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 140, top: 560 }}>
        <Mono size={20}>2022 · ChatGPT 破亿用户用时</Mono>
        <div style={{ marginTop: 6 }}>
          <BigNumber value={2} suffix="个月" size={190} frame={frame} delay={96} dur={40} />
        </div>
      </div>

      {/* 增长曲线 */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={1040} y1={800} x2={1720} y2={800} stroke={palette.bInk} strokeWidth={1} opacity={0.2} />
        <path
          d="M 1040 790 C 1200 786, 1320 700, 1420 470 S 1610 220, 1700 190"
          fill="none"
          stroke={palette.bSeal}
          strokeWidth={3}
          strokeDasharray={1400}
          strokeDashoffset={1400 * (1 - prog(frame, 40, 90))}
          opacity={0.9}
        />
        {[
          { x: 1040, y: 790, label: "2020" },
          { x: 1700, y: 190, label: "2025" },
        ].map((pt, i) => (
          <g key={pt.label} opacity={prog(frame, 60 + i * 60, 24)}>
            <circle cx={pt.x} cy={pt.y} r={9} fill={palette.bPaper} stroke={palette.bSeal} strokeWidth={2.5} />
            <text x={pt.x} y={840} textAnchor="middle" fontFamily={font.mono} fontSize={22} fill={palette.bMuted} letterSpacing="0.1em">
              {pt.label}
            </text>
          </g>
        ))}
        <text
          x={1180}
          y={240}
          fontFamily={font.mono}
          fontSize={21}
          fill={palette.bSeal}
          opacity={prog(frame, 130, 24)}
          letterSpacing="0.1em"
        >
          能力 / 规模 · 对数增长
        </text>
      </svg>
      <Source text="GPT-3 2020 · UBS 2023 估算" delay={150} />
    </AbsoluteFill>
  );
};

/* ---------------- 幕 4：多模态与推理 ---------------- */
const Multimodal: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [
    { year: "2023.03", name: "看图", note: "GPT-4 接受图像输入", glyph: "image" },
    { year: "2024.02", name: "拍片", note: "Sora 用文字生成视频", glyph: "video" },
    { year: "2024.09", name: "推理", note: "o1 先想再答", glyph: "reason" },
  ] as const;
  return (
    <AbsoluteFill>
      <Header index="肆" title="从读文字，到看世界" />
      <Rule />
      <div style={{ position: "absolute", left: 140, top: 226 }}>
        <ClipReveal delay={10}>
          <Serif size={64} style={{ lineHeight: 1.4 }}>
            模型不再只是接话
          </Serif>
        </ClipReveal>
        <ClipReveal delay={20}>
          <Serif size={64} color={palette.bSeal} style={{ lineHeight: 1.4 }}>
            它开始推理
          </Serif>
        </ClipReveal>
      </div>

      <div style={{ position: "absolute", left: 140, top: 540, display: "flex", gap: 34 }}>
        {cards.map((c, i) => {
          const p = prog(frame, 76 + i * 26, 26);
          return (
            <div
              key={c.name}
              style={{
                width: 500,
                opacity: p,
                transform: `translateY(${(1 - p) * 26}px) rotate(${i === 1 ? 0.4 : i === 2 ? -0.5 : 0}deg)`,
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(28,24,20,0.16)",
                boxShadow: "0 14px 34px rgba(28,24,20,0.10)",
                padding: "26px 30px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Mono size={19}>{c.year}</Mono>
                <svg width="40" height="40" viewBox="0 0 40 40">
                  {c.glyph === "image" && (
                    <>
                      <rect x="4" y="8" width="32" height="24" fill="none" stroke={palette.bSeal} strokeWidth="2" />
                      <circle cx="13" cy="16" r="3" fill={palette.bSeal} />
                      <path d="M6 30 L16 20 L24 28 L30 23 L34 30" fill="none" stroke={palette.bSeal} strokeWidth="2" />
                    </>
                  )}
                  {c.glyph === "video" && (
                    <>
                      <rect x="4" y="8" width="32" height="24" fill="none" stroke={palette.bSeal} strokeWidth="2" />
                      <path d="M16 14 L28 20 L16 26 Z" fill={palette.bSeal} />
                    </>
                  )}
                  {c.glyph === "reason" && (
                    <>
                      <circle cx="10" cy="20" r="3.4" fill={palette.bSeal} />
                      <circle cx="20" cy="20" r="3.4" fill={palette.bSeal} opacity="0.7" />
                      <circle cx="30" cy="20" r="3.4" fill={palette.bSeal} opacity="0.4" />
                      <path d="M13 20 H17 M23 20 H27" stroke={palette.bSeal} strokeWidth="2" />
                    </>
                  )}
                </svg>
              </div>
              <div style={{ marginTop: 16 }}>
                <Serif size={66} style={{ lineHeight: 1.2 }}>
                  {c.name}
                </Serif>
              </div>
              <div style={{ marginTop: 12 }}>
                <Serif size={28} weight={500} color={palette.bInk} style={{ opacity: 0.78, lineHeight: 1.6 }}>
                  {c.note}
                </Serif>
              </div>
            </div>
          );
        })}
      </div>
      <Source text="GPT-4 2023 · Sora 2024 · o1 2024" delay={168} />
    </AbsoluteFill>
  );
};

/* ---------------- 幕 5：开源追上来 ---------------- */
const China: React.FC = () => {
  const frame = useCurrentFrame();
  const W = 1180;
  const gap = 26 * (1 - prog(frame, 150, 60));
  return (
    <AbsoluteFill>
      <Header index="伍" title="2025 · 开源追上来" />
      <Rule />
      <div style={{ position: "absolute", left: 140, top: 226, width: 1100 }}>
        <ClipReveal delay={10}>
          <Serif size={62} style={{ lineHeight: 1.4 }}>
            同一时间
          </Serif>
        </ClipReveal>
        <ClipReveal delay={18}>
          <Serif size={62} color={palette.bSeal} style={{ lineHeight: 1.4 }}>
            换了打法
          </Serif>
        </ClipReveal>
      </div>

      <div style={{ position: "absolute", left: 140, top: 520, width: W + 160 }}>
        <Mono size={19}>能力基准（示意）</Mono>
        {[
          { label: "闭源前沿", value: 100, color: palette.bInk, dashed: false },
          { label: "开源阵营", value: 100 - gap, color: palette.bSeal, dashed: true },
        ].map((row, i) => {
          const p = prog(frame, 70 + i * 16, 40);
          const width = ((W * row.value) / 100) * (i === 1 ? prog(frame, 90, 70) : 1);
          return (
            <div key={row.label} style={{ marginTop: 26, opacity: p }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: W }}>
                <Serif size={30} weight={500}>
                  {row.label}
                </Serif>
                <Mono size={26} color={row.color}>
                  {row.value.toFixed(0)}
                </Mono>
              </div>
              <div style={{ marginTop: 10, height: 12, width: W, background: "rgba(28,24,20,0.08)", position: "relative" }}>
                <div style={{ height: 12, width, background: row.dashed ? "rgba(178,58,47,0.85)" : row.color }} />
                {row.dashed ? (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        left: width,
                        top: -14,
                        height: 40,
                        borderLeft: `2px dashed ${palette.bSeal}`,
                        opacity: prog(frame, 160, 30),
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: width + 12,
                        top: -6,
                        fontFamily: font.mono,
                        fontSize: 20,
                        color: palette.bSeal,
                        letterSpacing: "0.1em",
                        opacity: prog(frame, 168, 26),
                      }}
                    >
                      差半步
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 22, opacity: prog(frame, 170, 24) }}>
          <Serif size={30} weight={500} color={palette.bMuted} style={{ lineHeight: 1.7 }}>
            差值从「一代以上」，缩到「半步」——而且权重是公开的。
          </Serif>
        </div>
      </div>

      <div style={{ position: "absolute", right: 120, top: 300, width: 620 }}>
        <div
          style={{
            opacity: prog(frame, 110, 26),
            transform: `translateY(${(1 - prog(frame, 110, 26)) * 16}px)`,
            borderLeft: `3px solid ${palette.bSeal}`,
            paddingLeft: 26,
          }}
        >
          <Mono size={20}>2025.01 · DeepSeek-R1</Mono>
          <div style={{ marginTop: 12 }}>
            <Serif size={34} style={{ lineHeight: 1.55 }}>
              用远低的成本
              <br />
              做出接近前沿的推理
            </Serif>
          </div>
          <div style={{ marginTop: 14 }}>
            <Serif size={26} weight={500} color={palette.bInk} style={{ opacity: 0.75, lineHeight: 1.7 }}>
              Qwen、Kimi、GLM 接着跟上。开源第一次追到只差半步。
            </Serif>
          </div>
        </div>
      </div>
      <Source text="DeepSeek-R1 2025-01 · Qwen Blog" delay={190} />
    </AbsoluteFill>
  );
};

/* ---------------- 幕 6：接下来 ---------------- */
const Prospect: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    { no: "01", title: "连续干几小时的活", note: "长程自主任务，而不是一问一答" },
    { no: "02", title: "每百万 token 的成本", note: "还能掉多少，决定谁能用得起" },
    { no: "03", title: "智能体接管重复劳动", note: "从「帮我想」到「帮我做完」" },
  ];
  return (
    <AbsoluteFill>
      <Header index="陆" title="接下来" />
      <Rule />
      <div style={{ position: "absolute", left: 140, top: 220 }}>
        <ClipReveal delay={8}>
          <Serif size={64} style={{ lineHeight: 1.4 }}>
            看三件事
          </Serif>
        </ClipReveal>
      </div>

      <div style={{ position: "absolute", left: 140, top: 400, width: 1500 }}>
        {items.map((it, i) => {
          const p = prog(frame, 40 + i * 26, 26);
          return (
            <div
              key={it.no}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 30,
                padding: "22px 0",
                borderBottom: "1px solid rgba(28,24,20,0.14)",
                opacity: p,
                transform: `translateX(${(1 - p) * -18}px)`,
              }}
            >
              <Mono size={26} color={palette.bSeal}>
                {it.no}
              </Mono>
              <Serif size={50} style={{ lineHeight: 1.3 }}>
                {it.title}
              </Serif>
              <Serif size={28} weight={500} color={palette.bMuted} style={{ lineHeight: 1.5 }}>
                {it.note}
              </Serif>
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", left: 140, top: 762, opacity: prog(frame, 150, 26) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ background: palette.bSeal, color: palette.bPaper, fontFamily: font.mono, fontSize: 20, padding: "6px 14px", letterSpacing: "0.14em" }}>
            分歧
          </div>
          <Serif size={34} weight={500} style={{ opacity: 0.85 }}>
            大力出奇迹还能撑多久？
          </Serif>
        </div>
      </div>
      <Source text="趋势判断 · 非事实陈述" delay={190} />
    </AbsoluteFill>
  );
};

/* ---------------- 装配 ---------------- */
const REGISTRY: Record<string, React.FC> = {
  hook: Hook,
  foundation: Foundation,
  scale: Scale,
  multimodal: Multimodal,
  china: China,
  prospect: Prospect,
};

const SceneShell: React.FC<{ scene: (typeof timing)["scenes"][number]; children: React.ReactNode }> = ({ scene, children }) => (
  <AbsoluteFill>
    {children}
    <Captions text={scene.text} audioSeconds={scene.audioSeconds} />
    <Audio src={staticFile(`audio/narr-${scene.id}.mp3`)} />
  </AbsoluteFill>
);

export const AiHistory: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bPaper }}>
      <PaperTexture opacity={0.13} />
      <Series>
        {timing.scenes.map((scene) => {
          const C = REGISTRY[scene.id] ?? Hook;
          return (
            <Series.Sequence key={scene.id} durationInFrames={Math.round(scene.seconds * fps)}>
              <SceneShell scene={scene}>
                <C />
              </SceneShell>
            </Series.Sequence>
          );
        })}
      </Series>
      <Audio
        src={staticFile("audio/bgm.wav")}
        loop
        volume={(f) => {
          const fadeOut = Math.min(1, Math.max(0, (durationInFrames - f) / (audioTok.bgmFadeOut * fps)));
          const fadeIn = Math.min(1, Math.max(0, f / (audioTok.bgmFadeIn * fps)));
          return audioTok.bgmVolume * fadeIn * fadeOut;
        }}
      />
      <PostFX grain={post.grain} vignette={post.vignette} bloom={post.bloom} aberration={post.aberration} />
    </AbsoluteFill>
  );
};
