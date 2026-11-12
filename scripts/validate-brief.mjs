#!/usr/bin/env node
import fs from 'node:fs';
const path = process.argv[2];
if (!path) throw new Error('Usage: node validate-brief.mjs <video-brief.json>');
const brief = JSON.parse(fs.readFileSync(path, 'utf8'));
for (const key of ['title','audience','language','durationSeconds','aspectRatio','fps','scenes','claims']) if (brief[key] === undefined) throw new Error(`Missing ${key}`);
if (!Array.isArray(brief.scenes) || brief.scenes.length === 0) throw new Error('scenes must be non-empty');
if (!Array.isArray(brief.claims)) throw new Error('claims must be an array');

// 与 template/src/kit/cues.ts、scripts/make-srt.py 保持一致：标点与空白不参与对齐
const normalizeCue = (s) => String(s ?? '').replace(/[\s，。！？、；：,.!?;:"'“”‘’（）()[\]{}—–…·《》<>/\\|-]/g, '');

const claimIds = new Set();
for (const claim of brief.claims) {
  if (!claim.id || claimIds.has(claim.id)) throw new Error(`Invalid or duplicate claim id: ${claim.id}`);
  claimIds.add(claim.id);
  if (!['verified','interpretation','unverified'].includes(claim.status)) throw new Error(`Invalid claim status: ${claim.id}`);
  if (claim.status === 'verified' && (!claim.sourceUrl || !claim.sourceTitle)) throw new Error(`Verified claim lacks source: ${claim.id}`);
}
const sceneIds = new Set(); let cursor = 0; let elementCount = 0;
for (const scene of brief.scenes) {
  if (!scene.id || sceneIds.has(scene.id)) throw new Error(`Invalid or duplicate scene id: ${scene.id}`);
  sceneIds.add(scene.id);
  if (Math.abs(scene.startSeconds - cursor) > 0.001) throw new Error(`Scene ${scene.id} is not contiguous; expected ${cursor}`);
  if (!(scene.durationSeconds > 0)) throw new Error(`Invalid duration: ${scene.id}`);
  for (const id of scene.claims ?? []) if (!claimIds.has(id)) throw new Error(`Unknown claim ${id} in scene ${scene.id}`);

  // elements：幕内画面元素的出点锚点（见 references/cue-anchoring.md）
  // 锚点必须是本幕旁白里真实存在的一段文字，否则配音里找不到，渲染时会静默退回幕首。
  if (scene.elements !== undefined) {
    if (!Array.isArray(scene.elements)) throw new Error(`scene ${scene.id}: elements must be an array`);
    const elementIds = new Set();
    const narration = normalizeCue(scene.narration);
    if (scene.elements.length && !narration) throw new Error(`scene ${scene.id}: elements need narration to anchor to`);
    for (const el of scene.elements) {
      if (!el.id) throw new Error(`scene ${scene.id}: element without id`);
      if (elementIds.has(el.id)) throw new Error(`scene ${scene.id}: duplicate element id ${el.id}`);
      elementIds.add(el.id);
      if (!el.at) throw new Error(`scene ${scene.id}: element ${el.id} lacks an anchor ("at")`);
      if (!narration.includes(normalizeCue(el.at))) {
        throw new Error(`scene ${scene.id}: element ${el.id} anchor "${el.at}" is not in that scene's narration — 锚点必须逐字出现在旁白里`);
      }
      elementCount += 1;
    }
  }
  cursor += scene.durationSeconds;
}
if (cursor > brief.durationSeconds + 0.001) throw new Error(`Scenes total ${cursor}s exceeds duration ${brief.durationSeconds}s`);
const extra = elementCount ? `, ${elementCount} element anchors` : '';
console.log(`Valid brief: ${brief.scenes.length} scenes, ${brief.claims.length} claims, ${cursor}s${extra}`);
