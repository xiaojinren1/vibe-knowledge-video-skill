# 工具箱选型：20 个动效工具怎么接进这条流水线（2026-11 实测）

> 结论先行：那篇文章的 20 个工具里，**已经在这条管线里的是 3 个（Remotion / Remotion Skills / FFmpeg）**，
> 值得按需接入的是 11 个，剩下 6 个**明确不装**——不是不好，是装进来会破坏「frame 驱动 + 确定性 + 0 元」这三个前提。
>
> 遇到具体需求先查第四节决策表，再决定要不要动依赖。

配套体检脚本：`bash scripts/toolcheck.sh [工程目录]`，一次告诉你这台机器现在能走哪条路线。

## 一、分层（先看这张）

| 层 | 工具 | 处理 |
|---|---|---|
| 核心 | Remotion、Remotion Skills、FFmpeg | **已在用，不要替换** |
| 按需 | Manim、Lottie、Three.js、Blender 3D 资产、OBS、WhisperX、librosa、ComfyUI、CosyVoice、LosslessCut、postprocessing（仅 3D 分支） | 有触发条件才接，见第三节 |
| 不引入 | Anime.js、Motion、Tweakpane、Jolt Physics、three.quarks、three-gpu-pathtracer、postprocessing（2D 片） | 见第六节，附例外 |

## 二、核心层：已经在这条管线里

| 工具 | 在本项目里的位置 | 不要做的事 |
|---|---|---|
| Remotion | `template/src/`、`scripts/bootstrap-remotion.sh` | 不要在场景里用 CSS animation / 真实时钟 / `Math.random()` |
| Remotion Skills | `bootstrap` 时装进工程的官方 skill 包，改场景前先读 | 不要绕过它自己发明 API |
| FFmpeg | `scripts/_media.py` 优先用 `node_modules/@remotion/compositor-*/ffmpeg.exe`，`finalize-video.sh` 归一化 | 不要假设系统装了 `ffmpeg`；探不到就用 `FFMPEG` 环境变量 |

## 三、按需接入（有触发条件 + 接入方式 + 代价）

### 3.1 图形/3D 分支

| 工具 | 什么时候用 | 不触发时用什么 | 代价 / 风险 |
|---|---|---|---|
| **Manim** | 需要公式变形、坐标系变换、几何推导这类「数学过程」画面 | SVG + 路径插值 + `handLine()`；`math-3b1b` 风格 | 需 Python + LaTeX + cairo；产物是**外部渲染的序列帧**，破坏"一个命令复现全片"，命令和参数必须落盘 |
| **Lottie** | 用户或设计给了 `lottie.json`（AE 导出的图标动效、现成矢量动画） | 自己用 `anim.tsx` 画；图标动效成本很低 | 依赖 `@remotion/lottie`；json 的来源和授权要写进 `research/sources.md` |
| **Three.js**（`@remotion/three`） | 需要真实三维视角讲解结构（相机绕行、剖面、材质） | 2D 等轴测图解 + 视差三层，多数结构说明够用 | WebGL headless 渲染慢 2–4 倍，Windows 要 `--gl=angle`；只做"看懂结构"，不追写实 |
| **Blender + 3D 资产**（文章里的 MCP for Blender） | 真实主体（机械、车辆、建筑、产品）必须可信，2D 矢量画不像 | 严格按参考图做精细 SVG/Canvas 侧视图 | 本机无 Blender、无独显：Cycles CPU 渲 1080p 很慢，先渲 480p 验证；alpha 用 PNG 序列 |
| **postprocessing**（pmndrs） | **仅当**走 Three.js 分支且需要 Bloom/DOF/调色 | 现有 `template/src/kit/PostFX.tsx`（SVG 颗粒 + 径向暗角 + screen 泛光）已覆盖 | 两套后期同时开 = 脏；2D 片一律用 PostFX，3D 分支才用 pmndrs |

### 3.2 素材分支

