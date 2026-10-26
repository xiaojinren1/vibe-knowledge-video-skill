#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <input.mp4> <output.mp4>" >&2
  exit 2
fi

input=$1
output=$2
mkdir -p "$(dirname "$output")"

ffmpeg -y -hide_banner -loglevel error -i "$input" \
  -map 0:v:0 -map 0:a:0? \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
  -profile:v high -level:v 4.2 -tag:v avc1 -movflags +faststart \
  -c:a aac -profile:a aac_low -b:a 160k -ar 48000 -ac 2 \
  "$output"

# Decode the entire file; ffprobe success alone does not catch every damaged MP4.
ffmpeg -v error -i "$output" -f null -
ffprobe -v error \
  -show_entries format=format_name,duration,size:stream=codec_name,profile,pix_fmt,width,height,sample_rate,channels \
  -of json "$output"
sha256sum "$output"
