#!/usr/bin/env python
"""生成一段原创、确定性、可商用的 BGM（纯 numpy 合成，不用任何素材库）。

用法：
    python scripts/make-bgm.py --project ./my-video --duration 70
    python scripts/make-bgm.py --project ./my-video            # 时长自动读 narration-timing.json

风格：低频和弦垫 + 稀疏拨弦 + 极轻走带噪声，天生不抢人声（-26 LUFS 量级）。
"""
import argparse
import json
import math
import os
import wave

import numpy as np

SR = 48000


def adsr(n: int, a: float, d: float, s: float, r: float, sr: int = SR) -> np.ndarray:
    a_n, d_n, r_n = int(a * sr), int(d * sr), int(r * sr)
    s_n = max(0, n - a_n - d_n - r_n)
    env = np.concatenate(
        [
            np.linspace(0, 1, a_n, endpoint=False),
            np.linspace(1, s, d_n, endpoint=False),
            np.full(s_n, s),
            np.linspace(s, 0, r_n),
        ]
    )
    return env[:n] if len(env) >= n else np.pad(env, (0, n - len(env)))


def lowpass(x: np.ndarray, cutoff: float, sr: int = SR) -> np.ndarray:
    a = math.exp(-2 * math.pi * cutoff / sr)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def hz(semitones_from_a4: float) -> float:
    return 440.0 * (2 ** (semitones_from_a4 / 12))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default=".", help="Remotion 工程目录")
    ap.add_argument("--duration", type=float, default=None, help="默认读 narration-timing.json 的总时长 +2s")
    ap.add_argument("--output", default=None, help="默认 <project>/public/audio/bgm.wav")
    ap.add_argument("--seed", type=int, default=20261110, help="固定种子，保证两次生成完全一致")
    args = ap.parse_args()

    project = os.path.abspath(args.project)
    duration = args.duration
    if duration is None:
        timing_path = os.path.join(project, "narration-timing.json")
        if not os.path.exists(timing_path):
            raise SystemExit("没有 --duration，也找不到 narration-timing.json；先跑 make-narration.py")
        duration = round(json.load(open(timing_path, encoding="utf-8"))["total"] + 2.0, 2)
    output = args.output or os.path.join(project, "public", "audio", "bgm.wav")
    os.makedirs(os.path.dirname(output), exist_ok=True)

    rng = np.random.default_rng(args.seed)
    n = int(duration * SR)
    mix = np.zeros(n)

    # A 小调铺底：Am – F – C – G，每 8 秒换一次
    chords = [
        [hz(-12), hz(-9), hz(0)],
        [hz(-16), hz(-12), hz(3)],
        [hz(-21), hz(-12), hz(3)],
        [hz(-14), hz(-10), hz(0)],
    ]
    bar = 8.0
    for i, chord in enumerate(chords * 64):
        start = i * bar
        if start >= duration - 0.1:
            break
        seg_len = min(bar + 1.2, duration - start)
        idx0 = int(start * SR)
        idx1 = min(n, int((start + seg_len) * SR))
        seg = np.zeros(idx1 - idx0)
        tt = np.arange(len(seg)) / SR
        for k, f in enumerate(chord):
            seg += np.sin(2 * math.pi * f * tt) * (0.9 - 0.2 * k)
            seg += 0.22 * np.sin(2 * math.pi * f * 2.003 * tt) * (0.9 - 0.2 * k)
        seg *= adsr(len(seg), 1.4, 1.2, 0.75, 1.6)
        mix[idx0:idx1] += seg * 0.16

    # 稀疏拨弦：每 2 秒一个，音高取自五度堆叠
    scale = [hz(x) for x in (-5, 0, 3, 7, 10, 12, 15, 19)]
    for i in range(int(duration / 2)):
        start = i * 2.0 + 0.35 * (i % 3)
        freq = scale[int(rng.integers(0, len(scale)))]
        idx0 = int(start * SR)
        idx1 = min(n, int((start + 1.9) * SR))
        if idx1 <= idx0:
            continue
        tt = np.arange(idx1 - idx0) / SR
        seg = np.sin(2 * math.pi * freq * tt) + 0.3 * np.sin(2 * math.pi * freq * 2 * tt)
        seg *= adsr(len(seg), 0.005, 0.35, 0.0, 1.4)
        mix[idx0:idx1] += seg * 0.05

    # 极轻走带噪声，避免数字静音的死板
    mix += lowpass(rng.normal(0, 1, n), 900) * 0.006
    mix = lowpass(mix, 5200)

    # 12ms 立体声展宽
    delay = int(0.012 * SR)
    left = mix
    right = np.concatenate([np.zeros(delay), mix[:-delay]])
    stereo = np.stack([left, right], axis=1)

    fade_in = int(2.5 * SR)
    fade_out = int(3.5 * SR)
    stereo[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    stereo[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]

    peak = np.max(np.abs(stereo))
    stereo = stereo / peak * 0.55
    pcm = (stereo * 32767).astype(np.int16)

    with wave.open(output, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {output}  {duration}s")


if __name__ == "__main__":
    main()