| 工具 | 什么时候用 | 不触发时用什么 | 代价 / 风险 |
|---|---|---|---|
| **OBS Studio** | 必须给真实软件界面（产品演示、AI 工具实操、终端操作） | 用代码画的 UI 示意稿，并标注"示意图" | 录制里有个人信息/密钥要遮；必须 CFR 30fps；**旁白和字幕仍留在 Remotion 层**，不要烧进录屏 |
| **LosslessCut** | 从长素材里取片段、粗剪、不重编码 | `ffmpeg -ss ... -t ... -c copy` | 只做粗剪，不要当精剪；剪完仍在 Remotion 里定节奏 |
| **ComfyUI** | 需要纹理、纸感底纹、无主体的氛围图，且**有 NVIDIA 显存** | 代码生成（SVG 噪点/渐变/网格），现有风格已够 | 本机无 NVIDIA → **本机不接**；生成图不得当"事实画面"（新闻/人物/数据），prompt + seed + 授权要记录 |

### 3.3 声音分支

| 工具 | 什么时候用 | 不触发时用什么 | 代价 / 风险 |
|---|---|---|---|
| **CosyVoice** | 系列片要固定音色、要方言、要零样本克隆（且音色已授权） | `scripts/make-narration.py`（edge-tts，免费、带字级边界） | 需推理算力，本机 CPU 很慢；**禁止克隆真人**；换音色后字级边界仍需 `WordBoundary` 或 WhisperX 兜底 |
| **WhisperX** | 音频是**用户提供的成品**（成片配音、访谈、口播），没有脚本也没有时间戳 | edge-tts 路线的 `WordBoundary` 已经够，不需要 | CPU 可跑 small 模型；输出要对齐成 `narration-timing.json` 的 `words[]`（ms 级）再喂 `make-srt.py` |
| **librosa** | 用的是**外部授权音乐**，需要 BPM/节拍让画面踩点 | 自产 BGM（`make-bgm.py`）的 BPM 是自己定的，直接写常量 | 自产音乐不要引 librosa；外部音乐要记录曲名/授权 |

## 四、决策表：什么需求走哪条（以后照这个查）

| 需求信号 | 选它 | 落点 |
|---|---|---|
| 排版、图解、时间轴、图表、卷宗 | Remotion + SVG + `anim.tsx` | 默认路线，`paper-editorial` / `archive-dossier` |
| 公式推演、几何证明、坐标系变换 | Manim 渲片段 → Remotion 合成 | `public/manim/*.png` + `<Img>` 按帧索引 |
| 图标动效、现成矢量动画 | `@remotion/lottie` | `public/lottie/*.json` |
| 结构讲解要转起来、要看背面 | `@remotion/three` | 独立 3D 幕组件，不进 2D 风格 token |
| 真实机械/产品要可信 | Blender 渲 PNG 序列 → `<Img>` | `public/blender/<scene>/####.png` |
| 真实软件界面 | OBS 录屏 → `<OffthreadVideo muted>` | 画中画，四周留版式边距 |
| 用户给了配音音频 | WhisperX 对齐 → `narration-timing.json` | 再跑 `make-srt.py` |
| 系列片要同一把嗓子 | edge-tts 固定 voice/rate，或 CosyVoice（有授权+算力） | 写进 brief 的 `voice` 字段 |
| 音乐要踩点 | 自产 BGM 定 BPM；外部音乐才上 librosa | 节拍点写成 JSON，动画读常量 |
| 需要"照片感"底纹 | 代码生成纹理；有 NVIDIA 才考虑 ComfyUI | 只做背景，不做事实画面 |

## 五、接入片段（复制即用）

