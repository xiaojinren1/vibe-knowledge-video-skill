---
name: vibe-knowledge-video
description: Create polished Chinese knowledge-explainer videos with Remotion from a topic or source material. Use when the user asks for a Vibe 知识大赏-style science, technology, history, business, psychology, or general knowledge video; wants a Remotion project, animated explainer, coded video, narration script, storyboard, subtitles, preview clip, or final MP4; or wants to turn documents and verified research into visual video scenes.
---

# Vibe Knowledge Video

Turn a topic into a source-backed Remotion project and an exportable video. Optimize for clarity, visual explanation, and reproducibility instead of copying a particular creator's identity.

## Core workflow

1. Confirm or infer the topic, audience, aspect ratio, target duration, language, and whether narration is required. If details are missing, default to Chinese, general adult audience, 16:9, 60–120 seconds, 30 fps, with narration script and burned-in Chinese captions.
2. Research the topic before writing. Prefer primary sources, papers, standards, official statistics, and reputable institutions. Record every factual claim in `research/sources.md` with URL, title, date, and the claim it supports.
3. Separate verified facts, interpretation, and analogy. Remove unsupported claims. Do not invent quotations, studies, numbers, dates, or causal relationships.
4. Create `video-brief.json` using [references/brief-schema.md](references/brief-schema.md). Run `node scripts/validate-brief.mjs video-brief.json` before coding scenes.
5. Create a scene plan with a strong question in the first 3 seconds, one idea per scene, a visual payoff every 5–8 seconds, and a concise ending. Use [references/storyboard-guide.md](references/storyboard-guide.md).
6. If no Remotion project exists, run `bash scripts/bootstrap-remotion.sh <project-directory>`. This scaffolds the official blank template and installs the official Remotion Agent Skills. Never overwrite an existing non-empty directory.
7. Implement the video in Remotion. Read the official Remotion Skills installed in the project before editing. Use frame-driven animation with `useCurrentFrame()`, `interpolate()`, `spring()`, `Sequence`, and `Series`; do not use CSS animations, random values, or wall-clock time.
8. Prefer native HTML, SVG, Canvas, equations, charts, timelines, maps, and simple geometric illustrations. Use external images or clips only when they materially improve understanding and their license/source is recorded.
9. Add narration only from user-provided audio or an available authorized TTS service. Do not silently upload private text to an external voice service. Put media in `public/` and load it with `staticFile()`.
10. Generate captions from the final narration timing. Keep two lines maximum, provide safe margins, and maintain readable contrast. For word-level timing, use `@remotion/captions`.
11. Render a 10-second preview first. Review text overflow, factual accuracy, frame continuity, pacing, audio sync, and attribution. Iterate before rendering the full video.
12. Export the full MP4 and deliver the project directory, preview, final video, `video-brief.json`, and `research/sources.md`. State any claims or media that still require manual verification.

## Project standards

- Register at least `Preview10s` and `FullVideo` compositions.
- Put editable content in data files rather than scattering copy through components.
- Build reusable components for title, caption, source label, chart, timeline, and scene transition.
- Keep source labels visible for statistics and quotations; add a final references scene.
- Use deterministic animation and stable seeds when procedural graphics are needed.
- Use safe typography: system Chinese fonts first unless a redistributable local font is bundled.
- Check portrait output separately; do not simply crop a landscape composition.
- Never imitate a living creator's exact branded style, voice, avatar, logo, or signature transitions. Translate high-level traits such as cinematic pacing or data-driven motion into an original visual system.

## Default visual direction

Use a dark editorial background, one bright accent color, restrained glow, large Chinese typography, thin grid lines, and purposeful motion. Avoid excessive particles, card grids, random gradients, fake 3D, and constant camera movement. Let the concept determine the animation.

## Commands

```bash
npm run dev
npx remotion render Preview10s out/preview.mp4
npx remotion render FullVideo out/final.mp4
```

On Windows, pass composition props using a JSON file rather than inline shell JSON.

## Completion gate

Do not call the video complete until:

- every factual claim has a source or is clearly labeled as interpretation;
- the brief validator passes;
- the 10-second preview renders successfully;
- no text is clipped at 16:9 or the requested format;
- captions match the narration;
- media licenses and attributions are recorded;
- the full render command succeeds.
