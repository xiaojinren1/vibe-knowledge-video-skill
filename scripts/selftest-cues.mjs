#!/usr/bin/env node
/**
 * cues.ts 自检：元素级字幕锚定是纯计算，出一点偏差就会出现"画面比旁白早/晚半秒"。
 * 用 examples/ai-history/narration-timing.json 的真实 words 做断言。
 *
 * 用法：node scripts/selftest-cues.mjs
 * 需要 Node >= 22.6（内置 TypeScript type stripping）；低版本会跳过而不是报红。
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
let cues;
try {
  cues = await import("../template/src/kit/cues.ts");
} catch (err) {
  console.log("跳过：当前 Node 不支持 type stripping（需要 >= 22.6）。", String(err).slice(0, 80));
  process.exit(0);
}
const { findAnchor, anchorFrame, anchorSpan, normalizeCue, buildCharMap } = cues;

const timing = JSON.parse(fs.readFileSync(path.join(root, "examples/ai-history/narration-timing.json"), "utf8"));
const scene = timing.scenes[0];
const fail = [];
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? "✓" : "✗"} ${name}${ok ? "" : `  期望 ${JSON.stringify(want)} 实际 ${JSON.stringify(got)}`}`);
  if (!ok) fail.push(name);
};

console.log("cues.ts 自检 ·", scene.id, "·", scene.words.length, "words\n");

eq("归一化去掉标点", normalizeCue("先是参数，然后！"), "先是参数然后");
eq("字符流长度 = 词长之和", buildCharMap(scene.words).chars.length, scene.words.map((w) => normalizeCue(w.text).length).reduce((a, b) => a + b, 0));

const ai = findAnchor(scene.words, "人工智能");
eq("词表内的中文词命中", ai && Number(ai.start.toFixed(3)), 1.456);
eq("锚点 → 幕内帧（30fps）", anchorFrame(scene, "人工智能", 30), 44);

const mid = findAnchor(scene.words, "换过三次主角");
eq("跨 token 短语命中", Boolean(mid), true);
eq("跨 token 起点 = 首个 token 起点", mid && Number(mid.start.toFixed(3)), 2.133);
eq("跨 token 终点 = 末个 token 终点", mid && Number(mid.end.toFixed(3)), 3.318);

const punct = findAnchor(scene.words, "先是参数，");
eq("锚点带标点也能命中", Boolean(punct), true);

eq("不存在的锚点 → null", findAnchor(scene.words, "量子纠缠"), null);
eq("找不到时退到 fallback", anchorFrame(scene, "量子纠缠", 30, 12), 12);
eq("空锚点 → null", findAnchor(scene.words, "，。！"), null);
eq("无 words 的幕 → false", anchorSpan({ text: "没有旁白", }, "任何", 30), { from: 0, to: 0, found: false });

const span = anchorSpan(scene, "人工智能", 30);
eq("span 起点", span.from, 44);
eq("span 终点 ≥ 起点", span.to >= span.from, true);

// 重复出现的锚点取第一次：构造一个说过两次的场景
const twice = { text: "", words: [
  { text: "蛇身", start: 1, end: 1.4 },
  { text: "法相", start: 1.4, end: 1.9 },
  { text: "蛇身", start: 5, end: 5.4 },
  { text: "法相", start: 5.4, end: 5.9 },
] };
eq("重复锚点取第一次", Number(findAnchor(twice.words, "蛇身法相").start), 1);

console.log(fail.length ? `\n${fail.length} 项失败` : "\n全部通过");
process.exit(fail.length ? 1 : 0);
