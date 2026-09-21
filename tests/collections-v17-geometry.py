"""Check real visible controls for overlap on both home and DIY, without owner state."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--webkit',action='store_true');args=p.parse_args();engine='webkit' if args.webkit else 'chromium'
out=Path(__file__).resolve().parents[1]/'evidence'/'collections-v17'/engine;out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    browser=getattr(pw,engine).launch(headless=True);page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    page.goto('http://127.0.0.1:5114/',wait_until='networkidle');expect(page.locator('[data-tabletop]')).to_have_attribute('data-ready','true',timeout=45000)
    report=[]
    for state in ['home','compose']:
        if state=='compose':
            page.set_viewport_size({'width':390,'height':844});page.get_by_role('button',name='Make yours',exact=True).tap()
            for name in ['Aqua drop','Cloud pearl','Rose prism','Lilac heart','Blue star']:
                b=page.get_by_role('button',name='Pick '+name,exact=True);b.scroll_into_view_if_needed();b.tap();page.get_by_role('button',name='Thread held bead',exact=True).tap()
        for w,h in [(320,568),(390,844),(402,874),(844,390),(568,320),(1440,1000)]:
            page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(180)
            controls=page.get_by_role('button').evaluate_all('''ns=>ns.filter(n=>n.checkVisibility()&&!n.closest('dialog')&&!n.closest('[data-box-scroll]')).map(n=>{const r=n.getBoundingClientRect();return{label:n.getAttribute('aria-label')||n.textContent,x:r.x,y:r.y,w:r.width,h:r.height,bead:n.hasAttribute('data-cord-index')||n.hasAttribute('data-home-bead')}})''')
            for i,a in enumerate(controls):
                assert a['w']>=43.9 and a['h']>=43.9 and a['x']>=-1 and a['x']+a['w']<=w+1 and a['y']>=-1 and a['y']+a['h']<=h+1,(state,w,h,a)
                for b in controls[i+1:]:
                    if a['bead'] and b['bead']:continue
                    overlap=min(a['x']+a['w'],b['x']+b['w'])-max(a['x'],b['x'])>1 and min(a['y']+a['h'],b['y']+b['h'])-max(a['y'],b['y'])>1
                    assert not overlap,(state,w,h,a,b)
            page.screenshot(path=str(out/f'final-{state}-{w}x{h}.png'));report.append({'state':state,'viewport':[w,h],'controls':controls})
    (out/'geometry.json').write_text(json.dumps({'engine':engine,'cases':report,'physical_iphone':False},indent=2)+'\n');browser.close()
print(json.dumps({'engine':engine,'layouts_passed':len(report)}))
