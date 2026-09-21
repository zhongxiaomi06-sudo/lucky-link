"""Capture an isolated background proposal; never touches the real game or saves."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url',default='http://127.0.0.1:5114/tests/fixtures/reveal-studio-v46.html')
args=parser.parse_args()
app=Path(__file__).resolve().parents[1]
output=app/'evidence'/'reveal-background-v46'
output.mkdir(parents=True,exist_ok=True)
report={'createdAt':datetime.now(timezone.utc).isoformat(),'isolatedVisualProposal':True,'productionChanged':False,'ownerApproved':False,'realWebGL':True,'realDevice':False,'audioTested':False,'gameplayTested':False,'errors':[],'shots':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,reduced_motion='reduce')
    page.on('pageerror',lambda error:report['errors'].append(str(error)))
    page.on('console',lambda message:report['errors'].append(message.text) if message.type=='error' else None)
    try:
        page.goto(args.url,wait_until='networkidle')
        page.locator('#studio-world[data-ready=true]').wait_for()
        page.wait_for_timeout(300)
        for name,width,height in [('portrait',390,844),('short',320,568),('landscape',844,390)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(200)
            path=output/f'{name}.png';page.screenshot(path=str(path))
            report['shots'].append({'path':str(path),'width':width,'height':height,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        page.set_viewport_size({'width':390,'height':844})
        page.mouse.move(160,380);page.mouse.down();page.mouse.move(226,380,steps=6);page.mouse.up();page.wait_for_timeout(200)
        page.screenshot(path=str(output/'angle.png'))
        report['storageKeys']=page.evaluate('Object.keys(localStorage)')
        report['status']='rendered' if not report['errors'] else 'failed'
        assert not report['errors'],report['errors']
        assert not report['storageKeys'],report['storageKeys']
    finally:
        (output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False));browser.close()
