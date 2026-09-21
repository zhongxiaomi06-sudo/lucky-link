"""Isolated V44 real-WebGL material gallery; not gameplay or aesthetic approval.

Uses production CSS, full-screen reward canvas and its separate framing element.
No audio engine, owner browser, collection storage or forced gameplay result.
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

APP = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base-url", default="http://127.0.0.1:5114")
args = parser.parse_args()
OUT = APP / "evidence" / "reveal-studio-v44-gallery"
OUT.mkdir(parents=True, exist_ok=True)
MODELS = [
    ("star", "ice-module-star-drop"),
    ("penguin", "ice-module-penguin"),
    ("pearl-heart-bow", "ice-module-heart-bow"),
    ("rocket", "ice-module-rocket"),
]
HTML = """<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/src/tabletop.css"><link rel="stylesheet" href="/src/collection.css">
<style>*{box-sizing:border-box}body{margin:0}</style>
<div class="tt-app"><dialog class="studio-dialog match-dialog gravity-dialog is-reveal" data-game-state="won" data-actions-ready="true">
<header><span></span><button type="button" aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
<section data-match-end class="match-reveal">
<canvas class="reward-world" data-reward-3d aria-label="Drag to rotate the 3D charm"></canvas>
<div class="unlock-world" aria-hidden="true"><i class="unlock-depth"></i><i class="unlock-beam"></i><i class="unlock-ring"></i><i class="unlock-flare"></i></div>
<div class="reveal-stage"><div class="reveal-aura"></div><div class="reveal-sparks"></div>
<div class="prize-image reveal-prize"><div data-reward-frame><img data-end-image alt="" hidden></div></div><small class="drag-hint"></small></div>
<div class="unlock-title"><p data-end-label></p><h3 data-end-name></h3></div>
<div class="coupon-ticket" data-coupon-ticket><small></small><strong data-coupon-value>¥5</strong><em></em></div>
<p data-end-copy role="status"></p><div class="match-end-actions">
<button type="button" class="icon-cta" aria-label="Play again"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21"/><path d="M33 20a10 10 0 1 0 0 8m0-13v7h-7"/></svg></button>
<button type="button" class="icon-cta" aria-label="View item"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21"/><path d="M14 18h20l-2 17H16Zm5 0a5 5 0 0 1 10 0"/></svg></button>
</div></section></dialog></div>"""

report = {"startedAt": datetime.now(timezone.utc).isoformat(), "status": "running", "engine": "chromium",
          "viewport": {"width": 390, "height": 844}, "deviceScaleFactor": 1, "reducedMotion": True,
          "isolatedFixture": True, "actualGameplay": False, "viewerStubbed": False, "realWebGL": True,
          "physicalDevice": False, "ownerStorageTouched": False, "audioTested": False, "aestheticApproval": False,
          "pageErrors": [], "consoleErrors": [], "resourceErrors": [], "models": [],
          "sourceHashes": {str(path.relative_to(APP)): hashlib.sha256(path.read_bytes()).hexdigest() for path in [
              APP / "src/reward-3d-viewer.js", APP / "src/reward-studio.js", APP / "src/reward-framing.js",
              APP / "src/charm-geometry.js", APP / "src/collection.css", APP / "src/tabletop.css"]}}

with sync_playwright() as pw:
    browser = None
    try:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport=report["viewport"], device_scale_factor=1, reduced_motion="reduce")
        page = context.new_page()
        page.on("pageerror", lambda error: report["pageErrors"].append(str(error)))
        page.on("console", lambda message: report["consoleErrors"].append(message.text) if message.type == "error" else None)
        page.on("requestfailed", lambda request: report["resourceErrors"].append({"url": request.url, "failure": request.failure}))
        page.on("response", lambda response: report["resourceErrors"].append({"url": response.url, "status": response.status}) if response.status >= 400 else None)
        page.route("**/__reveal-studio-v44-gallery", lambda route: route.fulfill(content_type="text/html", body=HTML))
        page.goto(args.base_url + "/__reveal-studio-v44-gallery", wait_until="networkidle")
        page.evaluate("document.querySelector('dialog').showModal()")
        for label, model_id in MODELS:
            page.evaluate("""async id=>{
              window.__renderError=null;
              const {mountReward3D}=await import('/src/reward-3d-viewer.js');
              window.__viewer=mountReward3D(document.querySelector('[data-reward-3d]'),{
                id,reducedMotion:true,frameElement:document.querySelector('[data-reward-frame]'),
                onError:error=>{window.__renderError=String(error);}
              });
            }""", model_id)
            page.wait_for_function("document.querySelector('[data-reward-3d]').dataset.loaded==='true'||window.__renderError")
            assert not page.evaluate("window.__renderError"), page.evaluate("window.__renderError")
            page.wait_for_function("document.querySelector('[data-reward-3d]').dataset.motion==='inspect'")
            page.wait_for_timeout(500)
            canvas = page.locator("[data-reward-3d]")
            bounds, framing = canvas.bounding_box(), page.locator("[data-reward-frame]").bounding_box()
            assert bounds and framing and bounds["width"] >= 380 and bounds["height"] >= 830, bounds
            if "renderer" not in report:
                report["renderer"] = canvas.evaluate("""canvas=>{
                  const gl=canvas.getContext('webgl2'),debug=gl?.getExtension('WEBGL_debug_renderer_info');
                  return {api:gl?'WebGL2':'unavailable',renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl?.getParameter(gl.RENDERER),vendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):gl?.getParameter(gl.VENDOR)};
                }""")
            before, after = OUT / f"{label}-front-390x844.png", OUT / f"{label}-dragged-390x844.png"
            page.screenshot(path=str(before))
            x, y = framing["x"] + framing["width"] * .28, framing["y"] + framing["height"] * .5
            page.mouse.move(x, y)
            page.mouse.down()
            page.mouse.move(x + 106, y, steps=12)
            page.mouse.up()
            page.wait_for_timeout(300)
            page.screenshot(path=str(after))
            first = np.asarray(Image.open(before).convert("RGB"), dtype=np.int16)
            second = np.asarray(Image.open(after).convert("RGB"), dtype=np.int16)
            delta = np.abs(second - first)
            changed = int(np.count_nonzero(np.max(delta, axis=2) > 8))
            assert changed > 120, {"model": label, "changedPixels": changed}
            result = {"id": model_id, "name": label, "canvas": bounds, "frame": framing, "loaded": canvas.get_attribute("data-loaded"),
                      "motion": canvas.get_attribute("data-motion"), "beforeScreenshot": str(before), "afterScreenshot": str(after),
                      "realMouseDrag": {"from": [x, y], "to": [x + 106, y], "steps": 12},
                      "dragDiff": {"changedPixelsOver8": changed, "meanChannelDifference": round(float(delta.mean()), 4)}}
            page.evaluate("window.__viewer.destroy()")
            result["loadedClearedAfterDestroy"] = canvas.get_attribute("data-loaded") is None
            assert result["loadedClearedAfterDestroy"]
            report["models"].append(result)
        assert not report["pageErrors"], report["pageErrors"]
        assert not report["consoleErrors"], report["consoleErrors"]
        assert not report["resourceErrors"], report["resourceErrors"]
        report["status"] = "passed"
    except Exception as error:
        report["status"] = "failed"
        report["failure"] = repr(error)
        raise
    finally:
        report["finishedAt"] = datetime.now(timezone.utc).isoformat()
        (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        if browser:
            browser.close()
        print(json.dumps({"status": report["status"], "models": len(report["models"]), "report": str(OUT / "report.json")}, ensure_ascii=False))
