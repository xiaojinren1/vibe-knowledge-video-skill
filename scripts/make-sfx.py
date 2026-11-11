#!/usr/bin/env python
"""确定性音效合成：鼓点 / 锣 / 木鱼 / 嗖 / 打字机 / 印章 / 纸张。

用途：给代码渲的视频补"重音"，不依赖任何素材库，可商用。
两种用法：

1) 生成单条音效（做素材库）：
    python scripts/make-sfx.py --preset gong --out public/audio/gong.wav
2) 按 cue 列表铺一整条音轨（跟着镜头走）：
    python scripts/make-sfx.py --cues cues.json --duration 20 --out public/audio/sfx.wav

cues.json 形状（时间是绝对秒）：
    [{"at": 0.0, "preset": "drum", "gain": 0.9},
     {"at": 1.33, "preset": "gong", "freq": 300, "gain": 0.5}]

设计约束（都是踩过的坑）：
- 底鼓一律压到 120Hz 以下，手机喇叭才不刺
- 锣用非谐分音（1 / 2.37 / 3.71 / 5.13），纯谐波听起来像"叮"
- 噪声只给瞬态（木鱼、嗖、打字机），不当铺底
- 峰值压到 0.7 左右，混音时再乘音量
"""
import argparse
import json
import math
import os
import wave

import numpy as np

SR = 48000


def env_exp(n: int, attack: float, decay: float) -> np.ndarray:
    a = max(1, int(attack * SR))
    e = np.zeros(n)
    e[:a] = np.linspace(0, 1, a)
    rest = n - a
    if rest > 0:
        e[a:] = np.exp(-np.linspace(0, 1, rest) * (6.0 / max(0.02, decay)))
    return e


