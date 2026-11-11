#!/usr/bin/env python
"""生成一段原创、确定性、可商用的 BGM（纯 numpy 合成，不用任何素材库）。

用法：
    python scripts/make-bgm.py --project ./my-video --duration 70
    python scripts/make-bgm.py --project ./my-video            # 时长自动读 narration-timing.json

声音设计要点（都是踩过的坑）：
- 不做高频点缀：尖锐的拨弦在旁白底下会变成「刺耳的杂音」，宁愿无聊也不要刺耳
- 不用白噪/粉噪当底噪：那是「沙沙声」的来源，人耳会立刻觉得脏
- 低端切掉 80Hz 以下：笔记本/手机喇叭放不出来，只会糊成一片嗡声
- 正弦垫音加二次/三次谐波与轻微失谐：纯正弦像风琴，听起来「怪」
- 音量压得很低（峰值 ~0.4），给旁白让位
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


def highpass(x: np.ndarray, cutoff: float, sr: int = SR) -> np.ndarray:
    return x - lowpass(x, cutoff, sr)


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
    pad = np.zeros(n)
    bells = np.zeros(n)

    # A 小调铺底：Am9 – Fmaj7 – Cmaj7 – Gsus，每 8 秒换一次
    chords = [
        [hz(-12), hz(-5), hz(0), hz(3)],
        [hz(-16), hz(-9), hz(-4), hz(0)],
        [hz(-21), hz(-9), hz(-2), hz(3)],
        [hz(-14), hz(-7), hz(0), hz(5)],
    ]
    bar = 8.0
    for i, chord in enumerate(chords * 64):
        start = i * bar
        if start >= duration - 0.1:
            break
        seg_len = min(bar + 1.6, duration - start)
        idx0 = int(start * SR)
        idx1 = min(n, int((start + seg_len) * SR))
        tt = np.arange(idx1 - idx0) / SR
        seg = np.zeros(idx1 - idx0)
        for k, f in enumerate(chord):
            detune = 1.0 + 0.0015 * (1 if k % 2 else -1)
            seg += np.sin(2 * math.pi * f * detune * tt) * (0.8 - 0.12 * k)
            seg += 0.30 * np.sin(2 * math.pi * f * 2 * detune * tt) * (0.8 - 0.12 * k)
            seg += 0.10 * np.sin(2 * math.pi * f * 3 * detune * tt) * (0.8 - 0.12 * k)
        seg *= adsr(len(seg), 2.2, 1.6, 0.8, 2.0)
        pad[idx0:idx1] += seg * 0.10

    # 极慢的呼吸感（0.05Hz），避免长音听成"电流声"
    pad *= 1.0 + 0.08 * np.sin(2 * math.pi * 0.05 * np.arange(n) / SR)

    # 低频清理后总体柔化：切掉 80Hz 以下、5kHz 以上
    pad = highpass(pad, 80)
    pad = lowpass(pad, 5000)

    # 稀疏钟琴：每 4 秒一个，落在 A 小调五声音阶，起音慢、尾巴长、限带 2.4kHz
    pentatonic = [hz(x) for x in (0, 3, 5, 7, 10, 12)]
    for i in range(int(duration / 4) + 1):
        start = i * 4.0 + 1.1
        if start >= duration - 2:
            break
        freq = pentatonic[int(rng.integers(0, len(pentatonic)))]
        idx0 = int(start * SR)
        idx1 = min(n, int((start + 2.4) * SR))
        if idx1 <= idx0:
            continue
        tt = np.arange(idx1 - idx0) / SR
        env = adsr(idx1 - idx0, 0.06, 0.5, 0.0, 1.8)
        tone = (np.sin(2 * math.pi * freq * tt) + 0.22 * np.sin(2 * math.pi * freq * 2 * tt)) * env
        bells[idx0:idx1] += tone * 0.022
    bells = lowpass(bells, 2400)

    mix = pad + bells

    # 12ms 立体声展宽（钟琴略有左右差）
    delay = int(0.012 * SR)
    left = mix
    right = np.concatenate([np.zeros(delay), mix[:-delay]])
    stereo = np.stack([left, right], axis=1)

    fade_in = int(2.5 * SR)
    fade_out = int(3.5 * SR)
    stereo[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    stereo[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]

    peak = np.max(np.abs(stereo))
    stereo = stereo / max(peak, 1e-9) * 0.40
    pcm = (stereo * 32767).astype(np.int16)

    with wave.open(output, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {output}  {duration}s  peak 0.40")


if __name__ == "__main__":
    main()
