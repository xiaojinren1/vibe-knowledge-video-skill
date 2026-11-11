#!/usr/bin/env python
"""生成原创、确定性、可商用的 BGM（纯 numpy 合成，不用任何素材库）。

风格：科普 / 解释类视频常用的「温暖铺底 + 木琴拨奏 + 轻木质节拍」，中速、不抢人声。

声音设计上的硬约束（都是踩过的坑）：
- 全频段限带在 ~1.6kHz 以内（双击低通）：高频是"刺耳"的唯一来源，宁可闷也不要扎耳
- 不用白噪 / 粉噪：人耳立刻觉得脏；需要节奏就用木质短音，不用噪声
- 拨奏起音 20ms、衰减 0.5s：太快的起音在耳机上就是"啪"的一声
- 低频切 70Hz 以下：手机喇叭放不出来，只会糊
- 峰值压到 0.38，混音时再乘 0.22，保证永远在旁白之下
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


def lowpass(x: np.ndarray, cutoff: float, sr: int = SR, poles: int = 2) -> np.ndarray:
    """一阶 IIR 级联出更陡的滚降，避免高频从滤波器缝里漏出来。"""
    a = math.exp(-2 * math.pi * cutoff / sr)
    y = x
    for _ in range(poles):
        out = np.empty_like(y)
        acc = 0.0
        for i in range(len(y)):
            acc = (1 - a) * y[i] + a * acc
            out[i] = acc
        y = out
    return y


def highpass(x: np.ndarray, cutoff: float, sr: int = SR) -> np.ndarray:
    return x - lowpass(x, cutoff, sr, poles=1)


def hz(semitones_from_a4: float) -> float:
    return 440.0 * (2 ** (semitones_from_a4 / 12))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default=".", help="Remotion 工程目录")
    ap.add_argument("--duration", type=float, default=None, help="默认读 narration-timing.json 的总时长 +2s")
    ap.add_argument("--output", default=None, help="默认 <project>/public/audio/bgm.wav")
    ap.add_argument("--seed", type=int, default=20261110)
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
    t_all = np.arange(n) / SR
    pad = np.zeros(n)
    pluck = np.zeros(n)
    wood = np.zeros(n)

    bpm = 96.0
    beat = 60.0 / bpm           # 0.625s
    bar = beat * 4              # 2.5s

    # Am – F – C – G，每个和弦 2 小节（5 秒）
    chords = [
        [hz(-12), hz(-5), hz(0), hz(3)],    # A2 E3 A3 C4
        [hz(-16), hz(-9), hz(-4), hz(3)],   # F2 F3 A3 C4
        [hz(-21), hz(-9), hz(-2), hz(4)],   # C2 C3 D4 E4
        [hz(-14), hz(-7), hz(2), hz(5)],    # G2 G3 D4 F4
    ]

    total_bars = int(duration / bar) + 2
    for b in range(total_bars):
        chord = chords[(b // 2) % len(chords)]
        start = b * bar
        if start >= duration:
            break
        dur = min(bar + 0.8, duration - start)
        i0, i1 = int(start * SR), min(n, int((start + dur) * SR))
        if i1 <= i0:
            continue
        tt = np.arange(i1 - i0) / SR
        seg = np.zeros(i1 - i0)
        for k, f in enumerate(chord):
            seg += (0.7 - 0.1 * k) * np.sin(2 * math.pi * f * tt)
            seg += (0.18 - 0.03 * k) * np.sin(2 * math.pi * f * 2 * tt)
        seg *= adsr(len(seg), 1.2, 0.8, 0.75, 1.0)
        pad[i0:i1] += seg * 0.085

        # 木琴拨奏：每拍一个音，取和弦音 + 高八度，音量随机 ±1.5dB
        for beat_i in range(4):
            for half in (0.0, 0.5):
                pos = start + (beat_i + half) * beat
                if pos >= duration - 0.4:
                    continue
                f = chord[int(rng.integers(0, len(chord)))] * (2 if rng.random() < 0.35 else 1)
                j0 = int(pos * SR)
                j1 = min(n, int((pos + 0.7) * SR))
                if j1 <= j0:
                    continue
                tt2 = np.arange(j1 - j0) / SR
                tone = np.sin(2 * math.pi * f * tt2) + 0.22 * np.sin(2 * math.pi * f * 2 * tt2)
                tone *= adsr(len(tone), 0.02, 0.18, 0.0, 0.5)
                pluck[j0:j1] += tone * (0.020 if half == 0 else 0.013)

        # 木质节拍：第 2、4 拍
        for beat_i in (1, 3):
            pos = start + beat_i * beat
            if pos >= duration - 0.2:
                continue
            j0 = int(pos * SR)
            j1 = min(n, int((pos + 0.09) * SR))
            if j1 <= j0:
                continue
            tt3 = np.arange(j1 - j0) / SR
            tone = np.sin(2 * math.pi * 640 * tt3) + 0.3 * np.sin(2 * math.pi * 960 * tt3)
            tone *= adsr(len(tone), 0.004, 0.03, 0.0, 0.05)
            wood[j0:j1] += tone * 0.010

    # 统一限带：pad 1.4k、拨奏 1.8k、木质 1.6k（双击低通，避免高频泄漏）
    pad = lowpass(pad, 1400)
    pluck = lowpass(pluck, 1800)
    wood = lowpass(wood, 1600)

    mix = pad + pluck + wood
    mix = highpass(mix, 70)

    # 轻微呼吸（0.08Hz），避免长音听成电流声
    mix *= 1.0 + 0.05 * np.sin(2 * math.pi * 0.08 * t_all)

    delay = int(0.011 * SR)
    stereo = np.stack([mix, np.concatenate([np.zeros(delay), mix[:-delay]])], axis=1)

    fade_in = int(2.0 * SR)
    fade_out = int(3.0 * SR)
    stereo[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    stereo[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]

    peak = np.max(np.abs(stereo))
    stereo = stereo / max(peak, 1e-9) * 0.38
    pcm = (stereo * 32767).astype(np.int16)

    with wave.open(output, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {output}  {duration}s  bpm {bpm:.0f}  peak 0.38")


if __name__ == "__main__":
    main()
