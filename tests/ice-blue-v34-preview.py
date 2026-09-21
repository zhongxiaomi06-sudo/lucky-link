from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "evidence" / "ice-blue-v34-preview"
OUTPUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
failed_resources: list[str] = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    page.on("console", lambda message: errors.append(f"console:{message.type}:{message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))
    page.on("requestfailed", lambda request: failed_resources.append(f"{request.url}: {request.failure}"))
    page.goto("http://127.0.0.1:5114/", wait_until="networkidle")
    page.locator("[data-home-hook]").wait_for(state="visible")
    page.screenshot(path=str(OUTPUT / "01-existing-hook-390x844.png"), full_page=True)
    hook = {
        "title": page.title(),
        "entry": page.locator("html").get_attribute("data-entry"),
        "horizontalOverflow": page.evaluate("document.documentElement.scrollWidth > innerWidth"),
    }
    page.locator("[data-home-hook]").click()
    page.locator("[data-dialog=match][data-game-state=playing]").wait_for(state="visible")
    page.wait_for_timeout(1200)
    page.screenshot(path=str(OUTPUT / "02-existing-tray-new-rules-390x844.png"), full_page=True)
    game = {
        "state": page.locator("[data-dialog=match]").get_attribute("data-game-state"),
        "level": page.locator("[data-dialog=match]").get_attribute("data-level"),
        "pieceCount": page.locator("[data-gravity-field]").get_attribute("data-piece-count"),
        "seededCount": page.locator("[data-gravity-field]").get_attribute("data-seeded-count"),
        "target": page.locator("[data-gravity-target]").inner_text(),
        "time": page.locator("[data-gravity-time]").inner_text(),
        "horizontalOverflow": page.evaluate("document.documentElement.scrollWidth > innerWidth"),
    }
    browser.close()

report = {"viewport": "390x844", "hook": hook, "game": game, "errors": errors, "failedResources": failed_resources}
(OUTPUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))