```tsx
// Lottie（npm i @remotion/lottie）
import { Lottie } from "@remotion/lottie";
import anim from "../../public/lottie/check.json";
<Lottie animationData={anim} playbackRate={1} style={{ width: 240 }} />;

// Three（npm i @remotion/three three @react-three/fiber）
// Windows 渲染加 --gl=angle，跑不动再退 --gl=swiftshader（慢 5 倍以上）
import { ThreeCanvas } from "@remotion/three";
<ThreeCanvas width={1920} height={1080} camera={{ fov: 40, position: [0, 2, 6] }} />

// 外部渲染的序列帧（Blender / Manim 落盘后）
import { Img, staticFile, useCurrentFrame } from "remotion";
const local = Math.floor((useCurrentFrame() - start) * fps3d / fps); // 24fps 素材 → 30fps 时间线
<Img src={staticFile(`blender/gear/${String(Math.max(0, local)).padStart(4, "0")}.png`)} />;
```

```bash
# Manim：透明背景 + 固定分辨率，产物放工程 public/
manim -qh --transparent --resolution 1920,1080 scene.py GearDerivation

# Blender：CPU 渲 PNG 序列（先 480p 验证，再上 1080p）
blender -b scene.blend -o //frames/#### -F PNG -x 1 -a

# 外部音频对齐（WhisperX）→ 再手工/脚本转成 narration-timing.json 的 words[]
whisperx public/audio/voice.mp3 --model small --output_format json --output_dir out/

# librosa 取节拍（仅外部音乐）
python -c "import librosa,json;y,sr=librosa.load('music.wav');t,b=librosa.beat.beat_track(y=y,sr=sr);print(json.dumps({'bpm':float(t),'beats':librosa.frames_to_time(b,sr=sr).tolist()}))"
```

## 六、不引入（及例外）

| 工具 | 为什么不在本管线用 | 唯一例外 |
|---|---|---|
| Anime.js | 靠自己的时钟驱动；在 Remotion 里等于放弃确定性 | 另做一个**网页**动效（不是视频）时可用 |
| Motion（motion.dev） | 同上，React 生态里最像 CSS 动画的那一套 | 只借它的 spring 参数表，代码仍用 `spring()` |
| Tweakpane | Remotion Studio 的 props 面板 + `--props` 已经能调参 | 调试 3D 场景常数时可以临时用，不要进交付物 |
| Jolt Physics | wasm 刚体求解不可控、跨版本漂移，和"同帧同图"冲突 | 场景 <10s 且必须可信堆叠/碰撞：解析式写不出来时才评估 |
| three.quarks | 粒子引擎最容易做出"廉价感"，项目规则本就限制粒子 | 无。要粒子就手写参数化粒子，并与运动耦合 |
| three-gpu-pathtracer | 路径追踪要 GPU，本机无独显 | 有独显且目标是写实静帧/短镜头时才考虑 |
| postprocessing（2D 片） | 与 `PostFX.tsx` 重复，双后期必脏 | 走 Three 分支时在 3D 分支内使用 |

## 七、引入任何新依赖前先问三句

1. **确定性**：同一帧能不能渲出同一张图？外部工具（Blender/Manim/ComfyUI）的种子、版本、命令行要写进工程 `render-notes.md`。
2. **授权**：lottie/json、音乐、录屏、生成图、克隆音色的来源与许可，进 `research/sources.md`；没授权就不用。
3. **时间预算**：本机基线是 95 秒 1080p ≈ 8 分钟（8 核 16G 无独显）。新路线让渲染翻倍以上，就先降分辨率/缩时长验证，再整片。

**验证顺序不变**：一张静帧 → 3 秒片段 → 全片。任何新路线没出过静帧，不写进 brief。

## 八、本机现状（`scripts/toolcheck.sh` 会重新测）

| 项 | 实测 |
|---|---|
| Node / Python / edge-tts / numpy | 可用 |
| 系统 ffmpeg | 不必装：Remotion 自带 `compositor-*/ffmpeg.exe` |
| 显卡 | Intel UHD 620 + AMD R7 M460，**无 NVIDIA** → ComfyUI / CosyVoice 本机不接 |
| Blender / OBS / Manim / librosa / WhisperX | 未安装，需要时按第三节装（脚本会重新测） |