def sine_sweep(f0: float, f1: float, dur: float, decay: float = 0.25, amp: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    freq = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * env_exp(n, 0.002, decay) * amp


def drum(f0: float = 150, f1: float = 58, dur: float = 0.34, amp: float = 1.0) -> np.ndarray:
    """底鼓：低频下坠 + 一点皮膜谐波"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    return sine_sweep(f0, f1, dur, 0.3, amp) + np.sin(2 * np.pi * f1 * 2.4 * t) * env_exp(n, 0.001, 0.06) * 0.22 * amp


def gong(f0: float = 420, dur: float = 0.7, amp: float = 1.0) -> np.ndarray:
    """锣：非谐分音叠加，尾巴快速收，别拖成'叮——'"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, a, d in [(1.0, 1.0, 0.32), (2.37, 0.55, 0.2), (3.71, 0.34, 0.14), (5.13, 0.2, 0.1)]:
        out += np.sin(2 * np.pi * f0 * ratio * t + ratio) * env_exp(n, 0.004, d) * a
    return out * amp / 1.9


def ker(f0: float = 900, dur: float = 0.16, amp: float = 1.0) -> np.ndarray:
    """木鱼 / 鼓边：窄带噪声 + 短正弦，只有一颗瞬态"""
    n = int(dur * SR)
    rng = np.random.default_rng(7)
    noise = rng.standard_normal(n)
    lp = np.convolve(noise, np.ones(6) / 6, mode="same")
    hp = noise - lp
    t = np.arange(n) / SR
    sig = lp * 0.5 + hp * 0.8 + np.sin(2 * np.pi * f0 * t) * 0.35
    return sig * env_exp(n, 0.001, 0.05) * amp * 0.55


def whoosh(dur: float = 0.55, amp: float = 1.0, seed: int = 21) -> np.ndarray:
    """嗖：噪声 + 先涨后落的包络，越往后越闷"""
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(n)
    body = np.convolve(noise, np.ones(4) / 4, mode="same")
    for i in range(1, 6):
        k = max(1, int(i * 2.2))
        body = body + np.convolve(noise, np.ones(k) / k, mode="same") * 0.25 / i
    t = np.linspace(0, 1, n)
    sig = body * np.sin(np.pi * t) ** 1.6
    return np.convolve(sig, np.ones(3) / 3, mode="same") * amp * 0.32


def typewriter(amp: float = 1.0, f0: float = 2100) -> np.ndarray:
    """打字机：一颗高频瞬态，10ms 内结束"""
    n = int(0.05 * SR)
    rng = np.random.default_rng(7)
    noise = rng.standard_normal(n)
    hp = noise - np.convolve(noise, np.ones(4) / 4, mode="same")
    t = np.arange(n) / SR
    return (hp * 0.8 + np.sin(2 * np.pi * f0 * t) * 0.35) * env_exp(n, 0.0005, 0.012) * 0.2 * amp


def stamp(amp: float = 1.0) -> np.ndarray:
    """印章：低频闷响 + 一下噪声click，像纸被压住"""
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    freq = 96 * (40 / 96) ** (t / 0.5)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * env_exp(n, 0.001, 0.12)
    rng = np.random.default_rng(5)
    click = rng.standard_normal(n) * env_exp(n, 0.0008, 0.02) * 0.25
    return (body + click) * 0.55 * amp


def paper(dur: float = 0.5, amp: float = 1.0, seed: int = 3) -> np.ndarray:
    """纸张摩擦：中频噪声，包络先缓后急"""
    n = int(dur * SR)
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(n)
    lp = np.convolve(noise, np.ones(10) / 10, mode="same")
    hp = noise - np.convolve(noise, np.ones(3) / 3, mode="same")
    t = np.linspace(0, 1, n)
    return (lp * 0.8 + hp * 0.35) * np.sin(np.pi * t ** 0.6) ** 1.4 * 0.16 * amp


PRESETS = {
    "drum": lambda kw: drum(kw.get("freq", 150), kw.get("freq_to", 58), kw.get("dur", 0.34), kw.get("amp", 1.0)),
    "gong": lambda kw: gong(kw.get("freq", 420), kw.get("dur", 0.7), kw.get("amp", 1.0)),
    "ker": lambda kw: ker(kw.get("freq", 900), kw.get("dur", 0.16), kw.get("amp", 1.0)),
    "whoosh": lambda kw: whoosh(kw.get("dur", 0.55), kw.get("amp", 1.0)),
    "typewriter": lambda kw: typewriter(kw.get("amp", 1.0), kw.get("freq", 2100)),
    "stamp": lambda kw: stamp(kw.get("amp", 1.0)),
    "paper": lambda kw: paper(kw.get("dur", 0.5), kw.get("amp", 1.0)),
}


def write_wav(path: str, buf: np.ndarray, peak_target: float = 0.72) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    peak = float(np.max(np.abs(buf))) or 1.0
    buf = buf / peak * peak_target
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((buf * 32767).astype("<i2").tobytes())
    print(f"wrote {path}  {len(buf) / SR:.2f}s  peak={np.max(np.abs(buf)):.3f}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preset", help="单条音效：drum/gong/ker/whoosh/typewriter/stamp/paper")
    ap.add_argument("--out", required=True)
    ap.add_argument("--cues", help="cue 列表 JSON，与 --duration 一起用")
    ap.add_argument("--duration", type=float, default=0.0, help="整条音轨长度（秒）")
    ap.add_argument("--tail", type=float, default=0.4, help="结尾留白（秒）")
    ap.add_argument("--peak", type=float, default=0.72)
    args = ap.parse_args()

    if args.preset:
        if args.preset not in PRESETS:
            raise SystemExit(f"unknown preset: {args.preset}；可选 {', '.join(PRESETS)}")
        write_wav(args.out, PRESETS[args.preset]({}), args.peak)
        return

    if not args.cues or args.duration <= 0:
        raise SystemExit("要么给 --preset，要么给 --cues 和 --duration")

    cues = json.load(open(args.cues, encoding="utf-8"))
    total = args.duration + args.tail
    buf = np.zeros(int(total * SR) + 1)
    for cue in cues:
        preset = cue["preset"]
        if preset not in PRESETS:
            raise SystemExit(f"unknown preset in cues: {preset}")
        kw = {k: v for k, v in cue.items() if k not in ("at", "preset", "gain")}
        sig = PRESETS[preset](kw)
        i = int(float(cue["at"]) * SR)
        if i >= len(buf):
            continue
        j = min(len(buf), i + len(sig))
        buf[i:j] += sig[: j - i] * float(cue.get("gain", 1.0))

    buf = np.convolve(buf, np.ones(3) / 3, mode="same")
    n = int(0.01 * SR)
    buf[:n] *= np.linspace(0, 1, n)
    n = int(0.3 * SR)
    buf[-n:] *= np.linspace(1, 0, n)
    buf = np.tanh(buf / 0.9) * 0.9
    write_wav(args.out, buf, args.peak)


if __name__ == "__main__":
    main()
