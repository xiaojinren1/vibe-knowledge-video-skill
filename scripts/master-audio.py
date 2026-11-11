#!/usr/bin/env python
"""母带处理：把渲染出来的音轨做到 -16 LUFS 左右，同时不许削波、不做动态压缩。

为什么不用 ffmpeg 的 loudnorm 单遍：
单遍 loudnorm 是**动态**模式（normalization_type: dynamic），它会在安静段落抬起底噪、
跟着声音忽大忽小地推拉——听起来就是"偶尔有个说不清的杂音/忽远忽近"。
这里改成：静态增益 + 软限幅（只压超过阈值的峰值，其余原样），透明得多。

用法：
    ffmpeg -i out/v.mp4 -map 0:a -f wav out/_mix.wav
    python scripts/master-audio.py --input out/_mix.wav --output out/_master.wav --gain-db 8.2 --ceiling-dbtp -1.5
    ffmpeg -i out/v.mp4 -i out/_master.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k out/final.mp4

gain-db 怎么定：用一遍 loudnorm 的 print_format=json 读出 input_i（实测响度），
gain = -16 - input_i。
"""
import argparse
import wave

import numpy as np


def read_wav(path: str):
    with wave.open(path, "rb") as w:
        ch = w.getnchannels()
        sr = w.getframerate()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768.0
    return data.reshape(-1, ch), sr


def write_wav(path: str, data: np.ndarray, sr: int) -> None:
    pcm = np.clip(data, -1.0, 1.0)
    pcm = (pcm * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(data.shape[1])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def sliding_min(x: np.ndarray, win: int) -> np.ndarray:
    """滑动窗口最小值（单调队列），O(n)。"""
    from collections import deque

    out = np.empty_like(x)
    dq: deque[int] = deque()
    for i, v in enumerate(x):
        while dq and x[dq[-1]] >= v:
            dq.pop()
        dq.append(i)
        while dq[0] <= i - win:
            dq.popleft()
        out[i] = x[dq[0]]
    return out


def soft_limit(x: np.ndarray, ceiling: float, attack_ms: float = 6.0, release_ms: float = 150.0, sr: int = 48000) -> np.ndarray:
    """前视软限幅：只在超过 ceiling 时下压，提前 attack 起压、release 平滑回升。"""
    peak = np.max(np.abs(x), axis=1)
    if peak.max() <= ceiling:
        return x

    target = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    attack = max(1, int(attack_ms / 1000 * sr))
    release = max(1, int(release_ms / 1000 * sr))

    # 前视：把下压提前 attack 个样本，避免起音被削
    pad = np.ones(attack)
    look = sliding_min(np.concatenate([target[attack:], pad]), attack)

    # 释放：下压结束后按时间常数回升
    coef = float(np.exp(-1.0 / release))
    smooth = np.empty_like(look)
    cur = 1.0
    for i, v in enumerate(look):
        cur = v if v < cur else v + (cur - v) * coef
        smooth[i] = cur

    return x * smooth[:, None]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--gain-db", type=float, required=True, help="-16 减去实测 input_i")
    ap.add_argument("--ceiling-dbtp", type=float, default=-1.5)
    ap.add_argument("--residual-gain", action="store_true", help="限幅后按需回补少量增益（默认关闭）")
    args = ap.parse_args()

    data, sr = read_wav(args.input)
    gain = 10 ** (args.gain_db / 20)
    out = data * gain

    ceiling = 10 ** (args.ceiling_dbtp / 20)
    out = soft_limit(out, ceiling, sr=sr)

    rms = np.sqrt((out**2).mean())
    peak = np.abs(out).max()
    print(f"增益 {args.gain_db:+.2f} dB → RMS {20 * np.log10(rms + 1e-12):.1f} dBFS，峰值 {20 * np.log10(peak + 1e-12):.1f} dBFS")
    write_wav(args.output, out, sr)


if __name__ == "__main__":
    main()
