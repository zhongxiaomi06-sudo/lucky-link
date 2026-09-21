from __future__ import annotations

import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "evidence" / "ice-blue-v34-flow"
OUTPUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
failed_resources: list[str] = []


def play_round(page, round_number: int) -> dict:
    dialog = page.locator("[data-dialog=match]")
    field = page.locator("[data-gravity-field]")
    page.locator("[data-dialog=match][data-game-state=playing]").wait_for(state="visible")
    target = int(page.locator("[data-gravity-target]").inner_text())
    observed: set[str] = set()
    slots: dict[str, float] = {}
    world_x = [42, 101, 160, 219, 278]
    deadline = time.monotonic() + 57
    drops = 0
    while dialog.get_attribute("data-game-state") == "playing" and time.monotonic() < deadline:
        next_piece = page.locator("[data-gravity-next] img").first
        material = next_piece.get_attribute("data-material")
        if not material:
            page.wait_for_timeout(50)
            continue
        observed.add(material)
        if material not in slots:
            slots[material] = world_x[min(len(slots), len(world_x) - 1)]
        box = field.bounding_box()
        assert box
        x = box["width"] * slots[material] / 320
        field.click(position={"x": x, "y": max(18, box["height"] * 0.08)}, force=True)
        drops += 1
        page.wait_for_timeout(385)
    state = dialog.get_attribute("data-game-state")
    if state == "resolving":
        page.wait_for_timeout(900)
        state = dialog.get_attribute("data-game-state")
    if state == "won":
        page.locator("[data-reward-3d][data-loaded=true]").wait_for(state="visible", timeout=10_000)
        page.locator("[data-reward-3d][data-motion=inspect]").wait_for(timeout=10_000)
        page.wait_for_timeout(1100)
    page.screenshot(path=str(OUTPUT / f"0{round_number}-result-390x844.png"), full_page=True)
    return {
        "target": target,
        "state": state,
        "drops": drops,
        "observedMaterials": sorted(observed),
        "coupon": page.locator("[data-coupon-value]").inner_text() if state == "won" else "",
        "reward": page.locator("[data-end-name]").inner_text() if state == "won" else "",
        "reward3d": page.locator("[data-reward-3d]").get_attribute("data-loaded") if state == "won" else "",
        "motionHistory": page.locator("[data-reward-3d]").get_attribute("data-motion-history") if state == "won" else "",
        "rewardActions": page.locator(".match-end-actions button:visible").count() if state == "won" else 0,
        "lastSound": page.locator("[data-tabletop]").get_attribute("data-last-sound") if state == "won" else "",
        "soundHistory": page.locator("[data-tabletop]").get_attribute("data-sound-history") if state == "won" else "",
    }


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    page = context.new_page()
    page.on("console", lambda message: errors.append(f"console:{message.type}:{message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))
    page.on("requestfailed", lambda request: failed_resources.append(f"{request.url}: {request.failure}"))
    page.goto("http://127.0.0.1:5114/", wait_until="domcontentloaded")
    page.locator("[data-home-hook]").wait_for(state="visible")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="domcontentloaded")
    page.locator("[data-home-hook]").wait_for(state="visible")
    page.locator("[data-dialog=match]").wait_for(state="attached")
    page.locator("[data-home-hook]").click(no_wait_after=True)
    first = play_round(page, 1)
    saved_after_first = page.evaluate("JSON.parse(localStorage.getItem('lucky-link.collection.v1'))")
    if first["state"] == "won":
        page.locator("[data-match-again]").click()
        second = play_round(page, 2)
    else:
        second = {"state": "not-run"}
    saved_after_second = page.evaluate("JSON.parse(localStorage.getItem('lucky-link.collection.v1'))")
    page.reload(wait_until="domcontentloaded")
    page.locator("[data-home-hook]").wait_for(state="visible")
    page.wait_for_timeout(1200)
    persisted = page.evaluate("JSON.parse(localStorage.getItem('lucky-link.collection.v1'))")
    browser.close()

report = {
    "viewport": "390x844",
    "first": first,
    "second": second,
    "savedAfterFirst": saved_after_first.get("mainline") if saved_after_first else None,
    "savedAfterSecond": saved_after_second.get("mainline") if saved_after_second else None,
    "persistedAfterReload": persisted.get("mainline") if persisted else None,
    "errors": errors,
    "failedResources": failed_resources,
}
(OUTPUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))
