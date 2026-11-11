# 升级 Remotion（版本策略与验证清单）

## 策略：不锁死在仓库，锁在每个工程

| 层 | 做法 | 原因 |
|---|---|---|
| 仓库（template / scripts / assets） | **不写死任何版本号** | 写死等于把"能不能用新版本"变成维护负担 |
| 每个工程（`package.json`） | 自己锁 | 一个工程 = 一条片子 = 一个可复现基线 |

新建工程默认用最新版；要复现旧片时再用 `--pin`：

```bash
bash scripts/new-project.sh new-topic                 # 最新版
bash scripts/new-project.sh old-topic --pin 4.0.542   # 复现当初的版本
```

旧工程永远不动。它当时能出片，就一直能出片；新版本只影响新工程，回退成本为零。

## 升级风险在哪（只有三处，而且都会立刻报错）

1. **版本不一致**：`remotion` / `@remotion/cli` / `@remotion/renderer` 三者版本必须一致，否则 Remotion 直接拒绝启动。
   → 升级时一起升，别只升一个。
2. **CLI 参数变化**：`--concurrency`、`--crf`、`--scale`、`--frames` 这几个我们天天用，改动会直接报错。
3. **音频行为变化**：`<Audio>` 的 `loop` / `volume` 函数、编码默认值。不会报错，但表现为**响度不对或时长对不上**——所以检查点里必须实测响度。

kit 只用了这批 API，4.x 全程稳定：`AbsoluteFill`、`Series`/`Sequence`、`Audio`/`staticFile`、
`useCurrentFrame`/`useVideoConfig`、`interpolate`/`spring`、`Composition`。

## 升级四点检查（约 3 分钟，全过才算安全）

```bash
# ① 能打包、能出图（校验 API 与 CLI 参数）
npx remotion still KnowledgeVideo out/check.png --frame=300 --scale=0.5

# ② 字幕时间轴正常（校验 narration-timing 读取与字级对齐）
python ../scripts/make-srt.py --project .
#    → 期望输出「cues=… 字级对齐 n/m 幕」，且 m 等于幕数

# ③ 音频真的进了成片（校验 Audio 组件与编码）
ffmpeg -i out/v.mp4 -map 0:a -af "loudnorm=I=-16:TP=-1.5:print_format=json" -f wav NUL
#    → input_i 应在 −25 ~ −14 LUFS 之间，不能是 −91（静音）

# ④ 成片参数没漂（校验帧率/像素格式/时长）
ffprobe -hide_banner out/final.mp4
#    → h264 / yuv420p / 30fps / 时长与 narration-timing.json 的 total 相差 < 0.5s
```

任一项不过：把该工程的 `package.json` 退回上一个能跑的版本，重新 `npm install`，问题即消失。

## 升级后要顺手更新的东西

- `START.md` 里的「实测环境」一行（写清楚这次验证通过的版本组合）
- `examples/*/README.md` 里如果有具体的渲染耗时，按新版本重测一次

## 什么情况下**不要**升级

- 手上这条片子正在交付（渲染中途升级容易出现半套依赖）
- BRIEF 里的 claim 还没核完（先把内容做完，工具版本不是瓶颈）
