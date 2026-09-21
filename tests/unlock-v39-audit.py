from __future__ import annotations

import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "evidence" / "ice-blue-v40-no-copy-audio"
OUTPUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
warnings: list[str] = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    context.add_init_script(
        """
        localStorage.clear();
        localStorage.setItem('lucky-link.collection.v1', JSON.stringify({
          version: 2, ids: [], box: [], unlocked: [], note: '', lastRewardDay: '',
          mainline: {version: 1, unlocked: [
            'ice-module-star-drop','ice-module-tulip-drop','ice-module-cloud',
            'ice-module-crescent','ice-module-checker'
          ], coupons: [], clears: 5}
        }));
        """
    )
    page = context.new_page()
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else warnings.append(message.text) if message.type == "warning" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:5114/", wait_until="networkidle")
    page.locator("[data-home-hook]").click(no_wait_after=True)
    dialog = page.locator("[data-dialog=match]")
    field = page.locator("[data-gravity-field]")
    page.locator("[data-dialog=match][data-game-state=playing]").wait_for(state="visible")
    slots: dict[str, float] = {}
    lanes = [42, 101, 160, 219, 278]
    deadline = time.monotonic() + 58
    while dialog.get_attribute("data-game-state") == "playing" and time.monotonic() < deadline:
        material = page.locator("[data-gravity-next] img").first.get_attribute("data-material")
        if not material:
            page.wait_for_timeout(40)
            continue
        slots.setdefault(material, lanes[min(len(slots), len(lanes) - 1)])
        box = field.bounding_box()
        assert box
        field.click(position={"x": box["width"] * slots[material] / 320, "y": max(18, box["height"] * .08)}, force=True)
        page.wait_for_timeout(385)
    if dialog.get_attribute("data-game-state") == "resolving":
        page.wait_for_timeout(950)
    page.locator("[data-reward-3d][data-loaded=true]").wait_for(state="visible", timeout=10_000)
    page.locator("[data-reward-3d][data-motion=inspect]").wait_for(timeout=10_000)
    page.wait_for_timeout(900)
    visible_words = page.locator("[data-match-end] h3,[data-match-end] p,[data-match-end] small,[data-match-end] em").evaluate_all(
        "nodes => nodes.filter(node => node.getClientRects().length && /[A-Za-z\\u3400-\\u9fff]/.test(node.innerText)).map(node => node.innerText.trim())"
    )
    screenshot = OUTPUT / "penguin-unlock-390x844.png"
    page.screenshot(path=str(screenshot), full_page=True)
    report = {
        "viewport": "390x844",
        "state": dialog.get_attribute("data-game-state"),
        "reward": page.locator("[data-end-name]").inner_text(),
        "motion": page.locator("[data-reward-3d]").get_attribute("data-motion-history"),
        "soundHistory": page.locator("[data-tabletop]").get_attribute("data-sound-history"),
        "soundEngine": page.locator("[data-tabletop]").get_attribute("data-sound-engine"),
        "visibleWords": visible_words,
        "errors": errors,
        "warnings": warnings,
    }
    (OUTPUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    browser.close()

print(json.dumps(report, ensure_ascii=False))
