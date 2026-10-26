#!/usr/bin/env node
import fs from 'node:fs';
const path = process.argv[2];
if (!path) throw new Error('Usage: node validate-brief.mjs <video-brief.json>');
const brief = JSON.parse(fs.readFileSync(path, 'utf8'));
for (const key of ['title','audience','language','durationSeconds','aspectRatio','fps','scenes','claims']) if (brief[key] === undefined) throw new Error(`Missing ${key}`);
if (!Array.isArray(brief.scenes) || brief.scenes.length === 0) throw new Error('scenes must be non-empty');
if (!Array.isArray(brief.claims)) throw new Error('claims must be an array');
const claimIds = new Set();
for (const claim of brief.claims) {
  if (!claim.id || claimIds.has(claim.id)) throw new Error(`Invalid or duplicate claim id: ${claim.id}`);
  claimIds.add(claim.id);
  if (!['verified','interpretation','unverified'].includes(claim.status)) throw new Error(`Invalid claim status: ${claim.id}`);
  if (claim.status === 'verified' && (!claim.sourceUrl || !claim.sourceTitle)) throw new Error(`Verified claim lacks source: ${claim.id}`);
}
const sceneIds = new Set(); let cursor = 0;
for (const scene of brief.scenes) {
  if (!scene.id || sceneIds.has(scene.id)) throw new Error(`Invalid or duplicate scene id: ${scene.id}`);
  sceneIds.add(scene.id);
  if (Math.abs(scene.startSeconds - cursor) > 0.001) throw new Error(`Scene ${scene.id} is not contiguous; expected ${cursor}`);
  if (!(scene.durationSeconds > 0)) throw new Error(`Invalid duration: ${scene.id}`);
  for (const id of scene.claims ?? []) if (!claimIds.has(id)) throw new Error(`Unknown claim ${id} in scene ${scene.id}`);
  cursor += scene.durationSeconds;
}
if (cursor > brief.durationSeconds + 0.001) throw new Error(`Scenes total ${cursor}s exceeds duration ${brief.durationSeconds}s`);
console.log(`Valid brief: ${brief.scenes.length} scenes, ${brief.claims.length} claims, ${cursor}s`);

