# 成片作业流程（纸感风格 · 0 元）

> 本流程把 `video-brief.json` 变成一条带旁白、BGM、字幕的成片。
> 现金成本 0 元：旁白用免费 edge-tts，BGM 用 numpy 合成，渲染用 Remotion 自带的 Chrome 与 ffmpeg。
> 实测（8 核 / 16GB / 无独立显卡）：68 秒 1080p 成片 ≈ 6 分钟。

## 一、准备工程

```bash
bash scripts/bootstrap-remotion.sh my-video          # 用官方脚手架建 Remotion 工程
cd my-video

# 把模板装上
cp -r ../template/src/kit      src/
cp -r ../template/src/scenes   src/
cp    ../template/src/Root.tsx src/Root.tsx
mkdir -p styles && cp ../assets/styles/*.json styles/

# 依赖
python -m pip install edge-tts
```

依赖：Node ≥ 20、Python 3.9+、numpy、edge-tts。ffmpeg 不需要单独装，Remotion 自带。

## 二、写 brief，然后让旁白决定时长

```bash
cp ../assets/example-memory-brief.json video-brief.json
node ../scripts/validate-brief.mjs video-brief.json        # 结构 + claim 校验
python ../scripts/make-narration.py --project . --update-brief
```

`make-narration.py` 会：

1. 逐幕合成 `public/audio/narr-<scene-id>.mp3`（edge-tts，默认 `zh-CN-YunxiNeural`，语速 −4%）
2. 用 ffprobe 量出真实时长，写入 `narration-timing.json`
3. `--update-brief` 时把真实时长回写进 brief（保持 `startSeconds` 连续），让 brief 与成片不脱节

**为什么是旁白决定镜头长度**：先定时长再塞旁白，必然出现话说一半被切；反过来做，节奏天然不赶。

单幕可用 `holdSeconds` 控制留白（结尾建议 2 秒以上，让人看完最后一行字）。

## 三、BGM 与字幕

`make-narration.py` 会向 edge-tts 请求 **WordBoundary**（字级时间边界）并写进
`narration-timing.json` 的 `words`。字幕据此对齐，做到"说到哪个字，字幕跟到哪个字"。

实测对比（同一篇 94.8 秒旁白、25 条字幕）：按字数比例分配的旧算法，与真实发音的偏差
中位数 0.29 秒、平均 0.50 秒、最大 1.47 秒——这正是"字幕老是慢半拍"的来源。



```bash
python ../scripts/make-bgm.py --project .            # 时长自动读 narration-timing.json +2s
python ../scripts/make-srt.py --project .            # 生成 out/captions.srt（零重叠）
```

BGM 是程序合成的「科普向」配乐：96 BPM、Am–F–C–G 铺底 + 每拍一个木琴拨奏 + 轻木质节拍，
固定种子，两次生成完全一致，可商用。

**全频段限带在 1.8kHz 以内**（双击低通）——高频是"刺耳"的唯一来源，宁可闷也不要扎耳；
不用白噪做节奏（人耳立刻觉得脏），节拍改用 640Hz 的木质短音。

## 三·五、音频缺失时的行为

`KnowledgeVideo` / 示例幕组件都用 `getStaticFiles()` 检查 `public/audio/` 里有没有对应文件：
**没有就跳过 `<Audio>`，渲染仍能成功（无声片），不会报「Could not play audio」崩掉**。

所以新工程可以「先渲一版看版式，再补声音」：

```bash
npx remotion render <CompositionId> out/preview.mp4 --concurrency=6   # 无声预览
python ../scripts/make-narration.py --project . --update-brief
python ../scripts/make-bgm.py --project .
npx remotion render <CompositionId> out/v.mp4 --concurrency=6         # 带声音
```

## 四、先看静帧，再渲全片

```bash
npx remotion still KnowledgeVideo out/check.png --frame=300 --scale=0.5
npx remotion render KnowledgeVideo out/v.mp4 --concurrency=6 --crf=19
```

**纪律：先看图，再渲片。** 静帧 3–6 秒一张，全片 5–6 分钟；用静帧抓版面问题，比渲完再发现问题省一个数量级的时间。

## 四·五、字幕排版惯例

