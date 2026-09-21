"""Mobile touch + visual evidence for the 360-degree studio. Requires the local Vite server."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

evidence = Path(__file__).resolve().parents[1] / "evidence" / "360-studio"
evidence.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-angle=metal', '--enable-gpu'])
    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto("http://127.0.0.1:5114/3d-lab.html", wait_until="networkidle", timeout=60000)
    shell = page.locator("[data-lab-shell]")
    assert shell.get_attribute("data-world") == "360"
    page.screenshot(path=str(evidence / "01-lakeside-empty.png"))
    for name in ["Lucky moon", "Rose prism", "Blue eye", "Amber cube", "Daisy", "Jade ring", "Lilac heart", "Cherries"]:
        page.get_by_role("button", name=f"Add {name}", exact=True).click()
    page.wait_for_timeout(1500)
    assert page.locator("[data-count]").inner_text() == "8"
    page.screenshot(path=str(evidence / "02-lakeside-chain.png"))

    # Native touch dispatch exercises two fingers, not a DOM event stand-in.
    cdp = context.new_cdp_session(page)
    radius_before = float(shell.get_attribute("data-camera-radius"))
    def touch(kind, x1=120, x2=260):
        cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [] if kind == "touchEnd" else [
            {"x": x1, "y": 380, "id": 1}, {"x": x2, "y": 380, "id": 2}
        ]})
    touch("touchStart")
    for step in range(1, 7): touch("touchMove", 120-step*5, 260+step*5)
    touch("touchEnd")
    page.wait_for_timeout(350)
    radius_after = float(shell.get_attribute("data-camera-radius"))
    assert radius_after < radius_before * .92, (radius_before, radius_after)
    assert page.locator("[data-count]").inner_text() == "8"
    page.get_by_role("button", name="Reset camera").click()
    page.wait_for_timeout(1000)

    for index in range(8):
        page.mouse.move(50, 355); page.mouse.down()
        page.mouse.move(340, 355, steps=10); page.mouse.up()
        page.wait_for_timeout(180)
        if index in [1, 3, 5]:
            page.screenshot(path=str(evidence / f"03-orbit-{index}.png"))
    travel = float(shell.get_attribute("data-camera-travel"))
    assert travel > 360, travel
    assert page.locator("[data-count]").inner_text() == "8"
    page.get_by_role("button", name="Reset camera").click()
    page.wait_for_timeout(1000)
    page.get_by_role("button", name="Try it on", exact=True).click()
    page.wait_for_timeout(900)
    page.screenshot(path=str(evidence / "04-finished.png"))
    page.get_by_role("button", name="Follow chain", exact=True).click()
    assert shell.get_attribute("data-camera-mode") == "tour"
    page.wait_for_timeout(8000)
    page.screenshot(path=str(evidence / "05-follow-chain.png"))
    page.mouse.move(65, 355); page.mouse.down(); page.mouse.move(290, 355, steps=8); page.mouse.up()
    assert shell.get_attribute("data-camera-mode") == "orbit"
    page.get_by_role("button", name="Edit", exact=True).click()
    page.get_by_role("button", name="Undo", exact=True).click()
    assert page.locator("[data-count]").inner_text() == "7"
    page.get_by_role("button", name="Clear", exact=True).click()
    assert page.locator("[data-count]").inner_text() == "0"
    page.set_viewport_size({"width":320,"height":568})
    for name in ["Lucky moon", "Rose prism", "Blue eye"]:
        page.get_by_role("button", name=f"Add {name}", exact=True).click()
    page.wait_for_timeout(1500)
    page.screenshot(path=str(evidence / "06-narrow-phone.png"))
    assert page.evaluate("document.documentElement.scrollWidth") == 320
    assert not errors, errors
    gpu = page.locator('[data-canvas]').evaluate("c => {const g=c.getContext('webgl2');const e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable'}")
    print(json.dumps({"result":"pass", "pinch_radius":[radius_before,radius_after], "orbit_degrees":travel, "gpu":gpu, "errors":errors, "evidence":str(evidence)}), flush=True)
    context.close(); browser.close()
