# Video brief schema

Create `video-brief.json` with this shape:

```json
{
  "title": "为什么天空是蓝色的？",
  "audience": "普通成年人",
  "language": "zh-CN",
  "durationSeconds": 90,
  "aspectRatio": "16:9",
  "fps": 30,
  "visualStyle": {"background": "#080B14", "foreground": "#F7F8FC", "accent": "#66E3FF", "mood": "清晰、克制、具有科技感"},
  "scenes": [{"id": "hook", "startSeconds": 0, "durationSeconds": 3, "narration": "天空明明没有颜色，为什么我们看到的是蓝色？", "onScreenText": "天空为什么是蓝色？", "visual": "白光进入大气，蓝光散射路径被强调", "claims": ["claim-001"]}],
  "claims": [{"id": "claim-001", "text": "待核验的事实陈述", "sourceUrl": "https://example.org/source", "sourceTitle": "来源标题", "sourceDate": "YYYY-MM-DD", "status": "verified"}],
  "audio": {"narrationFile": null, "musicFile": null}
}
```

- Keep scene and claim IDs unique.
- Make scene durations contiguous and fit within `durationSeconds`.
- Reference only declared claim IDs.
- Use `verified`, `interpretation`, or `unverified` for claim status.
- Remove `unverified` claims from final narration unless explicitly framed as uncertainty.

## elements（元素级出点锚点，可选但推荐）

```json
"scenes": [{
  "id": "mechanism",
  "narration": "过去十四年，人工智能换过三次主角……",
  "elements": [
    { "id": "e-mech-1", "label": "人工智能", "at": "人工智能" },
    { "id": "e-mech-2", "label": "三次主角", "at": "换过三次主角" }
  ]
}]
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 幕内唯一，建议 `e-<幕>-<序号>` |
| `at` | ✅ | 锚点：**逐字出现在本幕 `narration` 里**的一段文字（2–8 字，标点会被归一化） |
| `label` | | 人看的名字，便于审片对齐 |

校验规则：`id` 唯一、`at` 非空且能在旁白里找到；找不到直接报错（否则渲染时会静默退回幕首）。
用法与规则见 [cue-anchoring.md](cue-anchoring.md)。

