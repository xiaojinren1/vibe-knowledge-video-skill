"""ffmpeg 定位与时长探测。

Remotion 自带一份 ffmpeg（node_modules/@remotion/compositor-*/ffmpeg.exe），
优先用它，避免要求用户单独安装系统 ffmpeg。
"""
import glob
import os
import re
import subprocess
from shutil import which


def find_ffmpeg(project_dir: str) -> str:
    env = os.environ.get("FFMPEG")
    if env and os.path.exists(env):
        return env
    for pattern in (
        os.path.join(project_dir, "node_modules", "@remotion", "compositor-*", "ffmpeg.exe"),
        os.path.join(project_dir, "node_modules", "@remotion", "compositor-*", "ffmpeg"),
    ):
        hits = glob.glob(pattern)
        if hits:
            return hits[0]
    if which("ffmpeg"):
        return "ffmpeg"
    raise SystemExit(
        "找不到 ffmpeg：工程里没有 node_modules/@remotion/compositor-*/ffmpeg，PATH 上也没有。"
        "先在工程目录执行 npm install（Remotion 会自带 ffmpeg），或用 FFMPEG 环境变量指定路径。"
    )


def probe_duration(ffmpeg: str, path: str) -> float:
    proc = subprocess.run([ffmpeg, "-hide_banner", "-i", path], capture_output=True, text=True, errors="ignore")
    match = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", proc.stderr)
    if not match:
        raise RuntimeError("无法读取时长: " + path)
    h, m, s = match.groups()
    return int(h) * 3600 + int(m) * 60 + float(s)
