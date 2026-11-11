#!/usr/bin/env bash
# 工具箱体检：这台机器现在能走哪条渲染路线（对照 references/toolbox.md）
#
# 用法：
#   bash scripts/toolcheck.sh                 # 只看全局能力
#   bash scripts/toolcheck.sh ../my-video     # 顺带检查工程里 Remotion 自带的 ffmpeg
#
# 只报告，不改环境，永远以 0 退出（除非参数错误）。
set -uo pipefail

PROJECT="${1:-}"
ok()   { printf '  \033[32m✓\033[0m %-22s %s\n' "$1" "$2"; }
miss() { printf '  \033[31m✗\033[0m %-22s %s\n' "$1" "$2"; }
warn() { printf '  \033[33m!\033[0m %-22s %s\n' "$1" "$2"; }

have() { command -v "$1" >/dev/null 2>&1; }

py_has() { python -c "import importlib.util as u,sys; sys.exit(0 if u.find_spec('$1') else 1)" >/dev/null 2>&1; }

echo "== 核心层（这条管线必需）=="
have node  && ok  "Node.js" "$(node -v)"            || miss "Node.js" "装 Node >=20"
have npx   && ok  "npx"     "可用"                   || miss "npx" "随 npm 安装"
have python && ok "Python"  "$(python -V 2>&1)"      || miss "Python" "旁白/配乐/字幕脚本需要"
py_has edge_tts && ok "edge-tts" "已装（免费旁白）"   || warn "edge-tts" "pip install edge-tts"
py_has numpy    && ok "numpy"    "已装（合成 BGM）"   || warn "numpy" "pip install numpy"

if have ffmpeg; then
  ok "ffmpeg(系统)" "$(command -v ffmpeg)"
else
  BUNDLED=""
  if [ -n "$PROJECT" ]; then
    BUNDLED="$(ls "$PROJECT"/node_modules/@remotion/compositor-*/ffmpeg.exe 2>/dev/null | head -1)"
    [ -n "$BUNDLED" ] || BUNDLED="$(ls "$PROJECT"/node_modules/@remotion/compositor-*/ffmpeg 2>/dev/null | head -1)"
  fi
  if [ -n "$BUNDLED" ]; then
    ok "ffmpeg(Remotion)" "$BUNDLED"
  else
    warn "ffmpeg" "无系统 ffmpeg；工程 npm install 后可用 Remotion 自带那份"
  fi
fi

echo
echo "== 按需路线（见 references/toolbox.md 第三节）=="
py_has librosa   && ok "librosa"   "外部音乐踩点可用"     || miss "librosa"   "需要时才装：pip install librosa"
have yt-dlp      && ok "yt-dlp"    "可下载参考视频（只限有权保存的）" || miss "yt-dlp"    "需拆网络视频时才装：pip install yt-dlp"
py_has whisperx  && ok "WhisperX"  "外部音频字级对齐可用" || miss "WhisperX"  "需要时才装：pip install whisperx"
have manim       && ok "Manim"     "公式/几何片段可用"    || miss "Manim"     "需要时才装：pip install manim（另需 LaTeX）"
have blender     && ok "Blender"   "3D 资产序列帧可用"    || miss "Blender"   "需要时才装（本机无独显，走 Cycles CPU）"
if have losslesscut || ls "/c/Program Files/LosslessCut" >/dev/null 2>&1; then
  ok "LosslessCut" "图形化粗剪可用"
else
  warn "LosslessCut" "可选；命令行 ffmpeg -ss/-t -c copy 等价，不必装"
fi

if have obs64 || have obs || ls "/c/Program Files/obs-studio/bin/64bit/obs64.exe" >/dev/null 2>&1; then
  ok "OBS Studio" "屏幕实录可用"
else
  miss "OBS Studio" "只在需要真实软件界面实录时安装"
fi

echo
echo "== 显卡相关（ComfyUI / CosyVoice 路线）=="
if have nvidia-smi; then
  ok "NVIDIA GPU" "$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null | head -1)"
else
  miss "NVIDIA GPU" "无独显 → ComfyUI / CosyVoice 本机不接，走代码几何 + edge-tts"
fi

echo
echo "== 结论 =="
echo "  默认路线（不需要上面任何按需项）：Remotion + 模板 kit + edge-tts + make-bgm/make-sfx + Remotion 自带 ffmpeg"
[ -n "$PROJECT" ] || echo "  提示：带上工程目录再看一次，可确认 Remotion 自带 ffmpeg 是否就位：bash scripts/toolcheck.sh <工程>"
exit 0
