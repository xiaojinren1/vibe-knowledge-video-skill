# 元素级字幕锚定：让画面「说到才出现」

> 结论先行：**幕级时长已经由旁白决定，但幕内每个元素还在手写 `delay={26}`。**
> 改一句旁白、换个 TTS 语速，所有固定帧号就集体错位，只能靠反复看静帧去凑。
> 锚点机制把元素的出点绑到 `words`（edge-tts 字级边界）上：旁白说到那个词，元素才出现。

思路来自 [geeklee/srt-whiteboard-animation](https://github.com/geeklee/srt-whiteboard-animation)（MIT）——
它把"字幕说到谁，谁先出场"做成了元素级的标注数据；本项目用同一套思路，但不引入它的渲染器（我们已有 Remotion）。

## 一、数据从哪来

`scripts/make-narration.py` 已经把 edge-tts 的 `WordBoundary` 写进 `narration-timing.json`：

```json
{ "id": "mechanism", "text": "过去十四年，人工智能换过三次主角…",
  "words": [{ "text": "人工智能", "start": 1.456, "end": 2.107 }, …] }
```

粒度是 2–4 字一个 token，单位是**秒**，相对本幕起点。锚点就是在这些 token 上做字符串匹配。

## 二、三步用法

```tsx
import { anchorFrame, anchorMap } from "../kit/cues";      // 纯函数，可在组件外算
import { useAnchor, useAnchorProgress } from "../kit/useAnchor";  // React 版

// 1) 幕内集中声明锚点，避免散落在 JSX 里
const A = anchorMap(T.mechanism, ["蛇身法相", "冷白灵光", "金钵"]);

// 2) 把锚点当 delay 用（同一个数字既能当 delay，也能当 Sequence 的 from）
<Arrow delay={A["蛇身法相"]} />
<ClipReveal delay={A["冷白灵光"]}>…</ClipReveal>

// 3) 需要「说到哪个词，高亮哪个词」时用进度版
const p = useAnchorProgress(T.mechanism, "冷白灵光");
<Highlight opacity={p} />
```

`useAnchor(scene, anchor, fallback?)` 在组件内直接用；`anchorFrame(scene, anchor, fps, fallback)` 用于非组件上下文。

## 三、锚点怎么写（先看这五条）

| 规则 | 原因 |
|---|---|
| **逐字出现在本幕旁白里** | 匹配是纯字符串查找；锚点不在旁白里就等于没有锚点 |
| 长度 **2–8 字**，优先 3–5 字 | 太短会在前文提前命中，太长容易跨句失配（跨 token 是支持的） |
| 标点随便写，会被归一化 | `"先是参数，"` 与 `"先是参数"` 等价；归一化规则与 `make-srt.py`、`Captions.tsx` 完全一致 |
| 重复出现的词**只取第一次** | 同一句里说了两次"蛇身法相"，第一个才是画面该出的时候；要第二次就换更长的唯一短语 |
| 实体 > 虚词 | `"人工智能"` 稳；`"然后"`、`"其实"` 会在别处误命中 |

一个元素一个锚点，`elements[].id` 在幕内唯一；整片角度建议沿用 `e-<幕>-<序号>` 便于跨幕引用讨论。

## 四、写进 brief（可被校验）

```json
"scenes": [{
  "id": "mechanism", "startSeconds": 12, "durationSeconds": 14,
  "narration": "过去十四年，人工智能换过三次主角……",
  "elements": [
    { "id": "e-mech-1", "label": "蛇身法相", "at": "人工智能" },
    { "id": "e-mech-2", "label": "冷白灵光", "at": "三次主角" }
  ]
}]
```

`node scripts/validate-brief.mjs video-brief.json` 会检查：`elements` 是数组、`id` 唯一、`at` 非空，**且 `at` 逐字出现在本幕 `narration` 里**（归一化后）。校验失败会指出是哪个元素、哪个锚点——这类错以前要到渲完才发现。

## 五、找不到锚点时会怎样（降级策略）

| 情况 | 行为 |
|---|---|
| 还没跑旁白、`words` 为空 | 该元素退到 `fallback`（默认幕首 0 帧），渲染不报错 |
| 锚点写错、旁白改过 | 同上，**静默退化** —— 所以务必跑校验，别靠"看起来对" |
| 幕太短、锚点落在幕尾 | 元素只闪一帧就切幕；审片时算一下 `锚点帧 + 动画时长 ≤ 幕长` |

`useAnchor` 的 `fallback` 不是"补救"，而是**声明**：写 `useAnchor(T.mechanism, "金钵", 36)` 就是明确说"没有这个词时第 36 帧出"。

## 六、自检（改完 kit 或锚点逻辑都跑一次）

```bash
node scripts/selftest-cues.mjs     # 需要 Node ≥ 22.6（内置 TS type stripping），低版本会自动跳过
```

自检用 `examples/ai-history/narration-timing.json` 的真实 words 断言：标点归一化、跨 token 命中的起止、`30fps` 帧号换算、重复锚点取第一次、缺词退 fallback。

## 七、和字幕行的分工

| | 字幕行（`captionLines`） | 元素锚点（`elements[]`） |
|---|---|---|
| 决定什么 | 一屏显示哪几个字，断在哪 | 某个图形/标注什么时候出现 |
| 粒度 | 人工断行（10–22 字） | 词（2–8 字） |
| 数据 | 人工写，按字数吃 words | 字符串定位到 words |
| 相同点 | 都吃同一份 `words`，都随旁白走 | 同左 |

两者不互相替代：字幕断行是排版判断，元素出点是叙事节奏。

## 八、审片时怎么核对（静帧看不出出点）

静帧只能看版面，出点要看视频。最小成本的做法：**只渲元素附近那几秒**。

```bash
# 锚点在 2.1 秒 → 渲 1.5–3.5 秒，逐帧或用 --frames 密集抽几帧
npx remotion render KnowledgeVideo out/anchor-check.mp4 --frames=45,51,57,63,69
```

对照三点：元素出现帧、旁白当前说的词、字幕当前那一行。三者不齐就是锚点或 words 出了问题。
