from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "evidence" / "ice-blue-v33-preview"
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
    page.locator("[data-start]").wait_for(state="visible")
    try:
        page.locator("[data-meshy-star][data-loaded=true]").wait_for(timeout=20_000)
    except Exception:
        pass
    page.screenshot(path=str(OUTPUT / "01-hook-390x844.png"), full_page=True)
    hook = {
        "title": page.title(),
        "horizontalOverflow": page.evaluate("document.documentElement.scrollWidth > innerWidth"),
        "meshyState": page.locator("[data-meshy-star]").get_attribute("data-loaded") or "loading",
        "visibleText": page.locator("body").inner_text(),
    }
    page.locator("[data-start]").click()
    page.wait_for_timeout(1_800)
    page.locator("[data-field]").wait_for(state="visible")
    page.screenshot(path=str(OUTPUT / "02-playing-390x844.png"), full_page=True)
    game = {
        "phase": page.locator(".ice-app").get_attribute("data-phase"),
        "pieceCount": page.locator(".game-piece").count(),
        "score": page.locator("[data-score]").inner_text(),
        "time": page.locator("[data-time]").inner_text(),
        "horizontalOverflow": page.evaluate("document.documentElement.scrollWidth > innerWidth"),
    }
    browser.close()

report = {"viewport": "390x844", "hook": hook, "game": game, "errors": errors, "failedResources": failed_resources}
(OUTPUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))
