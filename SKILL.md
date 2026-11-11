---
name: vibe-knowledge-video
description: Create polished Chinese knowledge-explainer videos with Remotion from a topic or source material. Use when the user asks for a knowledge / science / explainer video (知识视频、科普视频、讲解视频、成片、一条视频), a Remotion project, animated explainer, coded video, narration (旁白/配音), storyboard, subtitles (字幕), BGM (配乐), preview clip, or final MP4; or wants to turn documents and verified research into visual video scenes. Ships a 0-cost pipeline: free edge-tts narration with word-level timing, synthesized BGM, SRT + burned-in captions, static-gain mastering.
---

# Vibe Knowledge Video

Turn a topic into a source-backed Remotion project and an exportable video. Optimize for clarity, visual explanation, and reproducibility instead of copying a particular creator's identity.

## Core workflow

1. Confirm or infer the topic, audience, aspect ratio, target duration, language, and whether narration is required. If details are missing, default to Chinese, general adult audience, 16:9, 60–120 seconds, 30 fps, with narration script and burned-in Chinese captions.
2. Research the topic before writing. Prefer primary sources, papers, standards, official statistics, and reputable institutions. Record every factual claim in `research/sources.md` with URL, title, date, and the claim it supports.
3. Separate verified facts, interpretation, and analogy. Remove unsupported claims. Do not invent quotations, studies, numbers, dates, or causal relationships.
4. Create `video-brief.json` using [references/brief-schema.md](references/brief-schema.md). Run `node scripts/validate-brief.mjs video-brief.json` before coding scenes.
5. Create a scene plan with a strong question in the first 3 seconds, one idea per scene, a visual payoff every 5–8 seconds, and a concise ending. Preserve one clear narrative spine. Remove historical comparisons, side facts, or extra timelines when they interrupt the requested explanation rather than advancing it. Use [references/storyboard-guide.md](references/storyboard-guide.md).
6. If no Remotion project exists, run `bash scripts/bootstrap-remotion.sh <project-directory>`. This scaffolds the official blank template and installs the official Remotion Agent Skills. Never overwrite an existing non-empty directory.
7. Implement the video in Remotion. Read the official Remotion Skills installed in the project before editing. Use frame-driven animation with `useCurrentFrame()`, `interpolate()`, `spring()`, `Sequence`, and `Series`; do not use CSS animations, random values, or wall-clock time.
8. Prefer native HTML, SVG, Canvas, equations, charts, timelines, maps, and purposeful illustrations. For a recognizable real subject such as a vehicle, machine, animal, person, or product, do not use a crude stick figure or generic geometric outline as the final visual. Preserve the subject's silhouette, proportions, defining components, and functional structure. When the user provides reference images, inspect them first and create an original detailed visual rather than copying the source. For moving subjects, read [references/motion-direction-prompt.md](references/motion-direction-prompt.md) and define contact geometry, proportions, motion coupling, occlusion, and scene continuity before implementation. Use external images or clips only when they materially improve understanding and their license/source is recorded.
9. Add narration only from user-provided audio or an available authorized TTS service. Do not silently upload private text to an external voice service. Put media in `public/` and load it with `staticFile()`.
10. When background music is requested, use licensed music with recorded attribution or generate an original deterministic track. Build music from chords, rhythm, melody, and envelopes; do not use white, pink, or brown noise as an audible music bed. Keep music under narration and test it on ordinary phone or laptop speakers. Use `scripts/generate-light-science-music.py` for a neutral original starting point.
11. Generate captions from the final narration timing. Keep two lines maximum, provide safe margins, and maintain readable contrast. For word-level timing, use `@remotion/captions`.
12. Review representative still frames before the full render. Check the opening, every scene midpoint, transitions, and the final frame for text overflow, factual accuracy, layout, music usage, and attribution. Do not render or upload a 10-second preview unless the user explicitly requests one; avoid duplicate rendering and storage costs.
13. Export the full MP4, then normalize it with `scripts/finalize-video.sh <input.mp4> <output.mp4>`. This produces H.264 High/yuv420p video, AAC-LC stereo audio, an `avc1` tag, and a fast-start MP4 index. Never publish an unchecked stream-copy result.
14. Deliver the project directory, final video, `video-brief.json`, and `research/sources.md`. Include a preview only when explicitly requested. State any claims or media that still require manual verification.

## Project standards

