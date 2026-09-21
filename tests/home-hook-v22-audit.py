"""V22 approved comic hook framing, fallback and direct-entry audit."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--webkit", action="store_true")
parser.add_argument("--out", type=Path, required=True)
args = parser.parse_args()

engine = "webkit" if args.webkit else "chromium"
target = args.out / engine
target.mkdir(parents=True, exist_ok=True)
errors = []
matrix = []

with sync_playwright() as playwright:
    browser = getattr(playwright, engine).launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on(
        "response",
        lambda response: errors.append(f"{response.status} {response.url}")
        if "127.0.0.1" in response.url and response.status >= 400
        else None,
    )

    page.goto("http://127.0.0.1:5114/", wait_until="networkidle")
    shell = page.locator("[data-tabletop]")
    hook = page.locator("[data-home-hook]")
    expect(shell).to_have_attribute("data-state", "home")
    expect(shell).to_have_attribute("data-ready", "true", timeout=45_000)
    expect(hook).to_be_visible()
    assert page.evaluate("localStorage.getItem('lucky-link.collection.v1')") is None

    for width, height in [(320, 568), (390, 844), (402, 874), (440, 956), (844, 390)]:
        page.set_viewport_size({"width": width, "height": height})
        page.wait_for_timeout(180)
        geometry = page.evaluate(
            """() => {
              const hook = document.querySelector('[data-home-hook]');
              const image = hook.querySelector('img');
              const h = hook.getBoundingClientRect();
              const visible = [...document.querySelectorAll('button')]
                .filter(node => !node.closest('dialog') && !node.closest('[aria-hidden="true"]') && node.checkVisibility({checkOpacity:true}))
                .map(node => { const r = node.getBoundingClientRect(); return {
                  label: node.getAttribute('aria-label') || node.innerText,
                  x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom
                }; });
              return {
                hook:{x:h.x,y:h.y,w:h.width,h:h.height},
                image:{src:image.currentSrc,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,fit:getComputedStyle(image).objectFit},
                overflow:document.documentElement.scrollWidth > innerWidth,
                visible
              };
            }"""
        )
        assert not geometry["overflow"], geometry
        assert abs(geometry["hook"]["x"]) < 0.1 and abs(geometry["hook"]["y"]) < 0.1, geometry
        assert abs(geometry["hook"]["w"] - width) < 0.1 and abs(geometry["hook"]["h"] - height) < 0.1, geometry
        assert geometry["image"]["naturalWidth"] == 941 and geometry["image"]["naturalHeight"] == 1672, geometry
        assert geometry["image"]["src"].endswith("home-hook-comic-v22.webp"), geometry
        assert geometry["image"]["fit"] == ("contain" if width > height else "cover"), geometry
        for control in geometry["visible"]:
            assert control["w"] >= 43.9 and control["h"] >= 43.9, control
            assert control["x"] >= -1 and control["right"] <= width + 1, control
            assert control["y"] >= -1 and control["bottom"] <= height + 1, control
        page.screenshot(path=str(target / f"home-{width}x{height}.png"))
        matrix.append({"viewport": [width, height], **geometry})

    page.set_viewport_size({"width": 390, "height": 844})
    hook.tap()
    game = page.locator('[data-dialog="match"]')
    expect(shell).to_have_attribute("data-state", "compose")
    expect(hook).to_be_hidden()
    expect(game).to_be_visible()
    expect(game).to_have_attribute("data-game-state", "playing")
    expect(page.get_by_role("button", name="Play", exact=True)).to_have_count(0)
    game_frame = game.evaluate(
        """node => { const r=node.getBoundingClientRect(); return {
          x:r.x,y:r.y,width:r.width,height:r.height,
          viewportWidth:innerWidth,viewportHeight:innerHeight,
          radius:getComputedStyle(node).borderRadius
        }; }"""
    )
    assert game_frame["x"] <= 1 and game_frame["y"] <= 1, game_frame
    assert game_frame["width"] >= game_frame["viewportWidth"] - 2, game_frame
    assert game_frame["height"] >= game_frame["viewportHeight"] - 2, game_frame
    assert game_frame["radius"] == "0px", game_frame
    assert page.evaluate("localStorage.getItem('lucky-link.collection.v1')") is None
    page.screenshot(path=str(target / "entered-game.png"))

    page.get_by_role("button", name="Return to DIY", exact=True).tap()
    expect(game).to_be_hidden()
    expect(page.get_by_role("button", name="All beads and categories", exact=True)).to_be_visible()
    assert page.evaluate("localStorage.getItem('lucky-link.collection.v1')") is None
    page.screenshot(path=str(target / "returned-diy.png"))

    page.emulate_media(reduced_motion="reduce")
    page.get_by_role("button", name="Back to home", exact=True).tap()
    expect(shell).to_have_attribute("data-state", "home")
    animation = hook.locator("img").evaluate("node => getComputedStyle(node).animationName")
    assert animation == "none", animation

    assert not errors, errors
    report = {
        "tested_at": datetime.now(timezone.utc).isoformat(),
        "engine": engine,
        "browser": browser.version,
        "checks": [
            "approved 941x1672 art decoded from WebP",
            "five viewport hook framing and 44px controls",
            "full-art tap starts the unlock game without a second Play step",
            "unlock game occupies the full visual viewport without a modal frame",
            "Return to DIY exposes the existing builder without granting a reward",
            "homepage, game entry and return do not create or overwrite collection storage",
            "reduced motion removes ambient hook animation",
            "no page, console or same-origin response errors",
        ],
        "matrix": matrix,
        "errors": errors,
        "physical_iphone": False,
    }
    (target / "audit.json").write_text(json.dumps(report, indent=2) + "\n")
    browser.close()
