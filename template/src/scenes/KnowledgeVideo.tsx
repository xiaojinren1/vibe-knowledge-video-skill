import React from "react";
import { AbsoluteFill, Audio, Series, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import timing from "../../narration-timing.json";
import { ClipReveal, cubicBezier } from "../kit/anim";
import { audio as audioTok, captions as capTok, font, palette, post } from "../kit/tokens";
import { PaperTexture, PostFX } from "../kit/PostFX";

/* ---------- 通用 ---------- */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const prog = (frame: number, delay: number, dur: number, curve: readonly [number, number, number, number] = [0.16, 1, 0.3, 1]) =>
  cubicBezier(clamp01((frame - delay) / dur), ...curve);

const T = Object.fromEntries(timing.scenes.map((s) => [s.id, s])) as Record<
  string,
  { id: string; text: string; audioSeconds: number; seconds: number }
>;

/* ---------- 字幕：按句切块，按字数分配时间 ---------- */
const splitChunks = (text: string): string[] => {
  const parts = text.split(/(?<=[。！？])/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p.length <= capTok.maxCharsPerCue) out.push(p);
    else {
      // 长句按逗号再切，保证每屏 ≤ 22 字
      let buf = "";
      for (const seg of p.split(/(?<=[，、；])/)) {
        if ((buf + seg).length > capTok.maxCharsPerCue && buf) {
          out.push(buf);
          buf = seg;
        } else buf += seg;
      }
      if (buf) out.push(buf);
    }
  }
  return out;
};

const Captions: React.FC<{ text: string; audioSeconds: number; sceneSeconds: number }> = ({ text, audioSeconds, sceneSeconds }) => {
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

/* ---------- 版式零件 ---------- */
const PageHeader: React.FC<{ index: string; title: string; delay?: number }> = ({ index, title, delay = 8 }) => (
  <ClipReveal delay={delay} style={{ position: "absolute", left: 140, top: 96 }}>
    <div style={{ fontFamily: font.mono, fontSize: 22, letterSpacing: "0.24em", color: palette.bMuted }}>
      {index} · {title}
    </div>
  </ClipReveal>
);

const Rule: React.FC<{ top?: number; delay?: number }> = ({ top = 150, delay = 6 }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, delay, 30);
  return (
    <div
      style={{
        position: "absolute",
        left: 140,
        right: 140,
        top,
        height: 1,
        background: palette.bInk,
        opacity: 0.28 * p,
        transform: `scaleX(${p})`,
        transformOrigin: "left center",
      }}
    />
  );
};

const Footer: React.FC<{ note?: string; delay?: number }> = ({ note = "RE-CONSTRUCTION · 2026", delay = 10 }) => (
  <ClipReveal delay={delay} style={{ position: "absolute", left: 140, bottom: 74 }}>
    <div style={{ fontFamily: font.mono, fontSize: 19, letterSpacing: "0.18em", color: palette.bMuted }}>{note}</div>
  </ClipReveal>
);

const SourceNote: React.FC<{ text: string; delay?: number }> = ({ text, delay = 14 }) => (
  <ClipReveal delay={delay} style={{ position: "absolute", right: 140, bottom: 74 }}>
    <div style={{ fontFamily: font.mono, fontSize: 18, letterSpacing: "0.06em", color: palette.bMuted, opacity: 0.85 }}>
      {text}
    </div>
  </ClipReveal>
);