- Register a `FullVideo` composition. Add a separate preview composition only when the user explicitly requests preview rendering or it materially simplifies development.
- Put editable content in data files rather than scattering copy through components.
- Build reusable components for title, caption, chart, timeline, and scene transition. Keep source metadata in the project, but do not burn source names, dates, or reference labels into the video by default. Show an on-screen source only when the user requests it, a quotation requires attribution, or the claim would otherwise be misleading.
- Use deterministic animation and stable seeds when procedural graphics are needed.
- Use safe typography: system Chinese fonts first unless a redistributable local font is bundled.
- Check portrait output separately; do not simply crop a landscape composition.
- Prefer continuous explanatory action over static stickers: keep the main subject moving while labels, arrows, diagrams, and narration explain what is happening. Couple translation, rotating parts, suspension or body motion, spray or dust, and background parallax to the same frame-driven speed signal.
- When the explanation follows a journey, process, growth path, or countdown, create a persistent start-to-finish progress cue. The subject should enter near the beginning, continue progressing while concepts are explained, and visibly reach the destination or final state at the ending.
- Derive secondary physical effects from the underlying action: speed controls spray length, wheel rotation, wake, dust, blur, or vibration; direction controls where those effects travel. Do not add generic decoration that ignores the subject's motion.
- Establish one numeric physical contact anchor before drawing and reuse its formula in every scene: wheels, skis, feet, hulls, roads, and waterlines must meet plausibly. Do not manually eyeball a different vertical position per shot. Do not place the entire subject below the surface or make it float above the ground unless the explanation explicitly requires that state.
- Keep transform math and placement math in the same coordinate system. If contact positions are calculated from the subject's top-left corner, scale and rotate from that same origin or explicitly compensate for the transform origin. Test the smallest and largest subject scales because center-origin scaling can silently shift a subject below its contact line.
- For a real machine, inventory asymmetric functional parts from reference images before drawing. Do not reuse one generic wheel, wing, support, or tool component when the real front and rear or left and right parts differ. Preserve which part steers, supports, propels, or contacts the environment.
- For people, extract a pose skeleton from the reference before styling: head, neck, shoulder, elbow, hand, hip, knee, ankle, and foot. Verify that hands reach the controls, hips meet the seat, knees bend around the body, and feet reach the pegs or ground. A filled torso plus straight limb strokes is not a finished rider.
- Keep branding off by default. Do not add a public-account name, video-channel name, creator handle, logo, watermark, or recurring account label unless the user explicitly requests it or supplies approved brand assets.
- When committing project or skill changes for a Chinese-speaking user, use concise Chinese Git commit messages unless the user requests another language.
- Never imitate a living creator's exact branded style, voice, avatar, logo, or signature transitions. Translate high-level traits such as cinematic pacing or data-driven motion into an original visual system.

## Default visual direction

先判断题材落在哪个区间，再选风格（详见 [references/code-video-limits.md](references/code-video-limits.md)）：

- **信息型**（科普、数据、原理、流程）→ 纸感编辑（`paper-editorial`）或深色数据风。
- **叙事型**（事件还原、传播复盘、商业故事）→ 卷宗档案（`archive-dossier`）。
- **人物表演型**（漫剧、角色、笑点、对话）→ **不做**，改为“把表演换成证据”的叙事结构。

For a single continuous protagonist, instantiate the subject once outside scene-local sequences; let scenes add explanatory overlays only. Keep the subject in the central action zone, use background travel for continuous motion, and derive narration milestones, captions, distance, and start/end states from one global timeline. See the motion reference for pixel-contact and rotation checks.

Use a dark editorial background, one bright accent color, restrained glow, large Chinese typography, thin grid lines, and purposeful motion. Avoid excessive particles, card grids, random gradients, fake 3D, and constant camera movement. Let the concept determine the animation.

**竖屏**不做横屏裁切：重排构图重心、字号阶梓与字幕断行，安全区和字幕基线写进 token（见 `production-workflow.md` 第十节）。

## Style tokens

When a style template is available (`styles/<id>.json`, see `references/style-templates.md`), treat it as the single source of visual truth: palette, type scale, motion curves, post-effect strength, caption rules and layout anchors all come from the token file. Do not hardcode colors or easing inside scene components, and do not exceed three colors or the declared overshoot limit.

Keep the production rules that make coded video look finished: a deterministic post layer (grain ≈4–5%, vignette ≈0.3, bloom ≈0.1), deterministic noise seeds so renders are reproducible, motion curves instead of linear, and captions of at most 22 characters over two lines.

