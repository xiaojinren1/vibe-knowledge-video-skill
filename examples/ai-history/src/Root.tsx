import React from "react";
import { Composition } from "remotion";
import { AiHistory } from "./scenes/AiHistory";
import timing from "../narration-timing.json";

const total = timing.scenes.reduce((n, s) => n + Math.round(s.seconds * 30), 0);

export const RemotionRoot: React.FC = () => (
  <Composition id="AiHistory" component={AiHistory} durationInFrames={total} fps={30} width={1920} height={1080} />
);
