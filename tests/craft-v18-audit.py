"""Isolated V18 craft unlock, actual pixels, framing and composition audit."""
import argparse, hashlib, json, struct
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--webkit',action='store_true')
parser.add_argument('--out',type=Path,required=True)
args=parser.parse_args()
app=Path(__file__).resolve().parents[1]
engine='webkit' if args.webkit else 'chromium'
out=args.out/engine;out.mkdir(parents=True,exist_ok=True)
errors=[];checks=[]
hashes={str(f.relative_to(app)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((app/'src').glob('*')) if f.is_file()}
def passed(name):checks.append(name);print(json.dumps({'passed':name,'engine':engine}),flush=True)
with sync_playwright() as p:
    browser=getattr(p,engine).launch(headless=True)
    c=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
    page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if '127.0.0.1' in r.url and r.status>=400 else None)
    page.goto('http://127.0.0.1:5114/',wait_until='networkidle')
    shell=page.locator('[data-tabletop]');expect(shell).to_have_attribute('data-ready','true',timeout=45000)
    expect(shell).to_have_attribute('data-collected','29')
    assert page.evaluate('localStorage.getItem("lucky-link.collection.v1")') is None
    assert page.locator('[data-home-bead]').count()==14
    assert not page.locator('.home-unlock').count()
    page.screenshot(path=str(out/'home-390x844.png'))
    def tap(name):page.get_by_role('button',name=name,exact=True).tap()
    def add_id(id):
        tap('All beads and categories');b=page.locator('[data-dialog="collection"] [data-material-id="'+id+'"]');b.scroll_into_view_if_needed();b.tap()
    tap('Make yours')
    for id in ['braided-knot','ceramic-flute','turquoise-pebble','pearl','amber-cube','jade-ring','jelly-heart-pink','turquoise-pebble','ceramic-flute']:
        add_id(id)
    before=shell.get_attribute('data-ids')
    page.locator('[data-cord-index="0"]').tap();tap('Return to box')
    expect(shell).to_have_attribute('data-box-count','1');tap('Undo last change')
    expect(shell).to_have_attribute('data-ids',before)
    passed('Three new starters are real placeable sprites; return and undo preserve the design')
    tap('Unlock hidden beads');game=page.locator('[data-dialog="match"]')
    expect(game.locator('[data-prize-name]')).to_have_text('Hammered gold')
    tap('Start')
    tiles=game.locator('[data-tile]')
    names=tiles.evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("aria-label").split(", bead ")[0])')
    for name in dict.fromkeys(names):
        for i,n in enumerate(names):
            if n==name:tiles.nth(i).tap()
    expect(game).to_have_attribute('data-game-state','won');expect(game).to_have_attribute('data-granted','true')
    expect(shell).to_have_attribute('data-collected','30');expect(shell).to_have_attribute('data-ids',before)
    page.wait_for_timeout(1000);page.screenshot(path=str(out/'earned-gold.png'))
    tap('Use bead');expect(shell).to_have_attribute('data-held','gold-medallion');tap('Thread held bead')
    before=shell.get_attribute('data-ids')
    page.reload(wait_until='networkidle');expect(shell).to_have_attribute('data-ready','true');tap('Make yours')
    expect(shell).to_have_attribute('data-ids',before);expect(shell).to_have_attribute('data-collected','30')
    tap('Unlock hidden beads');expect(game.locator('[data-prize-name]')).to_have_text('Silk tassel')
    expect(game.locator('[data-prize-rule]')).to_contain_text('tomorrow');tap('Return to DIY')
    passed('Default real six-pair reward grants new gold once; next craft reward obeys daily lock; reload persists')
    page.screenshot(path=str(out/'diy-390x844.png'))
    tap('Finish');tap('Make card');page.get_by_label('A little note').fill('A little warmth, wherever I go.');tap('Create card')
    card=page.locator('[data-dialog="card"]');expect(card.locator('[data-card-status]')).to_have_text('Your card is ready.',timeout=15000)
    expect(card).to_have_attribute('data-card-ids',before)
    with page.expect_download() as dl:page.get_by_role('link',name='Save image',exact=True).click()
    dl.value.save_as(out/'craft-card.png')
    data=(out/'craft-card.png').read_bytes();assert struct.unpack('>II',data[16:24])==(1080,1440)
    passed('Actual 1080 × 1440 PNG uses the placed craft order and Note')
    tap('Close your card');tap('Edit your chain')
    pixels=page.evaluate('''async()=>{const {loadTabletopArt}=await import('/src/tabletop-art.js');const {CRAFT_IDS}=await import('/src/collection-catalog.js');const a=await loadTabletopArt();return CRAFT_IDS.map(id=>{const c=a.sprites.get(id),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0,clear=0,key=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>128){ink++;if(d[i]>145&&d[i+2]>145&&d[i+1]<85&&Math.abs(d[i]-d[i+2])<65)key++;}if(!d[i+3])clear++;}return{id,w:c.width,h:c.height,ink,clear,key};});}''')
    assert len(pixels)==6 and all(x['ink']>100 and x['clear']>100 and x['key']==0 for x in pixels),pixels
    passed('Six actual decoded craft images have visible material, transparent surroundings and no opaque magenta')
    matrix=[]
    for w,h in [(320,568),(390,844),(402,874),(844,390),(568,320),(1350,980)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(200)
        g=page.locator('[data-work]').evaluate('''async n=>{const {jewelryLayout}=await import('/src/tabletop-layout.js');const r=n.getBoundingClientRect();return {work:{x:r.x,y:r.y,w:r.width,h:r.height},phone:jewelryLayout(r.width,r.height).phone,overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('main button')].filter(b=>!b.closest('dialog')&&b.checkVisibility()&&!b.disabled&&!b.closest('[data-box-scroll]')).map(b=>{const q=b.getBoundingClientRect();return {name:b.getAttribute('aria-label')||b.innerText,x:q.x,y:q.y,w:q.width,h:q.height,right:q.right,bottom:q.bottom}})}}''')
        assert not g['overflow']
        for b in g['controls']:assert b['w']>=43.9 and b['h']>=43.9 and b['x']>=-1 and b['right']<=w+1 and b['y']>=-1 and b['bottom']<=h+1,b
        page.screenshot(path=str(out/f'diy-{w}x{h}.png'));matrix.append({'viewport':[w,h],**g})
    passed('Six DIY sizes keep 44px controls in bounds without horizontal overflow')
    for reward in ['cinnamon-tassel','silver-flower-bead']:
        # Each rare item is earned through normal input in a fresh independent player.
        isolated=browser.new_context(viewport={'width':390,'height':844},has_touch=True)
        q=isolated.new_page();q.on('pageerror',lambda e:errors.append(str(e)))
        q.goto('http://127.0.0.1:5114/?studio=1',wait_until='networkidle')
        expect(q.locator('[data-tabletop]')).to_have_attribute('data-ready','true',timeout=45000)
        q.get_by_role('button',name='All beads and categories',exact=True).tap()
        choice=q.locator('[data-dialog="collection"] [data-unlock-id="'+reward+'"]');choice.scroll_into_view_if_needed();choice.tap()
        q.get_by_role('button',name='Start',exact=True).tap()
        ts=q.locator('[data-tile]');ns=ts.evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("aria-label").split(", bead ")[0])')
        for n in dict.fromkeys(ns):
            for i,v in enumerate(ns):
                if v==n:ts.nth(i).tap()
        expect(q.locator('[data-dialog="match"]')).to_have_attribute('data-granted','true')
        q.get_by_role('button',name='Use bead',exact=True).tap()
        expect(q.locator('[data-tabletop]')).to_have_attribute('data-held',reward)
        q.get_by_role('button',name='Thread held bead',exact=True).tap()
        expect(q.locator('[data-tabletop]')).to_have_attribute('data-ids',reward)
        q.reload(wait_until='networkidle');expect(q.locator('[data-tabletop]')).to_have_attribute('data-ready','true')
        expect(q.locator('[data-tabletop]')).to_have_attribute('data-ids',reward)
        isolated.close()
    passed('Both remaining craft rewards are earned by six real pairs, placed and retained on reload in isolated players')
    assert not errors,errors
    assert all(hashlib.sha256((app/name).read_bytes()).hexdigest()==sha for name,sha in hashes.items()),'Source changed during audit'
    (out/'audit.json').write_text(json.dumps({'tested_at':datetime.now(timezone.utc).isoformat(),'checks':checks,'errors':errors,'engine':engine,'browser':browser.version,'source_sha256':hashes,'pixels':pixels,'matrix':matrix,'physical_iphone':False,'native_share_sheet':False},indent=2)+'\n')
    browser.close()
