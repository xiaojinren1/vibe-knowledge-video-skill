#!/usr/bin/env python
"""由 narration-timing.json 生成 SRT 字幕。

优先使用 edge-tts 返回的**字级时间边界**（words），做到配音说到哪、字幕就跟到哪；
没有 words 时回退到「按字数均分」的近似算法。

用法：
    python scripts/make-srt.py --project ./my-video
    python scripts/make-srt.py --project ./my-video --max-chars 22 --out out/captions.srt
"""
import argparse
import json
import os
import re

# 对齐时忽略的字符：标点、空白、破折号等不发音的内容
IGNORABLE = re.compile(r"[\s，。！？、；：,.!?;:\"'“”‘’（）()\[\]{}—–…·《》<>/\\|-]")

# 切块只看句读
SENTENCE_END = re.compile(r"(?<=[。！？!?])")
CLAUSE_END = re.compile(r"(?<=[，、；,;：:])")


def clean(text: str) -> str:
    return IGNORABLE.sub("", text)


def split_chunks(text: str, limit: int):
    """按句子切，再按逗号收拢到 limit 字以内。返回原始切块（保留标点以便显示）。"""
    out = []
    for sentence in [s.strip() for s in SENTENCE_END.split(text) if s.strip()]:
        if len(clean(sentence)) <= limit:
            out.append(sentence)
            continue
        buf = ""
        for clause in [c for c in CLAUSE_END.split(sentence) if c]:
            if len(clean(buf + clause)) > limit and buf:
                out.append(buf)
                buf = clause
            else:
                buf += clause
        if buf:
            out.append(buf)
    return out


def char_times(words):
    """把字级边界展开成「每个字符的起止时间」序列，与 clean() 后的文本一一对应。"""
    spans = []
    for w in words:
        text = clean(w.get("text", ""))
        if not text:
            continue
        for _ in text:
            spans.append((w["start"], w["end"]))
    return spans


def cues_from_words(narration: str, chunks, words, lead_in: float, limit_gap: float):
    spans = char_times(words)
    total_chars = len(clean(narration))
    if not spans or total_chars == 0:
        return None
    # 对齐不可靠（朗读时数字被展开、英文被拼读等）就放弃，交给近似算法
    if abs(len(spans) - total_chars) > max(3, int(0.15 * total_chars)):
        return None

    cues = []
    cursor = 0
    for chunk in chunks:
        n = len(clean(chunk))
        if n == 0:
            continue
        start = lead_in + spans[min(cursor, len(spans) - 1)][0]
        cursor += n
        end = lead_in + spans[min(cursor, len(spans)) - 1][1]
        cues.append([start, end, chunk.strip()])
    return cues


def cues_proportional(narration: str, chunks, audio_seconds: float, lead_in: float, scene_seconds: float):
    weights = [max(1, len(clean(c))) for c in chunks]
    total = sum(weights)
    cues, acc, cursor = [], 0, lead_in
    for chunk, w in zip(chunks, weights):
        dur = audio_seconds * w / total
        cues.append([cursor, cursor + dur, chunk.strip()])
        cursor += dur
        acc += w
    return cues


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
    ap.add_argument("--lead-in", type=float, default=0.25, help="每幕第一句入点延迟，秒")
    ap.add_argument("--gap", type=float, default=0.02, help="相邻字幕最小间隔，秒")
    args = ap.parse_args()

    project = os.path.abspath(args.project)
    timing = json.load(open(os.path.join(project, args.timing), encoding="utf-8"))

    cursor = 0.0
    all_cues = []
    word_aligned = 0
    for scene in timing["scenes"]:
        chunks = split_chunks(scene["text"], args.max_chars)
        cues = None
        if scene.get("words"):
            cues = cues_from_words(scene["text"], chunks, scene["words"], args.lead_in, args.gap)
            if cues:
                word_aligned += 1
        if cues is None:
            cues = cues_proportional(scene["text"], chunks, scene["audioSeconds"], args.lead_in, scene["seconds"])
        for c in cues:
            all_cues.append([c[0] + cursor, min(c[1] + cursor, cursor + scene["seconds"] - 0.05), c[2]])
        cursor += scene["seconds"]

    for i in range(len(all_cues) - 1):
        all_cues[i][1] = min(all_cues[i][1], all_cues[i + 1][0] - args.gap)

    out_path = os.path.join(project, args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        for idx, (a, b, text) in enumerate(all_cues, start=1):
            f.write("{}\n{} --> {}\n{}\n\n".format(idx, ts(a), ts(b), text))
    print(
        "wrote {}  cues={}  total={:.2f}s  （字级对齐 {}/{} 幕）".format(
            out_path, len(all_cues), cursor, word_aligned, len(timing["scenes"])
        )
    )


if __name__ == "__main__":
    main()
