#!/usr/bin/env python
"""把一段参考视频（对标片、访谈、教程、纪录片）拆成时间码化的多模态笔记。

为什么需要：做一期视频前，如果只凭记忆描述"这个讲法不错"，分镜无法落地。
本脚本用**本地 ffmpeg**（优先 Remotion 自带那份）抽出：
  - 元信息（时长 / 分辨率 / 帧率）
  - 音轨（给 WhisperX 转写用）
  - 关键帧（有完整 ffmpeg 时按场景变化抽，精简版按等间隔抽）
  - 联系表（完整 ffmpeg 出 JPG 拼图；精简版出 HTML，浏览器一看就整片结构）
  - 可选：已有字幕（SRT/VTT）按时间码对齐，并算出节奏指标
再生成 `research/video-notes/<slug>/notes.md` 骨架：画面事实 / 屏幕文字 / 可复用做法三列留给人（或 Agent 看图）填。

不下载视频、不调用任何云端模型、不上传任何东西。
视频获取（yt-dlp / 录屏 / 用户提供）与转写（WhisperX）在外部完成，见 references/video-distill.md。

用法：
    python scripts/video-digest.py ref.mp4 --project ../my-video
    python scripts/video-digest.py ref.mp4 --subs ref.srt --max-frames 24
    python scripts/video-digest.py ref.mp4 --slug dalio-economy --scene 0.35
"""
import argparse
import os
import re
import statistics
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _media import find_ffmpeg, probe_duration  # noqa: E402

VIDEO_RE = re.compile(r"Stream #0:0.*Video: .*?(\d{2,5})x(\d{2,5}).*?([\d.]+) fps")


