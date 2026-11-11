import React from "react";
import { Composition } from "remotion";
import { KnowledgeVideo } from "./scenes/KnowledgeVideo";
import timing from "../narration-timing.json";

// 时长由 narration-timing.json 决定（scripts/make-narration.py 生成），
// 所以改旁白就自动改片长，不需要手改这里。
const total = timing.scenes.reduce((n: number, s: { seconds: number }) => n + Math.round(s.seconds * 30), 0);

export const RemotionRoot: React.FC = () => (
  <Composition id="KnowledgeVideo" component={KnowledgeVideo} durationInFrames={total} fps={30} width={1920} height={1080} />
);
