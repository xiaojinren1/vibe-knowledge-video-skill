#!/usr/bin/env python
"""从 video-brief.json 生成旁白音频与时间轴（免费 edge-tts，无需 API Key）。

用法：
    python scripts/make-narration.py --project ./my-video --voice zh-CN-YunxiNeural
    python scripts/make-narration.py --project ./my-video --update-brief

读取  <project>/video-brief.json  的 scenes[].id / scenes[].narration
输出  <project>/public/audio/narr-<id>.mp3
      <project>/narration-timing.json   （每幕真实时长，供 Remotion 排片）
可选  --update-brief  把真实时长回写进 brief（保持 startSeconds 连续，durationSeconds 求和），
                      写完立刻用 scripts/validate-brief.mjs 复验。

设计原则：旁白决定镜头长度，而不是先定时长再硬塞旁白。
"""
import argparse
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _media import find_ffmpeg, probe_duration  # noqa: E402


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default=".", help="Remotion 工程目录（含 video-brief.json）")
    ap.add_argument("--brief", default="video-brief.json")
    ap.add_argument("--voice", default="zh-CN-YunxiNeural")
    ap.add_argument("--rate", default="-4%")
    ap.add_argument("--pitch", default="-2Hz")
    ap.add_argument("--tail", type=float, default=0.55, help="每幕后留白，秒")
    ap.add_argument("--update-brief", action="store_true", help="把真实时长回写进 brief")
    args = ap.parse_args()

    import edge_tts

    project = os.path.abspath(args.project)
    brief_path = os.path.join(project, args.brief)
    brief = json.load(open(brief_path, encoding="utf-8"))
    out_dir = os.path.join(project, "public", "audio")
    os.makedirs(out_dir, exist_ok=True)
    ffmpeg = find_ffmpeg(project)

    timing = {"scenes": [], "total": 0.0, "voice": args.voice}

    for scene in brief["scenes"]:
        sid = scene["id"]
        text = scene.get("narration") or scene.get("narrationText") or ""
        if not text.strip():
            raise SystemExit(f"scene {sid} 缺少 narration")
        audio_path = os.path.join(out_dir, f"narr-{sid}.mp3")
        comm = edge_tts.Communicate(text, args.voice, rate=args.rate, pitch=args.pitch)
        await comm.save(audio_path)
        audio_seconds = probe_duration(ffmpeg, audio_path)
        hold = float(scene.get("holdSeconds", args.tail))
        seconds = round(audio_seconds + hold, 2)
        timing["scenes"].append(
            {
                "id": sid,
                "title": scene.get("title") or scene.get("onScreenText") or sid,
                "text": text,
                "audioSeconds": round(audio_seconds, 2),
                "seconds": seconds,
            }
        )
        print(f"{sid:<24} 旁白 {audio_seconds:6.2f}s  镜头 {seconds:6.2f}s")

    timing["total"] = round(sum(s["seconds"] for s in timing["scenes"]), 2)
    with open(os.path.join(project, "narration-timing.json"), "w", encoding="utf-8") as f:
        json.dump(timing, f, ensure_ascii=False, indent=2)
    print(f"总计 {timing['total']}s -> narration-timing.json")

    if args.update_brief:
        cursor = 0.0
        for scene, t in zip(brief["scenes"], timing["scenes"]):
            scene["startSeconds"] = round(cursor, 2)
            scene["durationSeconds"] = t["seconds"]
            cursor += t["seconds"]
        brief["durationSeconds"] = round(cursor, 2)
        with open(brief_path, "w", encoding="utf-8") as f:
            json.dump(brief, f, ensure_ascii=False, indent=2)
        print(f"已回写 brief，总时长 {brief['durationSeconds']}s；建议执行：node scripts/validate-brief.mjs {args.brief}")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
