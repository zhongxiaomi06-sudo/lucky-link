"""Native interaction audit; projected points are read-only framing evidence."""
from pathlib import Path
import json
import sys
from playwright.sync_api import sync_playwright, expect

out = Path(__file__).resolve().parents[1] / 'evidence' / 'showcase-v8'
out.mkdir(parents=True, exist_ok=True)
full = '--full' in sys.argv
matrix = [('chromium',390,844),('chromium',320,568),('chromium',1440,1000),('webkit',390,844),('webkit',844,390)] if full else [('chromium',390,844)]
reports = []
with sync_playwright() as p:
    for engine,w,h in matrix:
        browser = getattr(p,engine).launch(headless=True, args=['--use-angle=metal','--enable-gpu'] if engine=='chromium' else [])
        page = browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
        page.goto('http://127.0.0.1:5114/3d-lab.html?debug',wait_until='domcontentloaded',timeout=60000)
        shell=page.locator('[data-lab-shell]')
        expect(shell).to_have_attribute('data-render-ready','true',timeout=45000)
        def action(name): return page.locator(f'[data-action="{name}"]')
        action('collection').click()
        for name in ['Blue eye','Aqua drop','Cloud pearl','Pearl shell','Clear quartz','Cobalt gem']:
            page.get_by_role('button',name=f'Add {name}',exact=True).click()
        page.get_by_role('button',name='Close bead collection').click()
        original=shell.get_attribute('data-composition')
        action('finish').click()
        expect(shell).to_have_attribute('data-finish-view','charm')
        expect(shell).to_have_attribute('data-showcase-motion','playing')
        expect(shell).to_have_attribute('data-showcase-composition',original)
        action('showcase-spin').click()
        expect(shell).to_have_attribute('data-showcase-motion','paused')
        action('showcase-front').click(); page.wait_for_timeout(1000)
        # Hide only diagnostics for the evidence image; game data remains read-only.
        page.screenshot(path=str(out/f'{engine}-{w}x{h}-charm.png'),style='[data-diagnostics]{display:none!important}')
        def framed():
            r=json.loads(shell.get_attribute('data-showcase-rect'))
            pts=json.loads(shell.get_attribute('data-showcase-points'))
            assert len(pts)==6
            assert all(r['x'] <= v['x'] <= r['x']+r['width'] and r['y'] <= v['y'] <= r['y']+r['height'] for v in pts), {'rect':r,'points':pts}
        framed()
        for name in ['view-charm','view-phone','showcase-spin','showcase-front','score','edit','next','customize']:
            b=action(name).bounding_box(); assert b and b['width']>=44 and b['height']>=44,(name,b)
            assert 0<=b['x'] and 0<=b['y'] and b['x']+b['width']<=w+1 and b['y']+b['height']<=h+1,(name,b)
            assert action(name).evaluate('(el)=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}'), name
        action('showcase-spin').click()
        page.wait_for_timeout(1700)
        action('showcase-spin').click()
        phase=shell.get_attribute('data-showcase-degrees');page.wait_for_timeout(450)
        assert shell.get_attribute('data-showcase-degrees')==phase
        action('showcase-spin').click();page.wait_for_timeout(1200)
        assert int(shell.get_attribute('data-showcase-degrees'))>int(phase)
        # A real canvas drag owns the camera immediately and does not mutate the design.
        r=json.loads(shell.get_attribute('data-showcase-rect')); b=page.locator('[data-canvas]').bounding_box()
        x=b['x']+r['x']+r['width']*.3; y=b['y']+r['y']+r['height']*.45
        page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+r['width']*.3,y,steps=12);page.mouse.up()
        expect(shell).to_have_attribute('data-showcase-motion','paused')
        expect(shell).to_have_attribute('data-composition',original)
        # Scores/rewards stay available without covering the inspection by default.
        action('score').click();expect(page.locator('[data-dialog="score"]')).to_be_visible()
        expect(page.locator('[data-reward-reveal]')).to_contain_text('+40 Studio XP')
        page.get_by_role('button',name='Close score and reward').click()
        action('view-phone').click();expect(shell).to_have_attribute('data-finish-view','phone')
        page.wait_for_timeout(1000);page.screenshot(path=str(out/f'{engine}-{w}x{h}-phone.png'),style='[data-diagnostics]{display:none!important}')
        action('tour').click();expect(shell).to_have_attribute('data-camera-mode','tour')
        action('view-charm').click();expect(shell).to_have_attribute('data-showcase-motion','paused')
        action('showcase-front').click();page.wait_for_timeout(1000)
        # An entire real-time revolution on the main phone viewport, without clock injection.
        sampled=[]
        if (engine,w,h)==('chromium',390,844):
            action('showcase-spin').click()
            for i in range(27):
                page.wait_for_timeout(1000);framed()
                sampled.append(int(shell.get_attribute('data-showcase-degrees')))
                if i in [6,12,18]:page.screenshot(path=str(out/f'orbit-{i}.png'),style='[data-diagnostics]{display:none!important}')
            expect(shell).to_have_attribute('data-showcase-motion','complete')
            expect(shell).to_have_attribute('data-showcase-degrees','360')
        action('edit').click();expect(shell).to_have_attribute('data-state','compose')
        expect(shell).to_have_attribute('data-composition',original)
        expect(shell).to_have_attribute('data-showcase-motion','idle')
        expect(page.locator('[data-box-slot="0"]')).to_be_visible()
        action('finish').click();action('score').click();expect(page.locator('[data-reward-reveal]')).to_be_hidden()
        page.get_by_role('button',name='Close score and reward').click()
        action('next').click();expect(page.locator('[data-level-name]')).to_have_text('Rose letter')
        expect(page.locator('[data-count]')).to_have_text('0')
        assert not errors,errors
        reports.append({'engine':engine,'viewport':[w,h],'native_interaction':'pass','framing':'pass','full_revolution_samples':sampled,'errors':errors})
        (out/'audit.json').write_text(json.dumps(reports,indent=2)+'\n')
        browser.close()
        print(json.dumps(reports[-1]),flush=True)
    (out/'audit.json').write_text(json.dumps(reports,indent=2)+'\n')
