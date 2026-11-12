# 风格模板（styles/*.json）

一套风格 = 一个 JSON。组件只认 token，不认色值和曲线，所以**加风格不改代码**。

## token 说明（`assets/styles/paper-editorial.json`）

| 段 | 作用 | 硬约束 |
|---|---|---|
| `canvas` | 画幅、帧率、安全边距 | 竖屏要单独设计版式，不能把横屏裁一刀 || `palette` | 墨 / 纸 / 弱化 / accent | **≤3 色**，accent 只给信息焦点 |
| `typography` | display/h1/h2/body/caption/kicker 六级 | 字号阶梯别挤在一起，字距随字号反比 |
| `fonts` | serif/sans/mono 三族 | 优先系统可再分发字体（Noto Sans SC、Source Han Serif SC 已在本机） |
| `motion` | 裁切显现、三档曲线、stagger、过冲上限 | **禁止 linear**，过冲 ≤1.06 |
| `postEffects` | 颗粒 / 暗角 / 泛光 / 色差 / 纸纹 | 颗粒 4–5%、暗角 0.3、泛光 0.1 是经验值，超了廉价 |
| `audio` | BGM 音量、淡入淡出、目标响度 | −16 LUFS / −1.5 dBTP |
| `captions` | 位置、每屏字数、背景、入点 | ≤22 字、≤2 行 |
| `layout` | 页眉 / 分栏线 / 页脚 / 印章锚点 | 全片同一套锚点，不要每幕重摆 |
| `negative` | 负向清单：这个风格**不允许**出现的东西 | 审静帧时逐条对照，破一条就返工 |
| `styleLock` | 不变量：色数、颗粒上限、字幕行数等硬数字 | 与 `negative` 一起构成“风格底线” |

## 已实现

| id | 名称 | 适合题材 | 画幅 |
|---|---|---|---|
| `paper-editorial` | 纸感编辑风（宋体 + 印章） | 人文、历史、心理、社科；最不像 AI 生成的一档 | 16:9 |
| `archive-dossier` | 卷宗档案风（仿宋 + 证物 + 印章） | 事件还原、传播复盘、商业故事；把"一个东西为什么火了"当案子办 | 9:16 |

### `archive-dossier` 的硬约束

| 项 | 约束 |
|---|---|
| 颜色 | 只有四种：墨 `#20201D` / 纸 `#E7DFCE` / 卡纸 `#F4EEE0` / 朱红 `#A5322A` |
| 印章 | 只用在两个时机：**定性**（均为非遗）与 **结论**（已核实）；不能当装饰反复盖 |
| 证物框 | 不得放无授权图片；没素材就用抽象条纹 + `EVIDENCE 01` 编号占位 |
| 数字 | 没有可靠来源时，**禁止出现具体数字**（播放量/粉丝数/增长率），只能做"示意"并标注 |
| 红线 | 只表示"来源 → 结论"的指向，不用于装饰 |
| 字幕 | 人工写行，一行 10–15 字，基线 `y=1392`（避开平台底部 UI） |

零件在 `template/src/kit/dossier.tsx`（纸 / 页眉页脚 / 印章 / 红线 / 证物框 / 按行切字幕），
把 `assets/styles/archive-dossier.json` 当 token 源，换风格不改组件。

## 待做（参考项目已调研）

| id | 名称 | 参考 |
|---|---|---|
| `swiss-editorial-dark` | 深色瑞士排版，单一 accent | 自行设计 |
| `data-cold` | 深蓝数据风，大字数字 + 折线生长 | 自行设计 |
| `whiteboard` | 白板手绘讲解 | alchaincyf/huashu-art-motion |
| `vox-explainer` | Vox 式图解 | alchaincyf/huashu-art-motion |
| `math-3b1b` | 3Blue1Brown 式推导 | Manim 路线 |
| `pixel-story` | 像素叙事 | alexgreensh/anidoodle、JohnHeibel/ClaudeAnimationBase |
| `ink-wash` | 水墨 | lemo-ai/lemo-opuscar（66 模板）、anidoodle |
| `paper-cut` | 剪纸 | cth9191/animate |
| `blueprint` | 蓝图线稿 | alexgreensh/anidoodle |
| `handdrawn` | 铅笔 / 粉笔手绘，逐笔出现 | alexgreensh/anidoodle |

> 风格来源与取舍（含 9 个「Vibe 知识大赏」开源项目的对比）见 `references/research-ai-video-routes.md`。
> 哪种题材适合代码渲视频、哪些做不了：见 `references/code-video-limits.md`。

## 风格底线（negative / styleLock）

每个风格 JSON 都带两项，供审片与 Agent 自检使用：

- `negative`：**不允许出现**的东西。如纸感风禁止“3D 渲染感、赛博霓虹、人物表情表演、冒充证据的截图、水印”。
- `styleLock`：**不许动的数字**。如“色板 ≤3 色、颗粒 4–5%、字幕 ≤22 字、竖屏基线 y=1392”。

`template/src/kit/tokens.ts` 导出 `negative`、`styleLock`，审查时逐条对照静帧；`SKILL.md` 的 completion gate 也引用了这两份清单。新增风格时**必须**同时写这两项，否则风格会在第 3、5 幕慢慢漂移。

## 新增一个风格的步骤

1. 复制 `assets/styles/paper-editorial.json` → `assets/styles/<id>.json`，改色板与字体
2. 补 `negative` / `styleLock`（不写就把旧风格的底线带过去了）
3. 在 `template/src/kit/tokens.ts` 里把 import 指到新文件（或改成按环境变量切换）
4. 渲 3 张静帧（开场 / 中段 / 结尾）确认可读性，再渲全片
5. 把 id 记进上面两张表
