"""V12 native-input checks; isolated browser, never changes Owner storage."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--webkit', action='store_true')
parser.add_argument('--regression-only', action='store_true')
args = parser.parse_args()
engine = 'webkit' if args.webkit else 'chromium'
out = Path(__file__).resolve().parents[1] / 'evidence' / 'placement-v12'
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as pw:
    browser = getattr(pw, engine).launch(headless=True)
    context = browser.new_context(viewport={'width':390,'height':844}, has_touch=True, device_scale_factor=2)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.goto('http://127.0.0.1:5114/', wait_until='networkidle')
    page.wait_for_selector('[data-ready="true"]', timeout=20000)
    shell = page.locator('[data-tabletop]')
    report = {'engine':engine, 'status':'started', 'errors':errors}
    try:
        page.get_by_role('button', name='Pick Cloud pearl', exact=True).tap()
        page.get_by_role('button', name='Thread held bead', exact=True).tap()
        page.get_by_role('button', name='Pick Rose prism', exact=True).tap()
        placed = page.locator('[data-cord-index="0"]').bounding_box()
        # A real finger hits the topmost insertion preview when targets overlap.
        page.touchscreen.tap(placed['x']+22, placed['y']+22)
        assert shell.get_attribute('data-count') == '2', 'Held new bead was not inserted over an existing bead'
        assert sorted(shell.get_attribute('data-ids').split(',')) == ['pearl','rose-prism']
        assert page.locator('dialog[open]').count() == 0, 'Unexpected edit dialog while holding a new bead'
        page.screenshot(path=str(out / f'{engine}-inserted.png'))
        checks = ['held-bead-over-existing-inserts-once']
        if not args.regression_only:
            saved = shell.get_attribute('data-ids')
            box = page.locator('[data-box-scroll]')
            bounds = box.bounding_box()
            x = bounds['x']+bounds['width']*.5
            y = bounds['y']+bounds['height']*.8
            if engine == 'chromium':
                cdp = context.new_cdp_session(page)
                cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
                for delta in range(10,151,10):
                    cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':x,'y':y-delta}]})
                    page.wait_for_timeout(20)
                cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
                gesture = 'native-touch'
            else:
                page.mouse.move(x,y)
                page.mouse.wheel(0,240)
                gesture = 'native-wheel'
            page.wait_for_timeout(400)
            assert box.evaluate('(el)=>el.scrollTop') > 40
            assert not shell.get_attribute('data-held')
            assert shell.get_attribute('data-ids') == saved
            checks.append(f'{gesture}-box-scroll-does-not-pick')
            page.get_by_role('button',name='Charms',exact=True).tap()
            assert box.evaluate('(el)=>el.scrollTop') == 0
            assert page.get_by_role('button',name='Pick Pearl shell',exact=True).count() == 1
            page.get_by_role('button',name='Beads',exact=True).tap()
            # Preview is transient, commits only on release, and can be cancelled.
            source = page.get_by_role('button',name='Pick Aqua drop',exact=True).bounding_box()
            bead = page.locator('[data-cord-index="0"]').bounding_box()
            startx,starty = source['x']+source['width']/2,source['y']+source['height']/2
            endx,endy = bead['x']+22,bead['y']+22
            page.mouse.move(startx,starty)
            page.mouse.down()
            page.mouse.move(startx-35,starty,steps=5)
            page.mouse.move(endx,endy,steps=12)
            assert shell.get_attribute('data-held') == 'aqua-drop'
            assert shell.get_attribute('data-preview-index')
            assert shell.get_attribute('data-ids') == saved
            page.screenshot(path=str(out / f'{engine}-drag-preview.png'))
            work = page.locator('[data-work]').bounding_box()
            page.mouse.move(work['x']+20,work['y']+20,steps=6)
            assert shell.get_attribute('data-preview-index') == ''
            assert shell.get_attribute('data-ids') == saved
            page.mouse.move(endx,endy,steps=10)
            page.mouse.up()
            assert shell.get_attribute('data-count') == '3'
            page.get_by_role('button',name='Undo last change',exact=True).tap()
            assert shell.get_attribute('data-ids') == saved
            page.get_by_role('button',name='Pick Aqua drop',exact=True).tap()
            page.keyboard.press('Escape')
            assert shell.get_attribute('data-ids') == saved
            checks.extend(['horizontal-pick-and-local-preview','invalid-space-clears-preview','release-commits-once','exact-undo','escape-cancels'])
            # Persisted real selections, not a fixed image or injected game state.
            palette = ['Aqua drop','Cloud pearl','Lilac heart','Rose prism','Jade ring','Pearl shell']
            while int(shell.get_attribute('data-count')) < 14:
                count = int(shell.get_attribute('data-count'))
                page.get_by_role('button',name='All beads and categories',exact=True).click()
                page.get_by_role('button',name=f'Add {palette[count%len(palette)]}',exact=True).click()
                if count+1 in [3,8,14]:
                    page.wait_for_timeout(250)
                    page.screenshot(path=str(out / f'{engine}-{count+1}-pieces.png'))
            full = shell.get_attribute('data-ids')
            page.get_by_role('button',name='All beads and categories',exact=True).click()
            page.get_by_role('button',name='Add Cloud pearl',exact=True).click()
            assert shell.get_attribute('data-ids') == full
            assert not shell.get_attribute('data-held')
            page.get_by_role('button',name='Show Mia',exact=True).tap()
            page.get_by_role('button',name='Charm',exact=True).tap()
            page.wait_for_timeout(400)
            assert shell.get_attribute('data-ids') == full
            page.screenshot(path=str(out / f'{engine}-finished-14.png'))
            checks.extend(['3-8-14-piece-density','15th-piece-rejected-without-loss','finished-exact-14-piece-loop'])
            matrices=[]
            for width,height in [(320,568),(390,844),(402,874),(390,664),(844,390),(568,320),(1440,1000)]:
                page.set_viewport_size({'width':width,'height':height})
                for view,label in [('charm','Charm'),('phone','On phone')]:
                    page.get_by_role('button',name=label,exact=True).click()
                    page.wait_for_timeout(250)
                    result=page.evaluate("""() => {
                        const s=document.querySelector('[data-tabletop]'),r=s.getBoundingClientRect();
                        const b=[...s.querySelectorAll('button')].filter(n=>n.getClientRects().length&&!n.disabled);
                        const overlaps=b.flatMap((n,i)=>b.slice(i+1).filter(m=>{
                          const a=n.getBoundingClientRect(),c=m.getBoundingClientRect();
                          return Math.min(a.right,c.right)-Math.max(a.left,c.left)>1&&Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top)>1;
                        }).map(m=>[n.getAttribute('aria-label')||n.textContent,m.getAttribute('aria-label')||m.textContent]));
                        return {overflow:document.documentElement.scrollWidth>innerWidth,overlaps,
                          bad:b.filter(n=>{const a=n.getBoundingClientRect();return a.width<43.9||a.height<43.9||a.left<r.left-.5||a.right>r.right+.5||a.top<0||a.bottom>innerHeight+.5;}).map(n=>n.getAttribute('aria-label')||n.textContent)};
                    }""")
                    assert not result['overflow'] and not result['bad'] and not result['overlaps'], (width,height,view,result)
                    assert shell.get_attribute('data-ids') == full
                    page.screenshot(path=str(out/f'{engine}-finished-{view}-{width}x{height}.png'))
                    matrices.append({'width':width,'height':height,'view':view,**result})
            (out/f'{engine}-finished-matrix.json').write_text(json.dumps(matrices,indent=2))
            checks.append('seven-viewports-both-finish-views')
            report['scrollGesture'] = gesture
        assert not errors, errors
        report['status'] = 'passed'
        report['checks'] = checks
    except Exception as exc:
        report['status'] = 'failed'
        report['failure'] = str(exc)
        page.screenshot(path=str(out / f'{engine}-failure.png'))
        raise
    finally:
        (out / f'{engine}-regression.json').write_text(json.dumps(report,indent=2))
        print(json.dumps(report,indent=2))
        context.close()
        browser.close()
