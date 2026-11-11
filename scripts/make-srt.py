#!/usr/bin/env python
"""由 narration-timing.json 生成 SRT 字幕（与画面内字幕同一套切块规则，保证零重叠）。

用法：
    python scripts/make-srt.py --project ./my-video
    python scripts/make-srt.py --project ./my-video --max-chars 22 --out out/captions.srt
"""
import argparse
import json
import os
import re


def split_chunks(text: str, limit: int):
    parts = [p.strip() for p in re.split(r"(?<=[。！？])", text) if p.strip()]
    out = []
    for p in parts:
        if len(p) <= limit:
            out.append(p)
            continue
        buf = ""
        for seg in re.split(r"(?<=[，、；])", p):
            if len(buf + seg) > limit and buf:
                out.append(buf)
                buf = seg
            else:
                buf += seg
        if buf:
            out.append(buf)
    return out


def ts(t: float) -> str:
    t = max(0.0, t)
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return "{:02d}:{:02d}:{:06.3f}".format(h, m, s).replace(".", ",")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default=".")
    ap.add_argument("--timing", default="narration-timing.json")
    ap.add_argument("--out", default="out/captions.srt")
    ap.add_argument("--max-chars", type=int, default=22)
    ap.add_argument("--lead-in", type=float, default=0.55, help="每幕第一句入点延迟，秒")
    ap.add_argument("--gap", type=float, default=0.02, help="相邻字幕最小间隔，秒")
    args = ap.parse_args()

    project = os.path.abspath(args.project)
    timing = json.load(open(os.path.join(project, args.timing), encoding="utf-8"))

    t = 0.0
    cues = []
    for scene in timing["scenes"]:
        chunks = split_chunks(scene["text"], args.max_chars)
        total = sum(len(c) for c in chunks) or 1
        start = t + args.lead_in
        span = scene["audioSeconds"]
        acc = 0
        for c in chunks:
            a = start + acc / total * span
            acc += len(c)
            b = start + acc / total * span
            cues.append([a, min(b + 0.25, t + scene["seconds"] - 0.05), c])
        t += scene["seconds"]

    # 零重叠：不越过下一条入点
    for i in range(len(cues) - 1):
        cues[i][1] = min(cues[i][1], cues[i + 1][0] - args.gap)

    out_path = os.path.join(project, args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        for idx, (a, b, c) in enumerate(cues, start=1):
            f.write("{}\n{} --> {}\n{}\n\n".format(idx, ts(a), ts(b), c))
    print("wrote {}  cues={}  total={:.2f}s".format(out_path, len(cues), t))


if __name__ == "__main__":
    main()
