"""Capture real first-round gameplay and reveal from a fresh isolated browser."""
import base64
import argparse
import json
import re
import subprocess
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

APP = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--out", type=Path, default=APP / "evidence" / "ice-blue-v41-audio" / "actual-flow")
parser.add_argument("--url", default="http://127.0.0.1:5114/")
parser.add_argument("--seed", type=int, default=2147483646)
args = parser.parse_args()
OUT = args.out
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as pw:
    try:
        browser = pw.chromium.launch(headless=True)
    except Exception as error:
        (OUT / "report.json").write_text(json.dumps({"state": "blocked", "stage": "browser-launch", "error": str(error), "physicalDevice": False}, indent=2) + "\n")
        raise
    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    context.add_init_script(f"let seed={args.seed};Math.random=()=>((seed=seed*48271%2147483647)-1)/2147483646;")
    hook = (Path(__file__).with_name("record-audio-hook.js")).read_text().replace("[data-lab-shell]", "[data-tabletop]")
    context.add_init_script(hook)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(args.url, wait_until="networkidle")
    page.locator("[data-home-hook]").click()
    page.locator("[data-dialog=match][data-game-state=playing]").wait_for(timeout=10000)
    page.wait_for_function("document.querySelector('[data-tabletop]').dataset.audioAssets==='ready'")
    page.evaluate("recordingAudit.start()")
    game = page.locator("[data-dialog=match]")
    field = page.locator("[data-gravity-field]")
    slots, drops = {}, 0
    deadline = time.monotonic() + 58
    while game.get_attribute("data-game-state") == "playing" and time.monotonic() < deadline:
        material = page.locator("[data-gravity-next] img").first.get_attribute("data-material")
        if material not in slots:
            slots[material] = [42, 101, 160, 219, 278][min(len(slots), 4)]
        box = field.bounding_box()
        field.click(position={"x": box["width"] * slots[material] / 320, "y": max(18, box["height"] * .08)}, force=True)
        drops += 1
        page.wait_for_timeout(385)
    print(json.dumps({"drops": drops, "stateAfterPlay": game.get_attribute("data-game-state"), "gameAttributes": game.evaluate("node=>Object.fromEntries([...node.attributes].map(a=>[a.name,a.value]))")}), flush=True)
    if game.get_attribute("data-game-state") == "resolving":
        page.wait_for_function("['won','lost'].includes(document.querySelector('[data-dialog=match]').dataset.gameState)", timeout=6000)
    page.wait_for_timeout(5800 if game.get_attribute("data-game-state") == "won" else 500)
    recording = page.evaluate("recordingAudit.stop()")
    webm, mp3 = OUT / "game-and-unlock.webm", OUT / "game-and-unlock.mp3"
    webm.write_bytes(base64.b64decode(recording.pop("base64")))
    subprocess.run(["rtk", "proxy", "ffmpeg", "-v", "error", "-y", "-i", str(webm), "-c:a", "libmp3lame", "-b:a", "192k", str(mp3)], check=True)
    result = subprocess.run(["rtk", "proxy", "ffmpeg", "-hide_banner", "-i", str(mp3), "-filter:a", "volumedetect", "-f", "null", "/dev/null"], capture_output=True, text=True)
    levels = {key: float(value) for key, value in re.findall(r"(mean_volume|max_volume):\s*(-?[\d.]+) dB", result.stderr)}
    events = [entry.get("event") for entry in recording["events"]]
    segments = {}
    for event, duration in [("impact", .2), ("unlock-theme", 3.5)]:
        moment = next((entry for entry in recording["events"] if entry.get("event") == event), None)
        if not moment:
            continue
        start = max(0, moment["epoch"] - recording["started"])
        segment = OUT / f"{event}-actual.mp3"
        subprocess.run(["rtk", "proxy", "ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", str(duration), "-i", str(webm), "-c:a", "libmp3lame", "-b:a", "192k", str(segment)], check=True)
        measured = subprocess.run(["rtk", "proxy", "ffmpeg", "-hide_banner", "-i", str(segment), "-filter:a", "volumedetect", "-f", "null", "/dev/null"], capture_output=True, text=True)
        segments[event] = {"file": segment.name, "startSeconds": start, "levelsDb": {key: float(value) for key, value in re.findall(r"(mean_volume|max_volume):\s*(-?[\d.]+) dB", measured.stderr)}}
    report = {"state": game.get_attribute("data-game-state"), "seed": args.seed, "url": args.url, "drops": drops, "recording": recording, "levelsDb": levels, "segments": segments, "errors": errors, "physicalDevice": False}
    (OUT / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    browser.close()
    assert report["state"] == "won", report["state"]
    assert "impact" in events and "unlock-theme" in events and "coupon-reveal" in events, events
    assert levels["max_volume"] < 0 and levels["mean_volume"] > -45, levels
    assert all(segment["levelsDb"]["mean_volume"] > -60 for segment in segments.values()), segments
    assert not errors, errors
    print(json.dumps({"state": report["state"], "drops": drops, "levelsDb": levels, "errors": errors}))
