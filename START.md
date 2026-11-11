# 新会话怎么开始（START）

> 给未来的自己（和未来的 Agent）看的开场须知。装好之后，新开一个会话，把「一句话版本」贴进去就能开工。

## 一句话版本（省事，10–15 分钟出片）

```
用 vibe-knowledge-video 的纸感模板做一期 90 秒视频，主题：<你的主题>。
16:9，中文旁白，事实要有来源，先给 brief 和来源清单我确认。
```

产出的是**通用版式**（大标题 + 旁白摘要 + 印章），能发，但不如定制版有记忆点。

## 认真版本（30–60 分钟，出定制版式）

```
用 vibe-knowledge-video 做一期 90 秒视频，主题：<你的主题>。
要求：
① 先给 brief + 每条 claim 的来源，我确认后再动手；
② 结构三幕：钩子 / 证据 / 收束，第三幕要一个专属版式（对比条 / 时间轴 / 数字 count-up 三选一）；
③ 先出 3 张静帧我看版式，确认后再渲全片；
④ 字幕不要句末标点，旁白用 zh-CN-YunxiNeural。
```

## 环境在哪（新会话先确认这三样）

| 项 | 位置 | 检查 |
|---|---|---|
| Skill | `~/.pi/agent/skills/vibe-knowledge-video`（junction 到仓库） | 本文件夹就是 |
| 仓库 | `D:/studyAndWork/vibe-knowledge-video-skill` | `git status -sb` |
| 工作工程 | `D:/studyAndWork/pi-demo/ai-history`（含 node_modules junction） | `ls node_modules` |

**新选题不要从零建工程**：复制 `ai-history` 改个名，依赖是 junction，不占空间：

```bash
cd D:/studyAndWork/pi-demo
cp -r ai-history <新slug>          # 不含 node_modules 也行，事后 mklink /J 指向 ai-history/node_modules
```

## 建新工程：一条命令

```bash
bash scripts/new-project.sh <slug>                       # 默认最新 Remotion
bash scripts/new-project.sh <slug> --example ai-history   # 带上示例 brief 与幕组件
bash scripts/new-project.sh <slug> --pin 4.0.542          # 复现旧片时才锁版本
```

模板不绑定版本：**锁版本发生在每个工程自己的 `package.json` 里**，不在仓库里。
升级前跑 `references/upgrading.md` 的四点检查；旧工程不动，回退成本为零。

## 标准流水线（四步，0 元现金）

```bash
cd <工程>
python scripts/make-narration.py --project . --update-brief   # 旁白 + 字级边界 + 回写时长
python scripts/make-bgm.py --project .                        # 科普风配乐（限带 1.8kHz）
npx remotion still KnowledgeVideo out/check.png --frame=300 --scale=0.5   # 先看静帧
npx remotion render <Composition> out/v.mp4 --concurrency=6 --crf=19      # 再渲全片
python scripts/make-srt.py --project .                        # 字幕（去句末标点）
python scripts/master-audio.py --input out/_mix.wav --output out/_master.wav --gain-db <8.x>
```

母带那步的 `gain-db` 算法：先跑一遍
`ffmpeg -i out/_mix.wav -af "loudnorm=I=-16:TP=-1.5:print_format=json" -f wav NUL`，
读出 `input_i`，`gain = -16 - input_i`。详细命令见 `references/production-workflow.md`。

## 五个已经踩过的坑（不用再踩一次）

1. **旁白决定镜头长度**，不是先定时长再切音；`--update-brief` 会写回真实时长。
2. **字幕必须用字级边界**（edge-tts 的 `WordBoundary`），按字数均分会平均慢 0.5 秒。
3. **母带不要用单遍 loudnorm**（dynamic 模式会抬底噪、忽大忽小），用静态增益 + 软限幅。
4. **配乐全频段限带 1.8kHz 以内**：高频是扎耳的唯一来源，宁可闷。
5. **字幕句末不加句号/逗号**，问号感叹号保留。

## 现在能做的风格

| id | 名称 | 画幅 | 适合题材 |
|---|---|---|---|
| `paper-editorial` | 纸感编辑风（宋体大字 + 纸纹 + 朱红印章） | 16:9 | 人文、历史、心理、社科 |
| `archive-dossier` | 卷宗档案风（仿宋 + 证物框 + 红线 + 时间轴 + 印章） | 9:16 | 事件还原、传播复盘、商业故事 |

两种都不靠“表演”，靠信息组织和图形。想要漫剧/人物表演这条路走不通，原因与替代方案见
`references/code-video-limits.md`。

## 一条命令铺卷宗风（竖屏叙事片）

```bash
bash scripts/new-project.sh my-dossier --example ai-history
cd my-dossier
# 1) 写 video-brief.json：6 幕，每幕补 captionLines（一行 10–15 字）
# 2) 旁白（档案解说建议 YunjianNeural，语速 −6%）
python ../scripts/make-narration.py --project . --voice zh-CN-YunjianNeural --rate=-6% --update-brief
# 3) 配乐 + 音效
python ../scripts/make-bgm.py --project .
python ../scripts/make-sfx.py --cues cues.json --duration 64 --out public/audio/sfx.wav
# 4) 先静帧再审片
npx remotion still DossierVideo out/check.png --frame=200 --scale=0.5
npx remotion render DossierVideo out/v.mp4 --concurrency=6 --crf=19
```

卷宗零件（纸/页眉页脚/印章/红线/证物框/按行切字幕）在 `template/src/kit/dossier.tsx`，
跟着 `assets/styles/archive-dossier.json` 的 token 走，换风格不改组件。


## 成本与时间（实测，8 核 16G 无独显）

| 环节 | 时间 |
|---|---|
| 旁白（5–6 幕） | 约 40–60 秒 |
| 配乐 | 约 15 秒 |
| 静帧检查 | 3–6 秒/张 |
| 95 秒 1080p 全片 | 约 8 分钟 |
| 母带 | 约 30 秒 |
