# 示例二：AI 十四年（94.8 秒 · 科技题材）

与 `assets/example-memory-brief.json`（68 秒人文题材）配对，用来验证模板不是为单一片子定制的。

| 项 | 值 |
|---|---|
| 时长 | 94.8 秒 |
| 比例 / 帧率 | 16:9 / 30fps |
| 旁白 | edge-tts `zh-CN-YunxiNeural`，语速 −4% |
| 风格 | `assets/styles/paper-editorial.json`（纸感编辑风） |
| 幕数 | 6（钩子 / 地基 / 规模 / 多模态 / 开源追上来 / 接下来） |
| claim | 10 条：8 条 verified（带来源）+ 2 条 interpretation |

## 这一版的设计取舍

- **时间轴靠"两条对比"讲，不靠念年份**：错误率 26.2%→15.3%、闭源 100 vs 开源 91→91，
  观众看的是差值在收窄，旁白只是补事实。
- **2026 年不给模型版本号**：查不到可靠来源的就不写，收尾落在"看三件事"（长程任务 / 单位成本 / 智能体渗透），
  并显式标注「趋势判断 · 非事实陈述」。
- **每幕一个新组件**（下落条 / count-up / 卡片 / 收敛条 / 趋势列表），
  共用 `kit/` 里的后期层与曲线，没有复制粘贴样式。

## 复现

```bash
bash scripts/bootstrap-remotion.sh ai-history && cd ai-history
cp -r ../template/src/kit ../template/src/scenes src/ && cp ../template/src/Root.tsx src/Root.tsx
mkdir -p styles && cp ../assets/styles/*.json styles/
cp ../examples/ai-history/video-brief.json .
cp ../examples/ai-history/src/scenes/AiHistory.tsx src/scenes/
cp ../examples/ai-history/src/Root.tsx src/Root.tsx

python ../scripts/make-narration.py --project . --update-brief
python ../scripts/make-bgm.py --project .
npx remotion render AiHistory out/final.mp4 --concurrency=6 --crf=19
python ../scripts/make-srt.py --project .
```

实测：渲染 7 分 50 秒，归一化 40 秒，现金成本 0 元。
