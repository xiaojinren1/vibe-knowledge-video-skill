# Vibe Knowledge Video Skill

一个面向 Codex、Claude Code 等 Coding Agent 的中文科普视频 Skill。它把主题研究、事实核验、解说词、分镜、Remotion 动画、字幕、10 秒预览和完整视频导出串成一套可复用流程。

## 能做什么

- **信息型**：科技、科学、历史、商业、心理学等主题的科普/讲解片（纸感编辑风、深色数据风）
- **叙事型**：事件还原、传播复盘、商业故事（卷宗档案风，把“一个东西为什么火了”当案子办）
- 竖屏 9:16 或横屏 16:9，字幕按人工写好的行切分
- 使用 Remotion 生成 React、SVG、Canvas 动画
- 为事实性表述绑定原始来源
- 默认先渲静帧审片，再渲完整 MP4
- 校验场景时长、Claim 引用和资料完整性
- 可选成品化管线：旁白决定镜头长度、程序合成 BGM + 音效、SRT 字幕、响度归一，**全程 0 元**
- 视觉风格由 `styles/*.json` token 驱动，换风格不改代码
- 3D / 公式 / 界面实录这类需求，按 [references/toolbox.md](references/toolbox.md) 的触发条件按需接入（默认零额外依赖）

**做不了**：人物表演、漫剧、真人向、喜剧节奏。这类需求靠逐帧美术判断，代码渲不到发布水准，
先看 [references/code-video-limits.md](references/code-video-limits.md)，再用“把表演换成证据”的替代方案。

> 新会话从哪开始、一句话怎么提需求、环境在哪：见 [START.md](START.md)。

## 安装

把本仓库作为 Skill 安装到支持 Agent Skills 的工具中，或者复制到个人 Skills 目录：

```bash
npx skills add xiaojinren1/vibe-knowledge-video-skill
```

Remotion 项目初始化脚本会使用官方脚手架，并安装 Remotion 官方 Agent Skills：

```bash
bash scripts/bootstrap-remotion.sh my-video
cd my-video
npm run dev
```

## 使用示例

```text
使用 $vibe-knowledge-video，制作一期“AI Agent 为什么需要记忆”的中文科普视频。

要求：
1. 16:9 横屏，60 秒；
2. 面向普通技术爱好者；
3. 使用深色编辑风格，不要堆砌无意义粒子；
4. 先核实资料并生成分镜；
5. 使用 Remotion 制作；
6. 先渲染前 10 秒让我确认；
7. 暂时不配音，但生成完整解说词和字幕。
```

## 工作流程

1. 核实主题资料并记录来源。
2. 创建 `video-brief.json`。
3. 校验分镜：

   ```bash
   node scripts/validate-brief.mjs video-brief.json
   ```

4. 创建 Remotion 工程并实现动画。
5. 渲染 `Preview10s`。
6. 人工确认事实、节奏和画面。
7. 渲染 `FullVideo`。

## 文件说明

| 路径 | 用途 |
|---|---|
| `SKILL.md` | Skill 的完整执行流程与质量规则 |
| `scripts/new-project.sh` | **一键建工程**：脚手架 + 模板 + 风格 + 示例资产（默认最新版，`--pin` 可锁） |
| `scripts/bootstrap-remotion.sh` | 只创建 Remotion 空白项目并安装官方 Skills（底层脚本） |
| `references/upgrading.md` | 版本策略与升级四点检查 |
| `scripts/validate-brief.mjs` | 校验视频 brief、场景和来源引用 |
| `assets/example-video-brief.json` | 10 秒示例 brief |
| `references/brief-schema.md` | brief 数据结构 |
| `references/storyboard-guide.md` | 分镜与叙事指南 |
| `references/production-workflow.md` | **成片作业流程**：旁白→BGM→字幕→渲染→归一化→自检 |
| `references/style-templates.md` | 风格模板 token 说明与待做风格清单 |
| `references/code-video-limits.md` | **能力边界**：代码渲视频能做什么、做不了什么，以及"表演改证据"的替代方案 |
| `references/toolbox.md` | **工具选型**：20 个动效工具的接入/不引入判定、按需求查的决策表 |
| `scripts/toolcheck.sh` | 工具箱体检：本机能走哪条路线（NVIDIA/Blender/Manim/librosa…） |
| `references/research-ai-video-routes.md` | 五条 AI 视频路线与 9 个开源项目的调研对比 |
| `scripts/make-narration.py` | 由 brief 生成旁白（edge-tts）并写回真实时长 |
| `scripts/make-bgm.py` | numpy 合成原创 BGM（确定性、可商用） |
| `scripts/make-sfx.py` | 确定性音效：鼓/锣/木鱼/嗖/打字机/印章/纸张（可单条，可按 cue 列表铺整轨） |
| `scripts/make-srt.py` | 生成零重叠 SRT 字幕 |
| `scripts/_media.py` | ffmpeg 定位与时长探测 |
| `assets/styles/paper-editorial.json` | 纸感编辑风风格模板 |
| `assets/example-memory-brief.json` | 5 幕示例 brief（记忆为什么会被改写，68 秒） |
| `template/src/` | Remotion 工程模板：kit（tokens/动效/后期）+ 幕组件 + Root |
| `template/src/kit/dossier.tsx` | 卷宗风零件：纸/页眉页脚/印章/红线/证物框/按行切字幕 |
| `assets/styles/archive-dossier.json` | 卷宗档案风 token（9:16，含安全区与字幕基线） |

## 成品化管线（可选）

只想要文本交付时可以跳过；要出成片时按这条走，实测 68 秒 1080p 约 6 分钟、现金 0 元。

```bash
bash scripts/new-project.sh my-video --example ai-history   # 一条命令铺好脚手架/模板/风格/示例
cd my-video
python -m pip install edge-tts

cp ../assets/example-memory-brief.json video-brief.json     # 想换成记忆那期就换这份
python ../scripts/make-narration.py --project . --update-brief   # 旁白决定镜头长度
python ../scripts/make-bgm.py --project .                        # 原创 BGM
npx remotion still KnowledgeVideo out/check.png --frame=300 --scale=0.5
npx remotion render KnowledgeVideo out/v.mp4 --concurrency=6 --crf=19
python ../scripts/make-srt.py --project .
```

完整步骤、归一化命令与交付前自检见 `references/production-workflow.md`。

## 环境要求

- Node.js
- npm / npx
- 支持 Agent Skills 的 Coding Agent
- 本地视频渲染需要 Remotion 支持的系统环境
- 成品化管线额外需要：Python 3.9+、`numpy`、`edge-tts`（免费 TTS，无需 API Key）

## 注意事项

- 高质感动画不代表内容正确，发布前必须人工核对事实和引用。
- 不要使用无授权的图片、视频、字体、音乐、声音或人物形象。
- 本项目提供制作流程，不保证一次生成即可达到发布标准。
- 不应复刻具体创作者的头像、声音、Logo 或标志性视觉资产。

## License

[MIT](LICENSE)