## Production pipeline (optional)

Text deliverables alone are a valid outcome. When the user wants a finished episode, `references/production-workflow.md` covers the full path: brief → narration (free edge-tts) → timing → BGM (synthesized, deterministic) → stills review → render → loudness/color normalization → SRT.

Two rules matter most:

- **Narration decides scene length.** Synthesize first, measure with ffprobe, write real durations back into `narration-timing.json` (and the brief with `--update-brief`). Never fix a duration first and cut the voice-over to fit it.
- **Review stills before rendering the whole video.** A still costs seconds, a full render costs minutes.
- **Captions follow word-level boundaries, not character proportions.** Ask edge-tts for `boundary="WordBoundary"` and store `words` in `narration-timing.json`; proportional allocation lags by ~0.5s on average.
- **字幕断行由人写，不由字数均分。** 在 brief 里给每幕写 `captionLines`，再按每行字数吃掉字级边界；均分会切在词组中间。实现见 `template/src/kit/dossier.tsx` 的 `buildCues()`。
- **音效是第三层，不是装饰。** 旁白+配乐之外加一轨音效（`scripts/make-sfx.py`），幕切、盖章、翻页、敲字各对应一声，画面才有重音。
- **Normalize loudness with static gain plus a soft limiter, not single-pass `loudnorm`.** A single pass runs in dynamic mode and lifts the noise floor in quiet passages; measure `input_i` first, then apply gain and limit peaks to −1.5 dBTP.

## Commands

```bash
npm run dev
npx remotion render FullVideo out/review-frames --frames=0,450,900,1350,1800,2250,2699 --image-format=png
npx remotion render FullVideo out/final.mp4
python3 scripts/generate-light-science-music.py --duration 90 --output public/audio/light-science-music.wav
bash scripts/finalize-video.sh out/final.mp4 out/final-compatible.mp4

python scripts/make-narration.py --project . --update-brief
python scripts/make-bgm.py --project .
python scripts/make-sfx.py --cues cues.json --duration 64 --out public/audio/sfx.wav
python scripts/make-srt.py --project .
```

On Windows, pass composition props using a JSON file rather than inline shell JSON.

## Completion gate

Do not call the video complete until:

- every factual claim has a source or is clearly labeled as interpretation;
- the brief validator passes;
- representative still frames from the opening, scene midpoints, transitions, and ending have been reviewed;
- every scene containing the main subject has been reviewed at least once; do not approve subject geometry from only the final frame;
- explanatory text, labels, arrows, and progress indicators do not overlap the main subject or captions at any reviewed frame;
- no text is clipped at 16:9 or the requested format;
- recognizable real subjects are visually credible and not reduced to placeholder-level line art;
- human proportions are not visibly compressed or stretched, articulated parts connect naturally, and the subject's scale remains consistent across scenes;
- physical contact and occlusion are credible: the subject does not unintentionally sink below water, intersect the ground, or pass through other objects;
- the smallest-scale and largest-scale appearances preserve the same contact anchor after transforms;
- asymmetric real-world components match the references and are not duplicated from a generic reusable shape;
- expected mechanical motion is visible and synchronized, such as wheel or propeller rotation matching travel speed, with secondary motion such as spray, suspension, or body pitch;
- the main explanatory sequence uses continuous action where the topic involves motion, rather than relying only on static diagrams;
- any journey or process has a coherent visual start, ongoing progress, and visible completion;
- no unrequested account name, channel name, logo, or watermark appears in the video;
- captions match the narration;
- background audio sounds musical rather than like hiss, rumble, or static;
- 竖屏片：字幕基线不在平台 UI 区内（1080×1920 时 y ≤ 1450），且没有主体被底部 UI 遮住；
- 叙事片：没有无可靠来源的具体数字；证物框里没有无授权图片；
- 如果本轮需求包含人物表演/笑点，已明确告知能力边界并给出无表演的替代方案，而不是交出扭捏的角色动画；
- media licenses and attributions are recorded;
- the full render command succeeds.
- the delivered MP4 passes a complete FFmpeg decode and `ffprobe` confirms H.264/yuv420p plus AAC-LC whenever audio is present;
- if the file is uploaded, download or materialize that uploaded artifact and verify its size, hash, and decodability instead of assuming upload success means media integrity.
