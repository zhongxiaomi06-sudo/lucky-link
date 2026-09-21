"""Real-input collectible cord, preserved design, undo, pixels and card audit."""
import argparse, hashlib, json
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--webkit',action='store_true');parser.add_argument('--out',type=Path,required=True)
args=parser.parse_args();app=Path(__file__).resolve().parents[1];engine='webkit' if args.webkit else 'chromium'
out=args.out/engine;out.mkdir(parents=True,exist_ok=True);checks=[];errors=[]
hashes={str(f.relative_to(app)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (app/'src').iterdir() if f.is_file()}
def passed(s):checks.append(s);print(json.dumps({'passed':s,'engine':engine}),flush=True)
with sync_playwright() as p:
    browser=getattr(p,engine).launch(headless=True)
    c=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
    page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if '127.0.0.1' in r.url and r.status>=400 else None)
    page.goto('http://127.0.0.1:5114/',wait_until='networkidle');shell=page.locator('[data-tabletop]');expect(shell).to_have_attribute('data-ready','true',timeout=45000)
    assert page.evaluate('localStorage.getItem("lucky-link.collection.v1")') is None
    page.screenshot(path=str(out/'home.png'))
    def tap(name):page.get_by_role('button',name=name,exact=True).tap()
    tap('Make yours')
    for name in ['Aqua drop','Cloud pearl','Rose prism']:
        b=page.get_by_role('button',name='Pick '+name,exact=True);b.scroll_into_view_if_needed();b.tap();tap('Thread held bead')
    ids=shell.get_attribute('data-ids')
    tap('Choose cord material');expect(page.locator('[data-cord-choice]')).to_have_count(5)
    expect(page.locator('[data-cord-choice][data-locked]')).to_have_count(2)
    page.screenshot(path=str(out/'cord-collection.png'))
    tap('Use Ivory silk');expect(shell).to_have_attribute('data-cord-id','cord-satin');expect(shell).to_have_attribute('data-ids',ids)
    tap('Undo last change');expect(shell).to_have_attribute('data-cord-id','cord-cotton');expect(shell).to_have_attribute('data-ids',ids)
    tap('Choose cord material');tap('Use Ivory silk')
    passed('Five cord choices include two locked; starter switch and undo never change bead order')
    tap('Choose cord material');tap('Unlock Silver links');game=page.locator('[data-dialog="match"]')
    expect(game).to_have_attribute('data-reward-id','cord-silver');tap('Start')
    tiles=game.locator('[data-tile]');names=tiles.evaluate_all('(ns)=>ns.map(n=>n.getAttribute("aria-label").split(", bead ")[0])')
    for name in dict.fromkeys(names):
        for i,n in enumerate(names):
            if n==name:tiles.nth(i).tap()
    expect(game).to_have_attribute('data-granted','true');expect(shell).to_have_attribute('data-cord-id','cord-satin')
    expect(shell).to_have_attribute('data-collected','29');expect(shell).to_have_attribute('data-cords-collected','4');expect(shell).to_have_attribute('data-ids',ids)
    page.wait_for_timeout(950);page.screenshot(path=str(out/'silver-earned.png'))
    tap('Use cord');expect(shell).to_have_attribute('data-cord-id','cord-silver');expect(shell).to_have_attribute('data-ids',ids)
    tap('Undo last change');expect(shell).to_have_attribute('data-cord-id','cord-satin');expect(shell).to_have_attribute('data-cords-collected','4')
    tap('Choose cord material');tap('Use Silver links')
    page.reload(wait_until='networkidle');expect(shell).to_have_attribute('data-ready','true');tap('Make yours')
    expect(shell).to_have_attribute('data-cord-id','cord-silver');expect(shell).to_have_attribute('data-ids',ids)
    tap('Unlock hidden beads');expect(game.locator('[data-prize-rule]')).to_contain_text('tomorrow');tap('Return to DIY')
    tap('Choose cord material');tap('Unlock Ocean weave');expect(game.locator('[data-prize-rule]')).to_contain_text('tomorrow');tap('Return to DIY')
    passed('Real six-pair Silver reward is collected, explicitly applied, undoable and persistent; bead/cord daily allowance is shared')
    def export_card(filename,cord_id):
        tap('Finish');tap('Make card');page.get_by_label('A little note').fill('Woven just for me.');tap('Create card')
        card=page.locator('[data-dialog="card"]');expect(card.locator('[data-card-status]')).to_have_text('Your card is ready.',timeout=15000)
        expect(card).to_have_attribute('data-card-ids',ids);expect(card).to_have_attribute('data-card-cord-id',cord_id)
        with page.expect_download() as dl:page.get_by_role('link',name='Save image',exact=True).click()
        dl.value.save_as(out/filename);tap('Close your card');tap('Edit your chain')
        return hashlib.sha256((out/filename).read_bytes()).hexdigest()
    silver=export_card('silver-card.png','cord-silver')
    tap('Choose cord material');tap('Use Ivory silk');satin=export_card('silk-card.png','cord-satin');assert silver!=satin
    passed('Same actual bead order and Note export distinct silver/silk PNG pixels')
    pixels=page.evaluate('''async()=>{const {loadTabletopArt}=await import('/src/tabletop-art.js');const {CORDS}=await import('/src/cord-catalog.js');const a=await loadTabletopArt();return await Promise.all([...CORDS.map(c=>[c.id,a.sprites.get(c.id)]),['phone',a.phone]].map(async([id,c])=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let clear=0,ink=0,partial=0;for(let i=3;i<d.length;i+=4){if(!d[i])clear++;else if(d[i]===255)ink++;else partial++;}const h=await crypto.subtle.digest('SHA-256',d);return{id,clear,ink,partial,sha:[...new Uint8Array(h)].map(n=>n.toString(16).padStart(2,'0')).join('')}}));}''')
    assert len(set(x['sha'] for x in pixels[:5]))==5
    assert all(x['clear']>100 and x['ink']>100 for x in pixels)
    assert pixels[-1]['partial']>50
    phone_coverage=page.evaluate('''async()=>{const {loadTabletopArt}=await import('/src/tabletop-art.js');const c=(await loadTabletopArt()).phone,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let solid=0;for(let i=3;i<d.length;i+=4)if(d[i]>128)solid++;return{width:c.width,height:c.height,ratio:solid/(c.width*c.height)}}''')
    assert phone_coverage['ratio']>.75,phone_coverage
    passed('Five visibly rendered cord textures are distinct; phone has real runtime alpha and smoothed edge pixels')
    matrix=[]
    for w,h in [(320,568),(390,844),(402,874),(844,390),(568,320),(1350,980)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(200)
        g=page.locator('main').evaluate('''root=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...root.querySelectorAll('button')].filter(b=>!b.closest('dialog')&&!b.closest('[data-box-scroll]')&&b.checkVisibility()&&!b.disabled).map(b=>{const r=b.getBoundingClientRect();return {name:b.getAttribute('aria-label')||b.innerText,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}})})''')
        assert not g['overflow']
        for b in g['buttons']:assert b['w']>=43.9 and b['h']>=43.9 and b['x']>=-1 and b['y']>=-1 and b['right']<=w+1 and b['bottom']<=h+1,b
        page.screenshot(path=str(out/f'diy-{w}x{h}.png'));tap('Choose cord material')
        for b in page.locator('[data-cord-choice]').all():
            b.scroll_into_view_if_needed();r=b.bounding_box();assert r['width']>=44 and r['height']>=44 and r['x']>=0 and r['x']+r['width']<=w+1
        tap('Back to your chain');matrix.append({'viewport':[w,h],**g})
    passed('Cord selection and DIY touch targets fit six viewport sizes at 44px or larger')
    c.close()
    c=browser.new_context(viewport={'width':390,'height':844},has_touch=True)
    q=c.new_page();q.on('pageerror',lambda e:errors.append(str(e)))
    q.goto('http://127.0.0.1:5114/?studio=1',wait_until='networkidle');expect(q.locator('[data-ready]')).to_have_attribute('data-ready','true',timeout=45000)
    q.get_by_role('button',name='Choose cord material',exact=True).tap();q.get_by_role('button',name='Unlock Ocean weave',exact=True).tap();q.get_by_role('button',name='Start',exact=True).tap()
    ts=q.locator('[data-tile]');ns=ts.evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("aria-label").split(", bead ")[0])')
    for n in dict.fromkeys(ns):
        for i,v in enumerate(ns):
            if v==n:ts.nth(i).tap()
    expect(q.locator('[data-dialog="match"]')).to_have_attribute('data-granted','true');q.get_by_role('button',name='Use cord',exact=True).tap()
    expect(q.locator('[data-tabletop]')).to_have_attribute('data-cord-id','cord-sea-braid')
    q.reload(wait_until='networkidle');expect(q.locator('[data-ready]')).to_have_attribute('data-ready','true');expect(q.locator('[data-tabletop]')).to_have_attribute('data-cord-id','cord-sea-braid')
    c.close();passed('Ocean weave is also earned through six real pairs, explicitly applied and retained after reload')
    # Explicit isolated old-storage migration fixture, never the owner profile.
    c=browser.new_context(viewport={'width':390,'height':844})
    c.add_init_script('''localStorage.setItem('lucky-link.collection.v1',JSON.stringify({version:1,ids:['pearl','amber-cube','pearl'],box:['aqua-drop'],note:'kept',unlocked:[]}));localStorage.setItem('lucky-link.custom.v1',JSON.stringify({cord:'rose'}));''')
    q=c.new_page();q.goto('http://127.0.0.1:5114/?studio=1',wait_until='networkidle');expect(q.locator('[data-ready]')).to_have_attribute('data-ready','true',timeout=45000)
    expect(q.locator('[data-tabletop]')).to_have_attribute('data-cord-id','cord-classic');expect(q.locator('[data-tabletop]')).to_have_attribute('data-ids','pearl,amber-cube,pearl')
    assert q.evaluate('JSON.parse(localStorage.getItem("lucky-link.collection.v1")).note')=='kept'
    c.close();passed('Isolated pre-cord save retains Classic color choice, beads, box and Note')
    assert not errors,errors
    assert all(hashlib.sha256((app/path).read_bytes()).hexdigest()==sha for path,sha in hashes.items())
    (out/'audit.json').write_text(json.dumps({'tested_at':datetime.now(timezone.utc).isoformat(),'engine':engine,'browser':browser.version,'checks':checks,'errors':errors,'pixels':pixels,'matrix':matrix,'source_sha256':hashes,'physical_iphone':False,'native_share_sheet':False},indent=2)+'\n')
    browser.close()
