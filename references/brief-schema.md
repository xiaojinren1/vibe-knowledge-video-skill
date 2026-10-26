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