- **句末不加句号/逗号**：`make-srt.py` 与 `Captions.tsx` 都会剥掉句尾的 `。，、；：`；
  问号、感叹号保留（它们承载语气）
- 每屏 ≤ 22 字、至多两行；长句按句读切，不要按字数硬切
- 句尾标点是"字幕感"最明显的破绽：一屏里满是句号，看起来像文档而不是台词

## 五、响度归一化（不要用单遍 loudnorm）

单遍 `loudnorm` 是**动态**模式：它会在安静段落抬起底噪、随声音忽大忽小地推拉，
听起来就是"偶尔有个说不清的杂音 / 忽远忽近"。正确做法是 **静态增益 + 软限幅**：

```bash
FF=node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe   # 或系统 ffmpeg

# 1) 抽出渲染结果里的音轨
$FF -y -i out/v.mp4 -map 0:a -f wav out/_mix.wav

# 2) 量出实测响度（只取 input_i，输出文件用完即删）
$FF -i out/_mix.wav -af "loudnorm=I=-16:TP=-1.5:print_format=json" -f wav out/_probe.wav 2>&1 | grep input_i

# 3) 高频收敛 + 齿音抑制 + 静态增益 + 前视软限幅
#    （gain = -16 减去上一步的 input_i）
python ../scripts/master-audio.py --input out/_mix.wav --output out/_master.wav --gain-db 8.3

# 4) 换轨并统一编码参数
$FF -y -i out/v.mp4 -i out/_master.wav -map 0:v -map 1:a   -vf "scale=in_range=full:out_range=tv"   -c:v libx264 -profile:v high -pix_fmt yuv420p -color_range tv   -colorspace bt709 -color_primaries bt709 -color_trc bt709 -crf 20   -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest -movflags +faststart out/final.mp4
```

`master-audio.py` 内部做三件事：

1. **6kHz 以上静态收敛 −2dB**：把 TTS 齿音的底座整体降一点
2. **动态齿音抑制**：只在 4.2kHz 以上的瞬态超过阈值时下压（上限 −10dB），正常语音不受影响
3. **静态增益 + 前视软限幅**：只压峰值，不做动态归一

实测效果（94.8 秒片）：单遍 loudnorm 得到 dynamic 归一化、安静段抬噪；
改造后 **I = −16.7 LUFS，TP = −1.5 dBTP，LRA 4.5**；
原先最刺耳的几处（54.0s / 76.1s / 31.6s）4–9kHz 能量下降 **1.9–4.7 dB**，整体电平只变化 ±0.4 dB。

## 六、交付前自检（照做，不要凭感觉）

- [ ] `ffprobe` 确认：H.264 / yuv420p / bt709 / AAC 48k / faststart
- [ ] 音频 RMS 约 −18 dBFS、峰值 ≤ −1.5 dBFS（loudnorm 生效）
- [ ] 每条字幕不与下一条重叠（`make-srt.py` 已保证，改过手写则要复验）
- [ ] 抽 3 帧（开场 / 中段 / 结尾）看：文字不裁切、不压主体、不加未授权 logo
- [ ] brief 里每条 claim 都有来源，或明确标注为"解读"

## 七、画面质量的五条硬规矩（踩过的坑）

1. **必须有后期层**：颗粒 4–5%、暗角 0.3、泛光 0.1。缺这层，代码渲染永远像 PPT。
2. **颗粒要确定性**：`feTurbulence` 固定 seed、每 2 帧换一次；随机会让两次渲染不一致，问题无法复现。
3. **颜色 ≤ 3**：纸、墨、一处 accent。accent 只给"被改写的部分"，撒满就廉价。
4. **动效三档曲线 + 过冲 ≤ 1.06**：过冲大像弹跳，过小像生硬。
5. **字幕每屏 ≤ 22 字、至多两行**：中文标点吃版面，超了必溢出。

## 八、换风格

只改 `styles/<id>.json`（或用 `references/style-templates.md` 里列的待做风格新增一份 JSON）。
组件不感知色值与曲线，所以换风格不需要改 `src/` 下任何代码。

## 九、换选题

