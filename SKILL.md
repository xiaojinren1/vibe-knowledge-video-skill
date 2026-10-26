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
- Build reusable components for title, caption, source label, chart, timeline, and scene transition.
- Keep source labels visible for statistics and quotations; add a final references scene.
- Use deterministic animation and stable seeds when procedural graphics are needed.
- Use safe typography: system Chinese fonts first unless a redistributable local font is bundled.
- Check portrait output separately; do not simply crop a landscape composition.
- Prefer continuous explanatory action over static stickers: keep the main subject moving while labels, arrows, diagrams, and narration explain what is happening. Couple translation, rotating parts, suspension or body motion, spray or dust, and background parallax to the same frame-driven speed signal.
- Establish one numeric physical contact anchor before drawing and reuse its formula in every scene: wheels, skis, feet, hulls, roads, and waterlines must meet plausibly. Do not manually eyeball a different vertical position per shot. Do not place the entire subject below the surface or make it float above the ground unless the explanation explicitly requires that state.
- For people, extract a pose skeleton from the reference before styling: head, neck, shoulder, elbow, hand, hip, knee, ankle, and foot. Verify that hands reach the controls, hips meet the seat, knees bend around the body, and feet reach the pegs or ground. A filled torso plus straight limb strokes is not a finished rider.
- Keep branding off by default. Do not add a public-account name, video-channel name, creator handle, logo, watermark, or recurring account label unless the user explicitly requests it or supplies approved brand assets.
- When committing project or skill changes for a Chinese-speaking user, use concise Chinese Git commit messages unless the user requests another language.
- Never imitate a living creator's exact branded style, voice, avatar, logo, or signature transitions. Translate high-level traits such as cinematic pacing or data-driven motion into an original visual system.

## Default visual direction

Use a dark editorial background, one bright accent color, restrained glow, large Chinese typography, thin grid lines, and purposeful motion. Avoid excessive particles, card grids, random gradients, fake 3D, and constant camera movement. Let the concept determine the animation.

## Commands

```bash
npm run dev
npx remotion render FullVideo out/review-frames --frames=0,450,900,1350,1800,2250,2699 --image-format=png
npx remotion render FullVideo out/final.mp4
python3 scripts/generate-light-science-music.py --duration 90 --output public/audio/light-science-music.wav
bash scripts/finalize-video.sh out/final.mp4 out/final-compatible.mp4
```

On Windows, pass composition props using a JSON file rather than inline shell JSON.

## Completion gate

Do not call the video complete until:

- every factual claim has a source or is clearly labeled as interpretation;
- the brief validator passes;
- representative still frames from the opening, scene midpoints, transitions, and ending have been reviewed;
- every scene containing the main subject has been reviewed at least once; do not approve subject geometry from only the final frame;
- no text is clipped at 16:9 or the requested format;
- recognizable real subjects are visually credible and not reduced to placeholder-level line art;
- human proportions are not visibly compressed or stretched, articulated parts connect naturally, and the subject's scale remains consistent across scenes;
- physical contact and occlusion are credible: the subject does not unintentionally sink below water, intersect the ground, or pass through other objects;
- expected mechanical motion is visible and synchronized, such as wheel or propeller rotation matching travel speed, with secondary motion such as spray, suspension, or body pitch;
- the main explanatory sequence uses continuous action where the topic involves motion, rather than relying only on static diagrams;
- no unrequested account name, channel name, logo, or watermark appears in the video;
- captions match the narration;
- background audio sounds musical rather than like hiss, rumble, or static;
- media licenses and attributions are recorded;
- the full render command succeeds.
- the delivered MP4 passes a complete FFmpeg decode and `ffprobe` confirms H.264/yuv420p plus AAC-LC whenever audio is present;
- if the file is uploaded, download or materialize that uploaded artifact and verify its size, hash, and decodability instead of assuming upload success means media integrity.
