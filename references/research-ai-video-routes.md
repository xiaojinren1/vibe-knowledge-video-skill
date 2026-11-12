# AI 视频路线调研 · 2026-11-10

> 结论先行：五条路线里，只有 ③/⑤（代码渲视频）在**无 NVIDIA 显卡**的机器上能真正出片。
> ① ② ④ 都要付视频模型额度或本地显卡算力；其中 ① 还多一道微信私信门槛。

## 本机实测环境

| 项 | 实测 |
|---|---|
| CPU/内存 | 16GB RAM |
| 显卡 | Intel UHD 620 + AMD R7 M460（**无 NVIDIA，0 显存**） |
| 磁盘 | D: 163GB 可用 / C: 53GB 可用 |
| 已装 | node 24.22.0 / npm 11.19.1 / python 3.12.10 / git 2.53 |
| 缺 | ffmpeg、ffprobe、pnpm、bun |

**直接结论**：④ 要求 12GB+ 显存 + 32GB 内存，本机两条都不满足，本地跑不了；③ 的 27B 模型要 4 卡，本机也跑不了。
所以本机能落地的只有：**文本/分镜层 + 代码渲视频（Remotion / HTML / Canvas）+ 免费 TTS**。

## 五条路线速查

| # | 项目 | 形态 | 许可 / 更新 | 出片靠 | 单条 60s 成本 | 本机可行 |
|---|---|---|---|---|---|---|
| ① | 路上侠客「AI短剧生成技能 v3.0/v4.1」（公众号：路上侠客） | 提示词规范文档包，微信私信获取 | 未开源，无成片证据 | 即梦/可灵/海螺 | ¥40–150 | 仅文本层 |
| ② | [zenstory-ai/drama-skills](https://github.com/zenstory-ai/drama-skills) | 12 个 skill + python 校验 + 生产 adapter + 剪辑 | MIT，CI 完善 | Seedance/H3/GPT Image | ¥40–150 | 文本+剪辑，出片要买额度 |
| ③ | [OpenSenseNova/SenseNova-6.8-Code2Video](https://github.com/OpenSenseNova/SenseNova-6.8-Code2Video) | 27B 模型（Qwen3.8 微调，512K）+ `code-video` skill | Apache 2.0，官方 | 本地浏览器渲 HTML/Canvas/Three.js | ¥0–40（只吃 token） | 模型跑不了；**skill 可用** |
| ④ | [SwotAtmk/infinite-creation](https://github.com/SwotAtmk/infinite-creation) | 本地 Web 工作台，52 skills，SQLite 断点续跑，MCP 工具桥 | MIT（skills/vendor 除外），日更 | 本地 ComfyUI + MiniMax H3 | 本地=电费；云端按量 | ❌ 显存/内存不够 |
| ⑤ | [xiaojinren1/vibe-knowledge-video-skill](https://github.com/xiaojinren1/vibe-knowledge-video-skill) | 中文科普视频 skill：研究核验→brief→Remotion→成片 | MIT，2026-10-27 | Remotion（React/SVG/Canvas） | **¥0**（TTS 用免费的） | ✅ 装 ffmpeg 即可 |

## 各项目值得借鉴的设计点（可直接落到 ⑤）

### 来自 ② drama-skills
1. **跨文档引用硬校验**：`creator_markdown_check.py` 会指出"第 X 镜写了人物 Y，视觉依据没覆盖"。
   → ⑤ 已有 `validate-brief.mjs`，可扩成 **claims ↔ scenes ↔ captions 三向校验**，报错带中文原因和定位。
2. **命名式连续性锁**：`LOCK-JIANGCHEN-DRESS` 这种 ID，锁面是一条能原样贴进提示词的短语，scene 里按 ID 引用。
   → ⑤ 可加 `VISUAL-*` 锚点 ID（配色/字体/主体几何/接触锚公式），跨集复用，防止系列视频风格漂移。
3. **先预览再花钱 + 单环节可重跑**：把"重跑哪一环"显式化。

### 来自 ③ SenseNova code-video skill
1. **交付物固定为 SPEC.md / VERIFY.md / contact sheet / 源码 / 复现命令**。
   → ⑤ 的 completion gate 是布尔清单，可升级成"**事实化交付报告**"（每项写实测值，不写"已检查"）。
2. **contact sheet 审帧**：一次渲多帧拼成联系表，人一眼看完。
   → ⑤ 已有 review frames 命令，可加自动拼图。
3. **edge-tts 免费 TTS**（Bing 引擎，需联网）。⑤ 第 9 条只允许"用户提供音频或授权 TTS"，edge-tts 可列为默认可选并注明授权来源。
4. **`frame(t)` 纯函数原则**：⑤ 已是 frame-driven，保持一致即可。

### 来自 ④ infinite-creation
1. **canonical 参考图跨镜复用 + 人物衣橱**：一个主体只定一次，跨镜复用。
   → ⑤ 的"持续主体"设计思路一致，可把主体几何/配色沉淀成可复用组件 + 参数文件。
2. **分阶段 + 幂等跳过 + 断点续跑**：阶段落 SQLite，崩溃可续。
   → ⑤ 可加 `state.json` 记录"哪些 scene 已 review / 已渲"，避免整支重渲。
3. **场景站位一致性（空间锚点 + 角色方位 + 180° 轴线）**：消除跨镜左右漂移与越轴。
   → ⑤ 已有"接触锚点公式"，可补一条**方位锚**（左/右/朝向在组件层固定，不在每个 scene 里重新摆）。
4. **工具白名单 + 参数级拦截 + 正文豁免**：agent 有删写能力时的安全边界。
   → 对 ⑤ 不是必须（它不跑删除），但如果后续加"自动清理输出目录"就需要。

### 来自 ① 路上侠客
1. **5 维量化评分（钩子/节奏/一致性/技术/合规）+ 85 分及格线**：比布尔 gate 更能暴露弱项。
   → ⑤ 可加"打分表"输出：清晰度/信息密度/视觉一致/事实核验/字幕合规，各 20 分。
2. 其余（开口镜/口型/身份锁首尾双锁）是真人短剧专用，知识视频用不上。

## ⑤ 目前缺的东西（按优先级）

1. **preflight 环境检查**：`finalize-video.sh` 依赖 ffmpeg，但 skill 里没有"先检查 ffmpeg/字体/Chrome"的脚本 → 建议加 `scripts/preflight.sh`。
2. **文字溢出自动检测**：现在靠人眼看 review frames → 可用 Playwright 量 DOM 边界，超框即报错。
3. **TTS 路径缺失**：不配音时只能出解说词和字幕；加 edge-tts 适配后就能一口气出带声成片。
4. **系列化能力**：跨集视觉一致性没有载体（见上文 `VISUAL-*` 锚点）→ 做知识区系列号时最先崩的就是这个。
5. **成本/时长预估**：Remotion 渲染时间与 scene 数量、时长近似线性，可在 brief 阶段就报"预计渲染 N 分钟"。

## 立刻可做的实验（0 安装起步）

1. **现在就能跑**：`node scripts/validate-brief.mjs assets/example-video-brief.json` → 已验证通过（2 scenes / 1 claim / 10s）。工具链 OK。
2. **10 分钟**：装 ffmpeg（winget）+ `bash scripts/bootstrap-remotion.sh demo` 起一个 Remotion 工程，出 15 秒试片。
3. **半天**：按完整流程跑一期 60 秒科普片，重点验 completion gate 里"审帧 / 溢出 / 音画"三项是否真的拦得住。

## 事实备注

- ① 的文章（2026-10-24 v3.0、11-07 v4.1、11-10 应用）文末均注明"图片为 AI 生成的分镜演示画面，非最终成片"，无公开端到端成片。
- ④ 的 README 与推广文章均带云算力返利链接，"免费"指软件免费，算力另计。
- ③ 官方 Limitations 明确：不做写实素材；单次生产跑数小时；精细度落后最强闭源模型（Kaggle Code2Video 榜 Opus 5.5 33.5%，开源约 10%）。
- ② README 自述 68 秒样片视频生成成本约 40 元。

---

# 附录：画面为什么"差"，以及怎么补（2026-11-10 实测）

## 根因排序（纯代码视频的廉价感都来自这五层缺失）

| 层 | 症状 | 补法（Remotion 可行） |
|---|---|---|
| 1 后期 | 画面干净得像 PPT：无颗粒、无暗角、无泛光 | SVG `feTurbulence` 确定性颗粒 + 径向暗角 + screen 泛光；总量控制在 grain≈5%、vignette≈0.4 |
| 2 字体 | 默认微软雅黑、字重单一、字距不管 | 5 级字阶 + 字距随字号反比；本机已有 Noto Sans SC（三档字重）、Source Han Serif SC Heavy，均可再分发 |
| 3 动效 | 全用淡入 / linear | 曲线表（emphasized / standard / exit）+ stagger 逐项错开 + spring 微过冲（≤1.06）+ 裁切显现 |
| 4 层次 | 单层平铺，没有景深 | 三层视差（bg/mid/fg）+ 非焦点层 blur(2–6px) + 网格当"隐形骨" |
| 5 色彩 | 饱和度高、颜色过多 | tinted grayscale + 1 accent，全片 ≤3 色；accent 只给信息焦点 |

## 三个方向（已各渲一张静帧验证）

- **A 编辑风（深色）**：瑞士排版 + 单一 accent + 线条图解。信息密度高、显专业，但容易"冷"。
- **B 纸感宋体**：暖白纸纹 + 宋体大字 + 印章 accent。最不像 AI 生成、最有"人做的"质感，适合人文/历史/心理学。
- **C 数据风（冷色）**：大字数字 + 折线生长 + 终点标注。适合科技/商业，但最容易撞车（全网都长这样）。

实现位置（本仓库）：`template/src/kit/` + `assets/styles/paper-editorial.json`（Remotion 4.0.542 · Node 24 实测跑通）
- `src/kit/tokens.ts` 色板/字阶/曲线表/后期强度
- `src/kit/PostFX.tsx` 颗粒/暗角/泛光/色差/纸纹
- `src/kit/anim.tsx` 裁切显现/beziers/stagger
- 渲染静帧：`npx remotion still StyleA out/A.png --frame=130`（不需要系统 ffmpeg）

## 值得抄的具体文件（不是概念）

1. `OpenSenseNova/SenseNova-6.8-Code2Video/skills/code-video/crafts/motion-graphics-and-promos.md`
   → 动效词汇 + 排版纪律，是"完成度"的浓缩
2. 同仓库 `crafts/stylized-looks.md`
   → 具名风格的落地方法（水墨/剪纸/像素/蒸汽波），解决"风格只说一句 visualStyle"的问题
3. `zenstory-ai/drama-skills` 的 Look Development 阶段 + `creator_markdown_check.py`
   → 先定风格帧再展开；跨文档引用硬校验
4. `SwotAtmk/infinite-creation` 的 66 个风格模板
   → 风格应当是可引用的模板 JSON（色板+字体+曲线+转场+颗粒），不是一个字符串

## 实测基准（本机：8 核 / 16GB / 无 GPU）

| 动作 | 实测 |
|---|---|
| `npx remotion still ... --scale=0.66` 单张静帧 | 约 3–6 秒 |
| 48 秒 1080p 30fps 全片渲染（含每帧颗粒滤镜，concurrency=6） | **4 分 16 秒**，输出 6.9MB |
| 归一化（H.264 High / yuv420p / bt709 / faststart） | 约 20 秒，5.2MB |
| 依赖 | Remotion 自带 Chrome Headless Shell + ffmpeg，**不需要系统 ffmpeg** |

→ 结论：一分钟成片的机器时间约 5 分钟，纯 CPU，成本只有电费。

---

# 附录二：9 个「Vibe 知识大赏」开源项目（逛逛GitHub, 2026-11）

| # | 项目 | 形态 | 对本项目的价值 |
|---|---|---|---|
| 1 | lemo-ai/lemo-opuscar | 66 种影片风格 + 制作说明 + 代码样片 | **高**：风格模板库的直接来源（④ 的「无限·秩影」就是接的这个） |
| 2 | alchaincyf/huashu-art-motion | 数十种艺术风格（白板/Vox/3Blue1Brown 解说） | **高**：讲解类风格的叙事惯例 |
| 3 | Vincentwei1021/mg-styles-15 | 15 种 MG 风格，各含 10 秒样片 + 提示词 + 源码 + 声音文件 | **最高**：模板结构（提示词+源码+声音）与我们 styles/*.json 同构，可直接吸收 |
| 4 | Vincentwei1021/video-shotcraft | 采集真实界面→镜头配方卡→宣传片 | 中：以后做产品片用得上 |
| 5 | alexgreensh/anidoodle | 代码绘插画，32 种风格（铅笔/水彩/粉笔/蓝图），逐笔出现 | **高**："画出来"的过程感，适合序章与转场 |
| 6 | cth9191/animate | 7 种风格（剪纸/素描/数学/像素），先确认再制作 | 中：流程闸门设计可借鉴 |
| 7 | threerocks/sweety-handdraw-video | 手绘 + 旁白长视频 | 中：口播驱动分镜的做法 |
| 8 | bangtutorial/bang-motion | 镜头跟随对象、元素跨幕延续 | **高**：解决"幕与幕之间断裂"的问题 |
| 9 | JohnHeibel/ClaudeAnimationBase | 角色表情/姿势库，31 种表情 | 中：角色化叙事时用 |

## 已吸收进本工程
- 风格 token 化 → `assets/styles/paper-editorial.json`（含 9 个待做风格的 roadmap，直接对应上表）
- 声音分层（旁白 / BGM / 字幕三轨）→ `scripts/make-narration.py` + `make-bgm.py` + `make-srt.py`
- 画面五层（后期/字体/动效/层次/色彩）→ `template/src/kit/`
- 先静帧后成片的检查闸门 → `references/production-workflow.md`

## 本次落库内容

| 文件 | 说明 |
|---|---|
| `template/src/kit/{tokens.ts,PostFX.tsx,anim.tsx}` | 风格 token 读取、后期质感层、裁切显现与曲线工具 |
| `template/src/scenes/KnowledgeVideo.tsx` | 五幕示例（钩子 / 实验 / 提问 / 机制 / 收束）+ 未注册幕的通用兜底 |
| `template/src/Root.tsx` | 时长由 narration-timing.json 决定 |
| `assets/styles/paper-editorial.json` | 纸感编辑风风格模板 |
| `assets/example-memory-brief.json` | 68 秒示例 brief（5 幕 5 条 claim，校验通过） |
| `scripts/make-narration.py` / `make-bgm.py` / `make-srt.py` / `_media.py` | 旁白、BGM、字幕、ffmpeg 定位 |
| `references/production-workflow.md` | 成片作业流程 + 交付前自检 |
| `references/style-templates.md` | 风格 token 说明与 10 个待做风格 |

---

# 附录三：2026-11 两篇公众号的可用点（已吸收 / 已拒绝）

## A. 「中国神话 AI 视频 Skill」（公众号：路上侠客，私信获取，未开源）

一套面向**生成式视频模型**（Veo / 可灵 / Wan / Midjourney）的提示词工程包：世界观 → 角色 → 分镜 → 提示词 → 海报，
带"风格锁"、负向词库、模型分配建议、工程化目录。

| 可用的思路 | 落到本项目 | 状态 |
|---|---|---|
| **风格锁 + 负向词库**：把"不要什么"写成清单，防止跨镜漂移 | `styles/*.json` 新增 `negative` / `styleLock`，`tokens.ts` 导出，审片逐条对照 | ✅ 已落 |
| **镜头语言结构化**（景别/焦段/运动/光影/台词/音效） | 可作为分镜描述写法参考；代码视频不追焦段，只取"景别 + 运动 + 光影"三项 | 📝 写进 storyboard 指南时可引用 |
| **每步都要人点头**（分镜→线稿→标注→渲染） | 本项目已有"静帧→全片"，补成"分镜确认→静帧确认→锚点确认→全片" | ✅ 已落（见 SKILL.md gate） |
| **模型分配**：对白重口型、法器重轨迹、大场面重构图 | 等价物是"哪个镜头走 2D 代码 / 3D / 序列帧"，已在 `toolbox.md` 决策表 | ✅ 已覆盖 |
| 交付物：世界观/角色/分镜/提示词/海报 | 只取"分镜 + 来源"，海报与提示词不适用（我们不调生成模型） | ❌ 不吸收 |

**不引入的原因**：它是给"生成式视频模型"写提示词的，本项目用代码渲染，画面上限由组件与排版决定，
不由提示词决定。它的 SKILL.md/manifest 结构本身没有额外信息量（本仓库已有更严的 brief 校验）。

## B. [geeklee/srt-whiteboard-animation](https://github.com/geeklee/srt-whiteboard-animation)（MIT，3.8k star）

**字幕丢进去 → 分镜建议 → 线稿 → 像素级标注 JSON → 浏览器预览台 → 逐幕渲 MP4 → 合并。**
每个元素的出场顺序跟着字幕走；笔迹连续、画完留存；风格锁死"暖米黄纸 + 深灰素描线 + 红橙蓝点缀、画面不放字"。

| 可用的思路 | 落到本项目 | 状态 |
|---|---|---|
| **元素级出点绑定字幕**（说到谁谁出场） | `template/src/kit/cues.ts` + `useAnchor.ts`：用 `words` 把锚点换算成帧；brief 支持 `elements[]` 并校验锚点是否真在旁白里 | ✅ 已落 |
| **标注先行**：位置/顺序/时序/字幕关联都写在数据里，渲染器只读数据 | 与"内容放数据文件、组件只认 token"一致；新增 `elements[]` 就是元素级数据 | ✅ 已落 |
| **浏览器预览台**（不碰代码调时间轴） | 用 Remotion Studio + `--props` 替代，不另做一套网页 | ⚠️ 替代方案 |
| **逐幕渲染再合并** | Remotion 一次渲全片即可；但"只渲元素附近几秒验证锚点"已写进 cue-anchoring.md | ✅ 部分吸收 |
| **联系表检查图** | `scripts/still-sheet.py`：静帧目录 → HTML 联系表（帧号自动转时间码） | ✅ 已落 |
| 白板手绘渲染器本身 | 不引入：我们已有 Remotion 管线，它的产物是 MP4 片段，反而多一层合成 | ❌ 不引入 |

**结论**：这个项目真正值得抄的是**数据模型**（元素 ↔ 字幕的时间绑定 + 先标注后渲染），不是它的白板画风。
画风可以作为 `whiteboard` 风格的参考实现（`style-templates.md` 待做清单里已有）。
