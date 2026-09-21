"""Native homepage interactions and iPhone-sized browser evidence; not physical iPhone QA."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser()
parser.add_argument('--webkit',action='store_true')
parser.add_argument('--quick',action='store_true')
args=parser.parse_args()
engine='webkit' if args.webkit else 'chromium'
out=Path(__file__).resolve().parents[1]/'evidence'/'home-v10'
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=getattr(p,engine).launch(headless=True,**({'args':['--use-angle=metal','--enable-gpu']} if engine=='chromium' else {}))
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True)
    page=context.new_page();errors=[];failed=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('requestfailed',lambda r:failed.append(r.url) if '127.0.0.1' in r.url else None)
    page.goto('http://127.0.0.1:5114/?debug=1',wait_until='networkidle')
    view=page.locator('[data-view="cover"]');scene=page.locator('[data-cover-scene]')
    expect(view).to_have_attribute('data-home-state','ready',timeout=45000)
    page.wait_for_timeout(500)
    page.screenshot(path=str(out/f'{engine}-390-initial.png'))
    if args.quick:
        print(json.dumps({'engine':engine,'errors':errors,'calls':scene.get_attribute('data-calls'),'triangles':scene.get_attribute('data-triangles')}))
        browser.close();raise SystemExit()
    samples=[]
    for w,h in [(390,844),(320,568),(402,874),(440,956),(844,390),(1440,1000),(390,664)]:
        page.set_viewport_size({'width':w,'height':h})
        page.evaluate('''([w,h])=>{const s=document.documentElement.style;s.setProperty('--home-top',w<h?'59px':'0px');s.setProperty('--home-bottom','34px');s.setProperty('--home-left',w>h?'59px':'0px');s.setProperty('--home-right',w>h?'59px':'0px');dispatchEvent(new Event('resize'));}''',[w,h])
        page.wait_for_timeout(200)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        controls=page.locator('[data-action="start"], [data-action="sound"]').evaluate_all('''els=>els.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})''')
        for c in controls:
            assert c['width']>=44 and c['height']>=44 and c['hit'],c
            assert 0<=c['top']<c['bottom']<=h-10 and c['left']>=0 and c['right']<=w,c
        safe=json.loads(scene.get_attribute('data-safe'));points=json.loads(scene.get_attribute('data-subject'))
        assert all(safe['left']-1<=x<=safe['right']+1 and safe['top']-1<=y<=safe['bottom']+1 for x,y in points),(w,h,safe,points)
        page.screenshot(path=str(out/f'{engine}-{w}x{h}.png'))
        samples.append({'viewport':[w,h],'safe':safe,'projected_corners':points,'controls':controls})
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200)
    # Real pointer drag changes the 3D camera; no game storage is injected or modified.
    saved=page.evaluate('localStorage.getItem("lucky-link.styling.v2")')
    camera=scene.get_attribute('data-camera')
    page.mouse.move(175,340);page.mouse.down();page.mouse.move(250,345,steps=8);page.mouse.up()
    assert scene.get_attribute('data-camera')!=camera
    assert page.evaluate('localStorage.getItem("lucky-link.styling.v2")')==saved
    expect(view).to_have_attribute('data-audio-state','running')
    sound=page.locator('[data-action="sound"]');sound.tap();expect(sound).to_have_attribute('aria-pressed','true')
    page.reload(wait_until='networkidle');expect(view).to_have_attribute('data-home-state','ready',timeout=45000)
    expect(sound).to_have_attribute('aria-pressed','true')
    assert view.get_attribute('data-audio-state') is None
    page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(250)
    before=scene.get_attribute('data-frame');page.wait_for_timeout(350);assert scene.get_attribute('data-frame')==before
    canvas=scene.locator('canvas');canvas.focus();page.keyboard.press('ArrowLeft');assert scene.get_attribute('data-frame')!=before
    page.evaluate("document.documentElement.style.fontSize='200%'");page.wait_for_timeout(250)
    expect(page.get_by_role('button',name='Start',exact=True)).to_be_in_viewport()
    page.screenshot(path=str(out/f'{engine}-text-200.png'))
    page.get_by_role('button',name='Start',exact=True).tap()
    expect(page).to_have_url('http://127.0.0.1:5114/3d-lab.html')
    expect(page.locator('[data-lab-shell]')).to_have_attribute('data-render-ready','true',timeout=45000)
    expect(page.locator('[data-level-name]')).to_have_text('Ocean wish')
    # Touch path completes a real three-piece free DIY composition.
    page.locator('[data-action="levels"]').tap();page.get_by_role('button',name='Free DIY',exact=True).tap()
    page.locator('[data-action="collection"]').tap()
    for name in ['Cloud pearl','Aqua drop','Pearl shell']:page.get_by_role('button',name='Add '+name,exact=True).tap()
    page.get_by_role('button',name='Close bead collection').tap();page.locator('[data-action="finish"]').tap()
    expect(page.locator('[data-lab-shell]')).to_have_attribute('data-finish-view','charm')
    # A blocked optional capability must leave a start path.
    for mode in ['storage','webgl','audio']:
        c=browser.new_context(viewport={'width':390,'height':844},has_touch=True)
        if mode=='storage':c.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('Blocked storage')}})")
        if mode=='webgl':c.add_init_script("const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){if(t.includes('webgl'))return null;return orig.call(this,t,...a)}")
        if mode=='audio':c.add_init_script("window.AudioContext=class{constructor(){throw new Error('No audio')}};window.webkitAudioContext=window.AudioContext")
        pg=c.new_page();pg.goto('http://127.0.0.1:5114/',wait_until='networkidle')
        expect(pg.locator('[data-view="cover"]')).to_have_attribute('data-home-state','fallback' if mode=='webgl' else 'ready',timeout=45000)
        if mode=='audio':pg.locator('canvas').tap()
        pg.get_by_role('button',name='Start',exact=True).tap()
        if mode=='webgl':
            expect(pg).to_have_url('http://127.0.0.1:5114/?view=2d');pg.get_by_role('button',name='Build your lucky',exact=True).tap();expect(pg.locator('[data-view="compose"]')).to_be_visible()
        else:expect(pg).to_have_url('http://127.0.0.1:5114/3d-lab.html')
        c.close()
    assert not errors,errors
    assert not failed,failed
    result={'engine':engine,'samples':samples,'errors':errors,'same_origin_failures':failed,'checks':['3D bounds','safe-area simulation','dynamic browser height','44px hit','camera gesture','no draft mutation','audio gesture and mute reload','reduced motion','200% text','Start and game completion','storage/webgl/audio fallback'],'physical_iphone':False}
    (out/f'{engine}.json').write_text(json.dumps(result,indent=2))
    print(json.dumps({'engine':engine,'passed':True,'viewports':len(samples),'errors':errors}));browser.close()
