#!/usr/bin/env bash
# 一键建工程：脚手架 + 模板 + 风格 + 示例资产
#
# 用法：
#   bash scripts/new-project.sh my-topic
#   bash scripts/new-project.sh my-topic --pin 4.0.542      # 复现旧片时锁版本
#   bash scripts/new-project.sh my-topic --example ai-history
#   bash scripts/new-project.sh my-topic --no-install        # 只铺文件，不装依赖
#
# 设计原则：**默认不锁版本**。模板不绑定任何 Remotion 版本；
# 升级是否安全，用 references/upgrading.md 的四点检查判断，而不是靠仓库里的死版本号。
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SLUG=""
PIN=""
EXAMPLE=""
DO_INSTALL=1

while [ $# -gt 0 ]; do
  case "$1" in
    --pin) PIN="${2:-}"; shift 2 ;;
    --example) EXAMPLE="${2:-}"; shift 2 ;;
    --no-install) DO_INSTALL=0; shift ;;
    -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}"; exit 0 ;;
    -*) echo "未知参数: $1" >&2; exit 2 ;;
    *) SLUG="$1"; shift ;;
  esac
done

[ -n "$SLUG" ] || { echo "用法: bash scripts/new-project.sh <slug> [--pin VER] [--example NAME] [--no-install]" >&2; exit 2; }
command -v node >/dev/null 2>&1 || { echo "需要 Node.js（>=20）" >&2; exit 3; }

if [ -e "$SLUG" ] && [ -n "$(find "$SLUG" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
  echo "目录已存在且非空：$SLUG" >&2
  exit 4
fi

echo "==> 1/5 创建 Remotion 脚手架"
npx create-video@latest --yes --blank "$SLUG"
cd "$SLUG"

echo "==> 2/5 铺模板（kit / 幕组件 / Root）"
mkdir -p src
cp -r "$REPO/template/src/kit" src/
cp -r "$REPO/template/src/scenes" src/
cp "$REPO/template/src/Root.tsx" src/Root.tsx

echo "==> 3/5 铺风格 token"
mkdir -p styles
cp "$REPO/assets/styles/"*.json styles/

if [ -n "$EXAMPLE" ]; then
  echo "==> 4/5 套用示例：$EXAMPLE"
  [ -d "$REPO/examples/$EXAMPLE" ] || { echo "没有这个示例：$EXAMPLE" >&2; exit 5; }
  cp "$REPO/examples/$EXAMPLE/video-brief.json" .
  [ -f "$REPO/examples/$EXAMPLE/narration-timing.json" ] && cp "$REPO/examples/$EXAMPLE/narration-timing.json" .
  [ -d "$REPO/examples/$EXAMPLE/src/scenes" ] && cp "$REPO/examples/$EXAMPLE/src/scenes/"*.tsx src/scenes/
  [ -f "$REPO/examples/$EXAMPLE/src/Root.tsx" ] && cp "$REPO/examples/$EXAMPLE/src/Root.tsx" src/Root.tsx
else
  echo "==> 4/5 跳过示例（用 video-brief.json 自己写）"
fi

if [ "$DO_INSTALL" = "1" ]; then
  if [ -n "$PIN" ]; then
    echo "==> 5/5 锁定 Remotion $PIN（复现旧片）"
    npm install --save-exact "remotion@$PIN" "@remotion/cli@$PIN"
  else
    echo "==> 5/5 使用最新 Remotion（版本记进本工程 package.json）"
    node -e "const p=require('./package.json');console.log('    remotion',p.dependencies.remotion,'/ cli',p.dependencies['@remotion/cli'])"
  fi
else
  echo "==> 5/5 跳过安装（--no-install）"
fi

cat <<'TIPS'

下一步：
  1) 写/改 video-brief.json（每条 claim 都要有来源）
  2) python ../scripts/make-narration.py --project . --update-brief
  3) python ../scripts/make-bgm.py --project .
  4) npx remotion still <CompositionId> out/check.png --frame=300 --scale=0.5
  5) npx remotion render <CompositionId> out/v.mp4 --concurrency=6 --crf=19
  6) python ../scripts/make-srt.py --project .
  7) 母带：见 references/production-workflow.md

升级 Remotion 前请先跑 references/upgrading.md 的四点检查。
TIPS
