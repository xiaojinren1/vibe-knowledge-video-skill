#!/usr/bin/env python3
"""Generate a deterministic, noise-free light science music bed."""

import argparse
import math
import wave
from pathlib import Path

import numpy as np


def render(output: Path, duration: float, bpm: float, sample_rate: int) -> None:
    total = int(sample_rate * duration)
    left = np.zeros(total, dtype=np.float64)
    right = np.zeros(total, dtype=np.float64)

    def add_note(freq: float, start: float, length: float, amp: float, pan: float = 0.0, pluck: bool = False) -> None:
        a = max(0, int(start * sample_rate))
        b = min(total, a + int(length * sample_rate))
        if b <= a:
            return
        t = np.arange(b - a, dtype=np.float64) / sample_rate
        attack = np.minimum(1.0, t / (0.04 if pluck else 0.55))
        release = np.minimum(1.0, np.maximum(0.0, length - t) / (0.35 if pluck else 1.6))
        env = attack * release
        if pluck:
            env *= np.exp(-2.5 * t / max(length, 0.01))
        signal = np.sin(2 * math.pi * freq * t) + 0.18 * np.sin(4 * math.pi * freq * t)
        signal *= env * amp
        left[a:b] += signal * math.sqrt((1 - pan) / 2)
        right[a:b] += signal * math.sqrt((1 + pan) / 2)

    chords = [
        [130.81, 164.81, 196.00, 246.94],  # Cmaj7
        [110.00, 130.81, 164.81, 196.00],  # Am7
        [87.31, 130.81, 164.81, 196.00],   # Fmaj7
        [98.00, 146.83, 196.00, 220.00],   # Gadd9
    ]
    beat = 60 / bpm
    bar = beat * 4
    for bar_index in range(int(math.ceil(duration / bar))):
        start = bar_index * bar
        chord = chords[bar_index % len(chords)]
        for i, freq in enumerate(chord):
            add_note(freq, start, bar + 0.35, 0.035, (i - 1.5) * 0.22)
        for step in range(8):
            add_note(chord[(step + bar_index) % 4] * 2, start + step * beat / 2, beat * 0.42, 0.055, -0.35 + (step % 4) * 0.23, True)
        if bar_index % 2 == 0:
            for i, freq in enumerate([392.00, 440.00, 493.88, 523.25]):
                add_note(freq, start + (i + 2) * beat / 2, beat * 0.48, 0.035, 0.22, True)

    delay = int(0.28 * sample_rate)
    left[delay:] += right[:-delay] * 0.14
    right[delay:] += left[:-delay] * 0.11
    fade_in = min(int(3 * sample_rate), total)
    fade_out = min(int(5 * sample_rate), total)
    left[:fade_in] *= np.linspace(0, 1, fade_in)
    right[:fade_in] *= np.linspace(0, 1, fade_in)
    left[-fade_out:] *= np.linspace(1, 0, fade_out)
    right[-fade_out:] *= np.linspace(1, 0, fade_out)

    peak = max(np.max(np.abs(left)), np.max(np.abs(right)), 1e-9)
    pcm = np.clip(np.stack([left, right], axis=1) * (0.72 / peak), -1, 1)
    output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes((pcm * 32767).astype("<i2").tobytes())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("public/audio/light-science-music.wav"))
    parser.add_argument("--duration", type=float, default=90.0)
    parser.add_argument("--bpm", type=float, default=84.0)
    parser.add_argument("--sample-rate", type=int, default=44100)
    args = parser.parse_args()
    render(args.output, args.duration, args.bpm, args.sample_rate)
