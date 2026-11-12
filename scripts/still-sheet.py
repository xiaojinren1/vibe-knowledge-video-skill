#!/usr/bin/env python
"""把审片静帧拼成一张 HTML 联系表：一眼看完首帧/中段/转场/结尾。

为什么需要：现在审片是一张张点开看，容易漏掉中间某一幕的字压画面。
一张联系表能看到整片节奏，也能顺手对比同一幕不同帧的稳定性。
不依赖 PIL：HTML 直接引用图片，浏览器打开即可；也不吃 ffmpeg 的 tile 过滤器。

用法：
    python scripts/still-sheet.py out/review-frames
    python scripts/still-sheet.py out/review-frames --fps 30 --title "AI 十四年 · 审片"
    python scripts/still-sheet.py out/a.png out/b.png --out out/sheet.html
"""
import argparse
import glob
import os
import re

IMG_EXT = (".png", ".jpg", ".jpeg", ".webp")


def collect(paths):
    files = []
    for p in paths:
        if os.path.isdir(p):
            for ext in IMG_EXT:
                files += glob.glob(os.path.join(p, f"*{ext}"))
                files += glob.glob(os.path.join(p, f"*{ext.upper()}"))
        elif os.path.exists(p):
            files.append(p)
    # 去重保序
    seen, out = set(), []
    for f in files:
        r = os.path.abspath(f)
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out


def show(path, base=None):
    """跨盘符时 relpath 会报错，退回绝对路径。"""
    try:
        return os.path.relpath(path, base)
    except ValueError:
        return os.path.abspath(path)


def frame_of(path):
    """从文件名里取帧号（review-frames-450.png → 450）；取不到返回 None。"""
    m = re.search(r"(\d+)(?=\.[A-Za-z]+$)", os.path.basename(path))
    return int(m.group(1)) if m else None


def mmss(t):
    return "{:02d}:{:05.2f}".format(int(t // 60), t % 60)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="+", help="静帧目录或图片文件")
    ap.add_argument("--out", default="", help="输出 HTML，默认与第一张图同级的 review-sheet.html")
    ap.add_argument("--fps", type=float, default=30, help="帧率，用于把帧号换成时间码")
    ap.add_argument("--title", default="审片联系表")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--rel", default="", help="HTML 里图片的相对根目录，默认相对 HTML 所在目录")
    args = ap.parse_args()

    files = collect(args.inputs)
    if not files:
        raise SystemExit("没有找到图片：" + " ".join(args.inputs))

    numbered = [(frame_of(f), f) for f in files]
    if all(n is not None for n, _ in numbered):
        numbered.sort(key=lambda x: x[0])
    else:
        numbered.sort(key=lambda x: os.path.basename(x[1]))

    out = os.path.abspath(args.out) if args.out else os.path.join(os.path.dirname(files[0]), "review-sheet.html")
    base = os.path.abspath(args.rel) if args.rel else os.path.dirname(out)

    cells = []
    for i, (n, f) in enumerate(numbered, 1):
        src = os.path.relpath(f, base).replace("\\", "/")
        label = f"{i}. {mmss(n / args.fps)}" if n is not None else f"{i}. {os.path.basename(f)}"
        cells.append(f'<figure><img src="{src}" loading="lazy" alt="{label}"><figcaption>{label}</figcaption></figure>')

    html = f"""<!doctype html><meta charset="utf-8">
<title>{args.title}</title>
<style>
body{{background:#111;color:#eee;font:14px/1.5 system-ui,"Microsoft YaHei";margin:24px}}
h1{{font-size:16px;font-weight:600;color:#aaa;margin:0 0 4px}}
p{{color:#777;font-size:12px;margin:0 0 18px}}
.grid{{display:grid;grid-template-columns:repeat({args.cols},1fr);gap:12px}}
figure{{margin:0}} img{{width:100%;display:block;border-radius:4px;background:#000}}
figcaption{{color:#888;font-size:12px;margin-top:4px}}
</style>
<h1>{args.title}</h1>
<p>{len(numbered)} 帧 · 点开大图看细节 · 审：文字溢出 / 压主体 / 字幕基线 / 贴地贴边 / 风格底线</p>
<div class="grid">{''.join(cells)}</div>
"""
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"联系表：{show(out)}  （{len(numbered)} 帧，{args.cols} 列）")


if __name__ == "__main__":
    main()