def mmss(t: float) -> str:
    return "{:02d}:{:04.1f}".format(int(t // 60), t % 60)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, errors="ignore")


def capabilities(ffmpeg: str):
    """Remotion 自带的 ffmpeg 是精简版（只有 50 个 filter，没有 select/tile/showinfo）。"""
    out = run([ffmpeg, "-hide_banner", "-filters"]).stdout
    names = {line.split()[1] for line in out.splitlines() if len(line.split()) > 2 and line.strip()[:1] in ".TSCA"}
    return {
        "scene": "select" in names and "showinfo" in names,
        "tile": "tile" in names,
        "full": "select" in names and "tile" in names,
    }


def probe_meta(ffmpeg: str, path: str):
    err = run([ffmpeg, "-hide_banner", "-i", path]).stderr.replace("\n", " ")
    m = VIDEO_RE.search(err)
    return (int(m.group(1)), int(m.group(2)), float(m.group(3))) if m else (None, None, None)


def extract_audio(ffmpeg: str, src: str, out_wav: str) -> bool:
    run([ffmpeg, "-y", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000", out_wav])
    return os.path.exists(out_wav)


def clear_frames(frames_dir: str) -> None:
    for name in os.listdir(frames_dir):
        if name.endswith(".png"):
            os.remove(os.path.join(frames_dir, name))


def scene_frames(ffmpeg: str, src: str, frames_dir: str, threshold: float, max_frames: int):
    """完整 ffmpeg：按场景变化抽帧，阈值自动抬高直到不超过 max_frames。"""
    pattern = os.path.join(frames_dir, "kf_%04d.png")
    times = []
    for _ in range(5):
        clear_frames(frames_dir)
        proc = run([
            ffmpeg, "-y", "-hide_banner", "-nostats", "-i", src,
            "-vf", f"select='gt(scene,{threshold:.2f})',showinfo",
            "-vsync", "vfr", "-frames:v", str(max_frames), "-q:v", "3", pattern,
        ])
        times = [float(x) for x in re.findall(r"pts_time:([0-9.]+)", proc.stderr)]
        files = sorted(f for f in os.listdir(frames_dir) if f.endswith(".png"))
        if len(files) <= max_frames:
            return list(zip(times, files))
        threshold = min(0.9, threshold + 0.15)
    files = sorted(f for f in os.listdir(frames_dir) if f.endswith(".png"))
    return list(zip(times[: len(files)], files))


def uniform_frames(ffmpeg: str, src: str, frames_dir: str, duration: float, count: int):
    """精简版 ffmpeg 也能跑：逐个时间点 seek 取一帧（scale 可用）。"""
    clear_frames(frames_dir)
    count = max(1, count)
    times = [(duration * (i + 0.5) / count) for i in range(count)]
    for i, t in enumerate(times, 1):
        run([
            ffmpeg, "-y", "-hide_banner", "-v", "error", "-ss", f"{t:.2f}", "-i", src,
            "-frames:v", "1", "-vf", "scale=960:-1", "-q:v", "3",
            os.path.join(frames_dir, f"kf_{i:04d}.png"),
        ])
    files = sorted(f for f in os.listdir(frames_dir) if f.endswith(".png"))
    return list(zip(times[: len(files)], files))


def contact_sheet(ffmpeg: str, src: str, out_path: str, duration: float, cols=4, rows=3) -> str:
    """返回生成的路径；完整 ffmpeg 出 JPG，精简版出 HTML。"""
    step = max(1.0, duration / (cols * rows))
    run([
        ffmpeg, "-y", "-hide_banner", "-nostats", "-i", src,
        "-vf", f"fps=1/{step:.3f},scale=480:-1,tile={cols}x{rows}",
        "-frames:v", "1", "-q:v", "4", out_path,
    ])
    return out_path if os.path.exists(out_path) else ""


def html_sheet(frames, duration: float, out_path: str, title: str) -> str:
    cells = []
    for i, (t, f) in enumerate(frames, 1):
        cells.append(
            f'<figure><img src="frames/{f}" alt="{mmss(t)}">'
            f'<figcaption>{i}. {mmss(t)}</figcaption></figure>'
        )
    html = f"""<!doctype html><meta charset="utf-8">
<title>{title} · 联系表</title>
<style>
body{{background:#111;color:#eee;font:14px/1.5 system-ui,"Microsoft YaHei";margin:24px}}
h1{{font-size:16px;font-weight:600;color:#aaa;margin:0 0 16px}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}}
figure{{margin:0}} img{{width:100%;display:block;border-radius:4px}}
figcaption{{color:#888;font-size:12px;margin-top:4px}}
</style>
<h1>{title} · {mmss(duration)} · {len(frames)} 帧</h1>
<div class="grid">{''.join(cells)}</div>
"""
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(html)
    return out_path


def parse_subs(path: str):
    """解析 SRT / VTT → [(起秒, 止秒, 文本)]。"""
    raw = open(path, encoding="utf-8-sig", errors="ignore").read().replace("\r\n", "\n")
    cues = []
    for block in re.split(r"\n{2,}", raw):
        lines = [l for l in block.strip().split("\n") if l.strip()]
        if not lines:
            continue
        stamp = next((l for l in lines if "-->" in l), None)
        if not stamp:
            continue
        a, b = stamp.split("-->")[:2]
        text = " ".join(l for l in lines if "-->" not in l and not l.strip().isdigit())
        if text.strip():
            cues.append((to_seconds(a), to_seconds(b), text.strip()))
    return cues


def to_seconds(t: str) -> float:
    parts = t.strip().replace(",", ".").split(":")
    try:
        nums = [float(p) for p in parts]
    except ValueError:
        return 0.0
    while len(nums) < 3:
        nums.insert(0, 0.0)
    return nums[0] * 3600 + nums[1] * 60 + nums[2]


def rhythm_stats(cues, duration: float):
    if not cues or duration <= 0:
        return None
    starts = [c[0] for c in cues]
    gaps = [b - a for a, b in zip(starts, starts[1:]) if b - a > 0.05]
    return {
        "cues": len(cues),
        "per_minute": round(len(cues) / (duration / 60), 1),
        "gap_median": round(statistics.median(gaps), 2) if gaps else None,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video", help="参考视频路径（本地文件）")
    ap.add_argument("--project", default=".", help="含 node_modules 的工程目录，用于找 Remotion 自带 ffmpeg")
    ap.add_argument("--ffmpeg", default="", help="显式指定 ffmpeg 路径")
    ap.add_argument("--slug", default="", help="笔记名，默认取视频文件名")
    ap.add_argument("--subs", default="", help="已有字幕（SRT/VTT），按时间码对齐")
    ap.add_argument("--scene", type=float, default=0.30, help="场景变化阈值，默认 0.30（仅完整 ffmpeg 生效）")
    ap.add_argument("--max-frames", type=int, default=36, help="关键帧上限，默认 36")
    ap.add_argument("--out-root", default="research/video-notes")
    args = ap.parse_args()

    project = os.path.abspath(args.project)
    src = os.path.abspath(args.video)
    if not os.path.exists(src):
        raise SystemExit("找不到视频：" + src)

    ffmpeg = args.ffmpeg if args.ffmpeg else find_ffmpeg(project)
    caps = capabilities(ffmpeg)
    duration = probe_duration(ffmpeg, src)
    width, height, fps = probe_meta(ffmpeg, src)

    slug = args.slug or re.sub(r"[^\w\u4e00-\u9fa5-]+", "-", os.path.splitext(os.path.basename(src))[0]).strip("-")
    work = os.path.join(project, args.out_root, slug)
    frames_dir = os.path.join(work, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    print(f"==> 1/6 探测 {mmss(duration)}  {width}x{height}  {fps or '?'}fps  ffmpeg={'完整版' if caps['full'] else '精简版'}")

    wav = os.path.join(work, "audio-16k.wav")
    if extract_audio(ffmpeg, src, wav):
        print("==> 2/6 音轨", os.path.relpath(wav, project))
    else:
        print("==> 2/6 音轨 抽取失败（可能无音轨），跳过")

    if caps["scene"]:
        print(f"==> 3/6 关键帧 场景检测（阈值 {args.scene}）")
        frames = scene_frames(ffmpeg, src, frames_dir, args.scene, args.max_frames)
        strategy = "场景变化"
    else:
        print("==> 3/6 关键帧 等间隔（精简版 ffmpeg 无 select/tile，装完整 ffmpeg 可改场景检测）")
        frames = uniform_frames(ffmpeg, src, frames_dir, duration, args.max_frames)
        strategy = "等间隔"
    print(f"    共 {len(frames)} 帧")

    sheet = ""
    if caps["tile"]:
        sheet = contact_sheet(ffmpeg, src, os.path.join(work, "contact-sheet.jpg"), duration)
    if not sheet:
        sheet = html_sheet(frames, duration, os.path.join(work, "contact-sheet.html"), slug)
    print("==> 4/6 联系表", os.path.relpath(sheet, project))

    cues = parse_subs(args.subs) if args.subs and os.path.exists(args.subs) else []
    stats = rhythm_stats(cues, duration)
    print(f"==> 5/6 字幕 {len(cues)} 条" if cues else "==> 5/6 字幕 未提供（转写见 references/video-distill.md）")

    rel = lambda p: os.path.relpath(p, project).replace("\\", "/")
    md = [
        f"# 参考视频拆解：{os.path.basename(src)}\n",
        "> 由 `scripts/video-digest.py` 生成骨架。**画面事实 / 屏幕文字 / 可复用做法三列必须人（或 Agent 看图）填**，",
        "> 不许凭口播猜画面。填完才能写进 `video-brief.json` 与分镜。\n",
        "## 元信息\n",
        "| 项 | 值 |",
        "|---|---|",
        f"| 源文件 | `{os.path.basename(src)}` |",
        f"| 时长 | {mmss(duration)}（{duration:.1f}s） |",
        f"| 分辨率 / 帧率 | {width}x{height} / {fps or '?'}fps |",
        f"| 抽帧策略 | {strategy}，{len(frames)} 帧 |",
        f"| 联系表 | `{rel(sheet)}` |",
        f"| 音轨 | `{rel(wav)}`（16k 单声道，给 WhisperX） |" if os.path.exists(wav) else "| 音轨 | 无 |",
        f"| 节奏 | {stats['per_minute']} 条字幕/分钟，间隔中位数 {stats['gap_median']}s |" if stats else "| 节奏 | 未提供字幕，无法量化 |",
        "",
        "## 关键帧（按出现顺序）\n",
        "| # | 时间码 | 帧图 | 画面事实（必填） | 屏幕文字（必填） | 可复用做法（可选） |",
        "|---|---|---|---|---|---|",
    ]
    for i, (t, f) in enumerate(frames, 1):
        md.append(f"| {i} | {mmss(t)} | `{rel(os.path.join(frames_dir, f))}` |  |  |  |")
    md.append("")

    if cues:
        md += ["## 字幕（时间码可直接引用）\n", "| 时间码 | 文本 |", "|---|---|"]
        for a, _b, text in cues[:400]:
            md.append(f"| {mmss(a)} | {text.replace('|', '/')} |")
        if len(cues) > 400:
            md.append(f"| … | 共 {len(cues)} 条，其余略 |")
        md.append("")

    md += [
        "## 可提炼为风格参数的三项（做完再动 `styles/*.json`）\n",
        "1. **信息点密度**：每分钟几个新概念/数字？（口播条数只是近似，画面另算）",
        "2. **切幕节奏**：相邻镜头间隔中位数、最长一镜多少秒、有没有超过 8 秒不换画面。",
        "3. **钩子位置**：第几秒抛问题/数字/冲突？前 3 秒与 3–10 秒分别给了什么。\n",
        "## 合规提醒\n",
        "- 只做研究与对标：**画面、音频、字幕不得直接进成片**，除非拿到授权并写进 `research/sources.md`。",
        "- 引用他人观点带时间码（如 `12:30`），比只写「某访谈」可核验。",
        "- 拆的是结构与方法，不是复刻创作者的标识性视觉。\n",
    ]

    out_md = os.path.join(work, "notes.md")
    with open(out_md, "w", encoding="utf-8") as fh:
        fh.write("\n".join(md))

    print("==> 6/6 笔记", rel(out_md))
    print("\n下一步：填三列事实 → 提炼三项节奏参数 → 写进 brief / styles，见 references/video-distill.md")


if __name__ == "__main__":
    main()