- 幕的设计：`template/src/scenes/KnowledgeVideo.tsx` 里的 `REGISTRY` 按 scene id 挂专属幕
- 没注册的 id 自动走 `GenericScene`（标题两行 + 旁白摘要），所以新 brief 立刻能出片，再逐步做专属设计
- 想加新的版式零件（图表 / 时间轴 / 对比条），写进 `src/kit/`，不要在幕里复制粘贴

## 十、竖屏（9:16）专用流程

竖屏不是把横屏裁一刀。多出来的四件事：安全区、字幕断行、字号阶梓、构图重心。

**1. 安全区写进 token**

```json
"layout": { "safeArea": { "top": 170, "bottom": 1560 } },
"captions": { "baseline": 1392 }
```

抖音/视频号的底部 UI 占约 250px。字幕基线放 `y ≈ 1400`（1080×1920），
不要贴底，也不要把内容放到 1560 以下，除非你不需要它被看到。

**2. 字幕按人工写好的行切分，不按字数均分**

中文 TTS 的字级边界是"词"，不是"字"。均分会切在词组中间（"有人把旧 / 录像截出"）。
正确做法：在 brief 里给每幕写 `captionLines`，再按"每行字数"去吃掉对应的 word 边界：

```json
{ "id": "cut",
  "narration": "转折发生在今年九月。有人把旧录像截出十几秒…",
  "captionLines": ["转折发生在今年九月", "有人把旧录像截出十几秒", "配上鼓点口令", "重新发了出来"] }
```

实现见 `template/src/kit/dossier.tsx` 的 `buildCues()`。一行 10–15 字。

**3. 主体占画面 55–75%**

低于 50% 显得空，高于 80% 挤掉标题。竖屏的信息密度天生比横屏低，
宁可少讲一件事，也不要缩小字。

**4. 字体可选项（Windows 自带，无需安装）**

| 用途 | 字体族 |
|---|---|
| 档案/公文感标题 | `"FangSong", "STFangsong", "仿宋"` |
| 手写/讲解 | `"KaiTi", "STKaiti", "楷体"` |
| 正文黑体 | `"Noto Sans SC"`（本仓已列三档字重） |
| 宋体标题 | `"Source Han Serif SC"` |
| 等宽注释 | `"Cascadia Mono", "Consolas"` |

## 十一、音效（让画面有重音）

旁白+配乐之外，第三层是 **音效层**。代码渲染的画面没有“实拍声音”，重音全靠它。
`scripts/make-sfx.py` 提供七个确定性预设：`drum / gong / ker / whoosh / typewriter / stamp / paper`。

```bash
# 单条素材
python scripts/make-sfx.py --preset stamp --out public/audio/stamp.wav

# 按 cue 列表铺一整条（时间是绝对秒，跟 narration-timing.json 对齐）
python scripts/make-sfx.py --cues cues.json --duration 64 --out public/audio/sfx.wav
```

```json
[{ "at": 0.0, "preset": "paper", "gain": 0.6 },
 { "at": 0.05, "preset": "stamp", "gain": 0.9 },
 { "at": 8.52, "preset": "typewriter", "gain": 0.5 }]
```

约束：

- 底鼓一律压到 **120Hz 以下**，手机喇叭才不刺
- 锣用**非谐分音**（1 / 2.37 / 3.71 / 5.13），纯谐波听着像“叮”
- 噪声只给瞬态（木鱼/嗖/打字机），**不当铺底**；铺底用 drone + 低通
- 音效总量控制在旁白之下：混音时音量 0.3–0.9，别抢人声

卷宗风的完整范例：`scripts/make-archive-audio.py`（低频 drone + 纸张 + 打字机 + 印章，按幕起点对齐）。

## 十二、叙事/娱乐题材的替代路线

用户想做的内容涉及“人物表演 / 笑点 / 漫剧”时，不要硬做人物（原因见 `references/code-video-limits.md`）。
换成这套：**把“表演”换成“证据”，把“情绪”换成“印章 + 鼓点”**。

已验证案例：两个非遗动作的网络走红，用 `archive-dossier` 做成 64 秒档案片：
卷首档案袋 → 两张证物照片 → 埋没八年的时间轴 → 被截取的剪辑记录 → 刷屏示意 → 盖章结论。