const Seal: React.FC<{ text: string; delay?: number; size?: number; right?: number; top?: number }> = ({
  text,
  delay = 2,
  size = 148,
  right = 168,
  top = 210,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, delay, 16);
  const scale = 0.82 + 0.18 * p + 0.03 * Math.sin(Math.PI * clamp01(p));
  return (
    <div
      style={{
        position: "absolute",
        right,
        top,
        width: size,
        height: size,
        background: palette.bSeal,
        transform: `scale(${scale}) rotate(-3deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: p,
        boxShadow: "0 10px 30px rgba(28,24,20,0.16)",
      }}
    >
      <div
        style={{
          fontFamily: font.serif,
          fontSize: size * 0.31,
          fontWeight: 700,
          color: palette.bPaper,
          letterSpacing: "0.1em",
          lineHeight: 1.25,
          display: "flex",
          flexDirection: "column",
          textAlign: "center",
        }}
      >
        {text.split("").map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>
    </div>
  );
};

const Serif: React.FC<{ size: number; weight?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  size,
  weight = 700,
  color = palette.bInk,
  children,
  style,
}) => (
  <div
    style={{
      fontFamily: font.serif,
      fontSize: size,
      fontWeight: weight,
      color,
      lineHeight: 1.3,
      letterSpacing: "0.02em",
      ...style,
    }}
  >
    {children}
  </div>
);

const Scene: React.FC<{ id: string; children: React.ReactNode; captions?: boolean; footer?: string; source?: string }> = ({
  id,
  children,
  captions = true,
  footer,
  source,
}) => {
  const t = T[id];
  return (
    <AbsoluteFill>
      {children}
      {footer ? <Footer note={footer} delay={20} /> : null}
      {source ? <SourceNote text={source} delay={26} /> : null}
      {captions ? <Captions text={t.text} audioSeconds={t.audioSeconds} sceneSeconds={t.seconds} /> : null}
      <Audio src={staticFile(`audio/narr-${id}.mp3`)} />
    </AbsoluteFill>
  );
};

/* ---------- S1 钩子 ---------- */
const HookScene: React.FC = () => (
  <AbsoluteFill>
    <PageHeader index="壹" title="记忆的形状" />
    <Rule />
    <Seal text="重建" top={196} />
    <div style={{ position: "absolute", left: 140, top: 252, width: 1360 }}>
      <ClipReveal delay={20} duration={30}>
        <Serif size={112} style={{ lineHeight: 1.3 }}>
          你的记忆里
        </Serif>
      </ClipReveal>
      <ClipReveal delay={32} duration={30}>
        <Serif size={112} style={{ lineHeight: 1.3, marginLeft: 96 }}>
          没有一件事
        </Serif>
      </ClipReveal>
      <ClipReveal delay={44} duration={30}>
        <Serif size={112} color={palette.bSeal} style={{ lineHeight: 1.3, marginLeft: 96 }}>
          是原样保存的
        </Serif>
      </ClipReveal>
    </div>
    <ClipReveal delay={92} style={{ position: "absolute", left: 186, top: 790, width: 1500 }}>
      <Serif size={34} weight={500} style={{ opacity: 0.78, lineHeight: 1.7 }}>
        海马体不播放录像带。它按此刻的目标，把碎片重新拼一次。
      </Serif>
    </ClipReveal>
  </AbsoluteFill>
);

/* ---------- S2 图式改写 ---------- */
const SchemaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [
    { tag: "初读", body: "独木舟、死人、幽灵。读者读不懂，只能硬记。", drift: 0 },
    { tag: "第二次复述", body: "独木舟变成了船，幽灵变成了梦。", drift: 0.34 },
    { tag: "第五次复述", body: "一个关于「打猎遇险」的普通故事。", drift: 0.72 },
  ];
  return (
    <AbsoluteFill>
      <PageHeader index="贰" title="实验 · 1932" />
      <Rule />
      <div style={{ position: "absolute", left: 140, top: 250, width: 780 }}>
        <ClipReveal delay={10}>
          <Serif size={72} style={{ lineHeight: 1.35 }}>
            陌生的故事
          </Serif>
        </ClipReveal>
        <ClipReveal delay={20}>
          <Serif size={72} color={palette.bSeal} style={{ lineHeight: 1.35 }}>
            会被复述成熟悉的样子
          </Serif>
        </ClipReveal>
        <ClipReveal delay={64} style={{ marginTop: 40, width: 700 }}>
          <div style={{ width: 96, height: 2, background: palette.bSeal, opacity: 0.55 }} />
        </ClipReveal>
        <ClipReveal delay={74} style={{ marginTop: 20, width: 700 }}>
          <Serif size={33} weight={500} style={{ opacity: 0.78, lineHeight: 1.8 }}>
            巴特利特让英国读者复述一段北美原住民的鬼故事。
            <br />
            复述几次后，独木舟变成了船，超自然的情节被圆成了常理。
          </Serif>
        </ClipReveal>
      </div>

      <div style={{ position: "absolute", right: 140, top: 250, width: 720 }}>
        {cards.map((c, i) => {
          const p = prog(frame, 34 + i * 26, 26);
          const drift = c.drift * prog(frame, 40 + i * 26, 40);
          return (
            <div
              key={c.tag}
              style={{
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(28,24,20,0.16)",
                boxShadow: "0 14px 34px rgba(28,24,20,0.10)",
                padding: "24px 30px",
                marginBottom: 22,
                opacity: p,
                transform: `translateY(${(1 - p) * 26}px) rotate(${i % 2 === 0 ? -0.7 : 0.5}deg)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div style={{ fontFamily: font.mono, fontSize: 20, letterSpacing: "0.16em", color: palette.bMuted }}>{c.tag}</div>
                <div style={{ fontFamily: font.mono, fontSize: 20, color: palette.bSeal }}>偏移 {Math.round(drift * 100)}%</div>
              </div>
              <div style={{ marginTop: 14 }}>
                <Serif size={29} weight={500} style={{ lineHeight: 1.62 }}>
                  {c.body}
                </Serif>
              </div>
              <div style={{ marginTop: 16, height: 3, background: "rgba(28,24,20,0.10)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, width: `${drift * 100}%`, background: palette.bSeal }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- S3 提问改写 ---------- */
const QuestionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const a = 34 + 6.8 * prog(frame, 26, 40);
  const b = 34;
  const grown = (x: number) => 700 * (x / 45);
  const delta = prog(frame, 108, 26);
  return (
    <AbsoluteFill>
      <PageHeader index="叁" title="实验 · 1974" />
      <Rule />
      <div style={{ position: "absolute", left: 140, top: 236, width: 900 }}>
        <ClipReveal delay={8}>
          <Serif size={68} style={{ lineHeight: 1.4 }}>
            换一个动词
          </Serif>
        </ClipReveal>
        <ClipReveal delay={16}>
          <Serif size={68} color={palette.bSeal} style={{ lineHeight: 1.4 }}>
            就能换掉一段记忆
          </Serif>
        </ClipReveal>
      </div>

      <div style={{ position: "absolute", left: 140, top: 540, width: 900 }}>
        {[
          { label: "「撞碎」smashed", value: a, color: palette.bSeal },
          { label: "「撞上」hit", value: b, color: palette.bMuted },
        ].map((row, i) => {
          const p = prog(frame, 44 + i * 12, 30);
          return (
            <div key={row.label} style={{ marginBottom: 34, opacity: p }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", width: 760 }}>
                <div style={{ fontFamily: font.serif, fontSize: 34, color: palette.bInk }}>{row.label}</div>
                <div style={{ fontFamily: font.mono, fontSize: 30, color: row.color }}>{row.value.toFixed(1)} mph</div>
              </div>
              <div style={{ marginTop: 12, height: 8, width: 760, background: "rgba(28,24,20,0.10)" }}>
                <div style={{ height: 8, width: grown(row.value), background: row.color }} />
              </div>
            </div>
          );
        })}

        {/* 对齐参考线：把两条条的末端对上，差值自己看得出来 */}
        <div style={{ position: "relative", height: 0, opacity: delta }}>
          <div
            style={{
              position: "absolute",
              left: grown(b),
              top: -104,
              height: 104,
              borderLeft: `1px dashed ${palette.bSeal}`,
              opacity: 0.5,
            }}
          />
        </div>

        <div style={{ marginTop: 22, opacity: prog(frame, 118, 26) }}>
          <Serif size={30} weight={500} color={palette.bMuted} style={{ lineHeight: 1.6 }}>
            同一场车祸，同一段影像。动词不同，速度估计差了 6.8 mph。
          </Serif>
        </div>
      </div>

      <div style={{ position: "absolute", right: 140, top: 290, width: 640 }}>
        <div style={{ opacity: prog(frame, 130, 26), transform: `translateY(${(1 - prog(frame, 130, 26)) * 18}px)` }}>
          <div style={{ fontFamily: font.mono, fontSize: 20, letterSpacing: "0.18em", color: palette.bMuted }}>一周后追问</div>
          <div style={{ marginTop: 16 }}>
            <Serif size={44} style={{ lineHeight: 1.5 }}>
              「你看到
              <span style={{ color: palette.bSeal }}>碎玻璃</span>
              了吗？」
            </Serif>
          </div>
          <div style={{ marginTop: 22 }}>
            <Serif size={30} weight={500} style={{ lineHeight: 1.7, opacity: 0.82 }}>
              现场没有碎玻璃。
              <br />
              但「撞碎」那一组，更多人说自己看见了。
            </Serif>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- S4 再巩固 ---------- */
const ReconsolidationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const points = [0, 1, 2, 3];
  const X0 = 300;
  const STEP = 420;
  const Y = 700;
  return (
    <AbsoluteFill>
      <PageHeader index="肆" title="机制 · 再巩固" />
      <Rule />
      <div style={{ position: "absolute", left: 140, top: 232, width: 1500 }}>
        <ClipReveal delay={8}>
          <Serif size={74} style={{ lineHeight: 1.4 }}>
            每次回忆，都是一次
          </Serif>
        </ClipReveal>
        <ClipReveal delay={18}>
          <Serif size={74} color={palette.bSeal} style={{ lineHeight: 1.4 }}>
            拆开重写
          </Serif>
        </ClipReveal>
      </div>

      <ClipReveal delay={26} style={{ position: "absolute", left: 140, top: 470, width: 1300 }}>
        <Serif size={33} weight={500} style={{ lineHeight: 1.7, opacity: 0.9 }}>
          记忆被取出的那几分钟里，它不再稳固——这是全片唯一能被写入的时刻。
        </Serif>
      </ClipReveal>

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0 - 80} y1={Y} x2={X0 + STEP * 3 + 120} y2={Y} stroke={palette.bInk} strokeWidth={1} opacity={0.22} />
        <text
          x={X0 - 92}
          y={Y + 6}
          textAnchor="end"
          fontFamily={font.mono}
          fontSize={20}
          fill={palette.bMuted}
          letterSpacing="0.1em"
        >
          原件
        </text>
        {points.map((i) => {
          const p = prog(frame, 40 + i * 40, 24);
          const tail = prog(frame, 48 + i * 40, 44);
          return (
            <g key={i} opacity={p}>
              <circle cx={X0 + i * STEP} cy={Y} r={11} fill={palette.bPaper} stroke={palette.bInk} strokeWidth={2} />
              <path
                d={`M ${X0 + i * STEP} ${Y} q ${STEP * 0.5} ${-78 * tail} ${STEP} 0`}
                fill="none"
                stroke={palette.bSeal}
                strokeWidth={2}
                strokeDasharray={7}
                opacity={0.8 * tail}
              />
              {i === 0 && (
                <text
                  x={X0 + STEP * 0.5}
                  y={Y - 86}
                  textAnchor="middle"
                  fontFamily={font.mono}
                  fontSize={20}
                  fill={palette.bSeal}
                  letterSpacing="0.14em"
                  opacity={Math.max(0, (tail - 0.6) / 0.4)}
                >
                  不稳定窗口
                </text>
              )}
              <text
                x={X0 + i * STEP}
                y={Y + 56}
                textAnchor="middle"
                fontFamily={font.mono}
                fontSize={22}
                fill={palette.bMuted}
                letterSpacing="0.12em"
              >
                {["第 1 次", "第 2 次", "第 3 次", "第 4 次"][i]}
              </text>
            </g>
          );
        })}
        <path
          d={`M ${X0} ${Y + 150} C ${X0 + 300} ${Y + 120}, ${X0 + 700} ${Y + 60}, ${X0 + STEP * 3} ${Y + 6}`}
          fill="none"
          stroke={palette.bSeal}
          strokeWidth={3}
          strokeDasharray={1600}
          strokeDashoffset={1600 * (1 - prog(frame, 200, 70))}
          opacity={0.85}
        />
        <text
          x={X0 + STEP * 3 - 6}
          y={Y + 200}
          textAnchor="end"
          fontFamily={font.mono}
          fontSize={21}
          fill={palette.bSeal}
          letterSpacing="0.1em"
          opacity={prog(frame, 236, 26)}
        >
          这一次的版本 · 不是原件
        </text>
      </svg>

      <ClipReveal delay={250} style={{ position: "absolute", left: 140, top: 846, width: 1240 }}>
        <Serif size={32} weight={500} color={palette.bMuted} style={{ lineHeight: 1.7 }}>
          重新固化之后，你得到的不是原件，是这一次的版本；下一次再取出，改写接着发生。
        </Serif>
      </ClipReveal>
    </AbsoluteFill>
  );
};

/* ---------- S5 收束 ---------- */
const EndingScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Rule delay={4} />
      <div style={{ position: "absolute", left: 140, top: 282, width: 1500 }}>
        <ClipReveal delay={10} duration={30}>
          <Serif size={122} style={{ lineHeight: 1.28 }}>
            「我记得」
          </Serif>
        </ClipReveal>
        <ClipReveal delay={26} duration={30}>
          <Serif size={122} style={{ lineHeight: 1.28, marginLeft: 108 }}>
            不等于它发生过
          </Serif>
        </ClipReveal>
      </div>
      <div style={{ position: "absolute", left: 140, top: 700, width: 1400 }}>
        <ClipReveal delay={64}>
          <div style={{ width: 96, height: 2, background: palette.bSeal, opacity: 0.55 }} />
        </ClipReveal>
        <ClipReveal delay={74} style={{ marginTop: 22 }}>
          <Serif size={36} weight={500} style={{ opacity: 0.8, lineHeight: 1.75 }}>
            记忆不是档案，是每一次都在重写的草稿。
          </Serif>
        </ClipReveal>
      </div>
      <div style={{ position: "absolute", left: 140, bottom: 150, opacity: prog(frame, 110, 24) }}>
        <div style={{ fontFamily: font.mono, fontSize: 22, letterSpacing: "0.16em", color: palette.bMuted }}>
          下一期 · 为什么你会记得一件没发生过的事
        </div>
      </div>
      <Seal text="改写" delay={40} top={286} right={186} size={132} />
    </AbsoluteFill>
  );
};

/* ---------- 通用幕：brief 里没注册的 id 走这里，任何选题都能出片 ---------- */
const GenericScene: React.FC<{ title: string; text: string }> = ({ title, text }) => {
  const parts = title.split(/[，,：:]/).filter(Boolean);
  const lines = parts.length > 1 ? parts.slice(0, 2) : [title];
  const bodyLines = text.split(/(?<=[。！？])/).filter(Boolean);
  return (
    <AbsoluteFill>
      <PageHeader index="·" title="讲解" />
      <Rule />
      <div style={{ position: "absolute", left: 140, top: 272, width: 1480 }}>
        {lines.map((line, i) => (
          <ClipReveal key={i} delay={16 + i * 12} duration={30}>
            <Serif
              size={110}
              color={i === lines.length - 1 && lines.length > 1 ? palette.bSeal : palette.bInk}
              style={{ lineHeight: 1.32 }}
            >
              {line}
            </Serif>
          </ClipReveal>
        ))}
      </div>
      <div style={{ position: "absolute", left: 186, top: 700, width: 1360 }}>
        {bodyLines.slice(0, 3).map((l, i) => (
          <ClipReveal key={i} delay={54 + i * 10} style={{ marginTop: 10 }}>
            <Serif size={34} weight={500} style={{ opacity: 0.78, lineHeight: 1.75 }}>
              {l}
            </Serif>
          </ClipReveal>
        ))}
      </div>
      <Seal text="讲解" delay={30} top={214} />
    </AbsoluteFill>
  );
};

/* ---------- 幕注册表：专属设计按 id 挂这里 ---------- */
const REGISTRY: Record<string, React.FC> = {
  hook: HookScene,
  schema: SchemaScene,
  question: QuestionScene,
  reconsolidation: ReconsolidationScene,
  ending: EndingScene,
};

const META: Record<string, { footer?: string; source?: string; captions?: boolean }> = {
  hook: { footer: "壹 · 记忆的形状" },
  schema: { footer: "贰 · 图式", source: "Bartlett, Remembering, 1932" },
  question: { footer: "叁 · 提问", source: "Loftus & Palmer, 1974" },
  reconsolidation: { footer: "肆 · 再巩固", source: "Nader 等, 2000 · 再巩固" },
  ending: { footer: "伍 · 收束", captions: false },
};

/* ---------- 主片 ---------- */
export const KnowledgeVideo: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const scenes = timing.scenes;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bPaper }}>
      <PaperTexture opacity={0.13} />
      <Series>
        {scenes.map((scene) => {
          const Designed = REGISTRY[scene.id];
          const meta = META[scene.id] ?? {};
          return (
            <Series.Sequence key={scene.id} durationInFrames={Math.round(scene.seconds * fps)}>
              <Scene id={scene.id} footer={meta.footer} source={meta.source} captions={meta.captions !== false}>
                {Designed ? <Designed /> : <GenericScene title={scene.title ?? scene.id} text={scene.text} />}
              </Scene>
            </Series.Sequence>
          );
        })}
      </Series>

      {/* BGM：循环铺底，首尾淡入淡出 */}
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
