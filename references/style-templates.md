# 风格模板（styles/*.json）

一套风格 = 一个 JSON。组件只认 token，不认色值和曲线，所以**加风格不改代码**。

## token 说明（`assets/styles/paper-editorial.json`）

| 段 | 作用 | 硬约束 |
|---|---|---|
| `canvas` | 画幅、帧率、安全边距 | 竖屏要单独设计版式，不能把横屏裁一刀 |
| `palette` | 墨 / 纸 / 弱化 / accent | **≤3 色**，accent 只给信息焦点 |
| `typography` | display/h1/h2/body/caption/kicker 六级 | 字号阶梯别挤在一起，字距随字号反比 |
| `fonts` | serif/sans/mono 三族 | 优先系统可再分发字体（Noto Sans SC、Source Han Serif SC 已在本机） |
| `motion` | 裁切显现、三档曲线、stagger、过冲上限 | **禁止 linear**，过冲 ≤1.06 |
| `postEffects` | 颗粒 / 暗角 / 泛光 / 色差 / 纸纹 | 颗粒 4–5%、暗角 0.3、泛光 0.1 是经验值，超了廉价 |
| `audio` | BGM 音量、淡入淡出、目标响度 | −16 LUFS / −1.5 dBTP |
| `captions` | 位置、每屏字数、背景、入点 | ≤22 字、≤2 行 |
| `layout` | 页眉 / 分栏线 / 页脚 / 印章锚点 | 全片同一套锚点，不要每幕重摆 |

## 已实现

| id | 名称 | 适合题材 |
|---|---|---|
| `paper-editorial` | 纸感编辑风（宋体 + 印章） | 人文、历史、心理、社科；最不像 AI 生成的一档 |

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

## 新增一个风格的步骤

1. 复制 `assets/styles/paper-editorial.json` → `assets/styles/<id>.json`，改色板与字体
2. 在 `template/src/kit/tokens.ts` 里把 import 指到新文件（或改成按环境变量切换）
3. 渲 3 张静帧（开场 / 中段 / 结尾）确认可读性，再渲全片
4. 把 id 记进上面两张表
