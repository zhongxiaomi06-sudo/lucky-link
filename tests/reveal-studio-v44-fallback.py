"""Actual first win with WebGL deliberately unavailable only on the reward canvas."""
import json
import time
from pathlib import Path
from playwright.sync_api import Error, sync_playwright

output=Path(__file__).resolve().parents[1]/'evidence'/'reveal-studio-v44-fallback'
output.mkdir(parents=True,exist_ok=True)
report={'engine':'chromium','actualGameplay':True,'forcedWin':False,'rewardWebGLDisabled':True,'ownerStorageTouched':False,'realDevice':False,'pageErrors':[],'consoleErrors':[],'status':'running'}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
    page.add_init_script("""let seed=7413;Math.random=()=>((seed=seed*48271%2147483647)-1)/2147483646;
      const getContext=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){
        if(this.hasAttribute('data-reward-3d')&&type.startsWith('webgl'))return null;
        return getContext.call(this,type,...args);
      };""")
    page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
    page.on('console',lambda m:report['consoleErrors'].append(m.text) if m.type=='error' else None)
    try:
        page.goto('http://127.0.0.1:5114/',wait_until='networkidle')
        page.locator('[data-home-hook]').click()
        game=page.locator('[data-dialog=match]')
        field=page.locator('[data-gravity-field]')
        page.locator('[data-dialog=match][data-game-state=playing]').wait_for()
        slots={};deadline=time.monotonic()+65
        while game.get_attribute('data-game-state')=='playing' and time.monotonic()<deadline:
            material=page.locator('[data-gravity-next] img').first.get_attribute('data-material')
            if material not in slots:slots[material]=[42,101,160,219,278][min(len(slots),4)]
            box=field.bounding_box()
            try:field.click(position={'x':box['width']*slots[material]/320,'y':box['height']*.08},force=True)
            except Error:
                if game.get_attribute('data-game-state')!='won':raise
            page.wait_for_timeout(385)
        page.locator('[data-dialog=match][data-game-state=won]').wait_for(timeout=15000)
        fallback=page.locator('[data-end-image]')
        fallback.wait_for(state='visible')
        page.wait_for_function("document.querySelector('[data-end-image]').naturalWidth>0")
        report['canvasHidden']=page.locator('[data-reward-3d]').is_hidden()
        report['imageLoaded']=fallback.evaluate('(image)=>image.complete&&image.naturalWidth>0')
        report['rewardCount']=page.evaluate("JSON.parse(localStorage.getItem('lucky-link.collection.v1')).mainline.coupons.length")
        page.screenshot(path=str(output/'fallback-390x844.png'))
        page.locator('[data-match-again]').click()
        page.locator('[data-dialog=match][data-game-state=playing]').wait_for()
        report['retryWorks']=True
        report['expectedWebGLErrors']=[e for e in report['consoleErrors'] if 'Error creating WebGL context' in e]
        report['unexpectedConsoleErrors']=[e for e in report['consoleErrors'] if e not in report['expectedWebGLErrors']]
        assert report['canvasHidden'] and report['imageLoaded'] and report['rewardCount']==1
        assert not report['pageErrors'] and not report['unexpectedConsoleErrors']
        report['status']='passed'
    except Exception as error:
        report['status']='failed';report['failure']=repr(error);raise
    finally:
        (output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(report,ensure_ascii=False));browser.close()
