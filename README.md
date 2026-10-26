# Vibe Knowledge Video Skill

一个面向 Codex、Claude Code 等 Coding Agent 的中文科普视频 Skill。它把主题研究、事实核验、解说词、分镜、Remotion 动画、字幕、10 秒预览和完整视频导出串成一套可复用流程。

## 能做什么

- 将科技、科学、历史、商业、心理学等主题转成可视化科普视频
- 使用 Remotion 生成 React、SVG、Canvas 动画
- 为事实性表述绑定原始来源
- 先生成 10 秒预览，再渲染完整 MP4
- 校验场景时长、Claim 引用和资料完整性
- 默认支持中文、16:9、60–120 秒视频

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
| `scripts/bootstrap-remotion.sh` | 创建 Remotion 空白项目并安装官方 Skills |
| `scripts/validate-brief.mjs` | 校验视频 brief、场景和来源引用 |
| `assets/example-video-brief.json` | 10 秒示例 brief |
| `references/brief-schema.md` | brief 数据结构 |
| `references/storyboard-guide.md` | 分镜与叙事指南 |

## 环境要求

- Node.js
- npm / npx
- 支持 Agent Skills 的 Coding Agent
- 本地视频渲染需要 Remotion 支持的系统环境

## 注意事项

- 高质感动画不代表内容正确，发布前必须人工核对事实和引用。
- 不要使用无授权的图片、视频、字体、音乐、声音或人物形象。
- 本项目提供制作流程，不保证一次生成即可达到发布标准。
- 不应复刻具体创作者的头像、声音、Logo 或标志性视觉资产。

## License

[MIT](LICENSE)

