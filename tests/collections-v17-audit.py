"""V17 real-input six-family, style-stamp, home preservation and mobile audit."""
import argparse, hashlib, json
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--webkit',action='store_true');parser.add_argument('--out',type=Path,help='Versioned evidence root; preserve previous reports');args=parser.parse_args()
app=Path(__file__).resolve().parents[1];engine='webkit' if args.webkit else 'chromium';out=(args.out or app/'evidence'/'collections-v17')/engine;out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def passed(name): checks.append(name);print(json.dumps({'passed':name,'engine':engine}),flush=True)
with sync_playwright() as p:
    browser=getattr(p,engine).launch(headless=True)
    c=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
    page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if '127.0.0.1' in r.url and r.status>=400 else None)
    page.goto('http://127.0.0.1:5114/',wait_until='networkidle');shell=page.locator('[data-tabletop]');expect(shell).to_have_attribute('data-ready','true',timeout=45000)
    expect(shell).to_have_attribute('data-state','home')
    assert page.evaluate('localStorage.getItem("lucky-link.collection.v1")') is None
    assert page.locator('[data-home-bead]').count()==14
    page.screenshot(path=str(out/'home.png'))
    families=page.evaluate('async()=>{const {FAMILIES}=await import("/src/collection-catalog.js");return FAMILIES}')
    for f in families:page.get_by_role('button',name=f['name']+' collection',exact=True).tap()
    assert page.evaluate('localStorage.getItem("lucky-link.collection.v1")') is None
    page.get_by_role('button',name='Bloom collection',exact=True).tap()
    page.get_by_role('button',name='Make yours').tap();expect(shell).to_have_attribute('data-count','0')
    passed('Home has fourteen independent bead controls; six previews never write the draft')
    def tap(name):page.get_by_role('button',name=name,exact=True).tap()
    def add_id(id):
        tap('All beads and categories');target=page.locator('[data-dialog="collection"] [data-material-id="'+id+'"]');target.scroll_into_view_if_needed();target.tap()
    def clear():
        tap('Threading order and settings');tap('Clear chain')
    sample_ids=['jelly-heart-pink','pearl-heart','sea-cowrie','chrome-bow','malachite-barrel','enamel-blossom']
    for id in sample_ids:
        add_id(id)
        index=shell.get_attribute('data-count');before=shell.get_attribute('data-ids')
        # Native touch must open the editor without clicking through to its actions.
        slot=page.locator('[data-cord-index="'+str(int(index)-1)+'"]');slot.tap()
        expect(page.locator('[data-dialog="piece"]')).to_be_visible()
        tap('Return to box');expect(shell).to_have_attribute('data-box-count','1')
        tap('Undo last change');expect(shell).to_have_attribute('data-ids',before);expect(shell).to_have_attribute('data-box-count','0')
    expect(shell).to_have_attribute('data-count','6');page.screenshot(path=str(out/'six-families-diy.png'))
    before=shell.get_attribute('data-ids');page.reload(wait_until='networkidle');expect(shell).to_have_attribute('data-ready','true');expect(shell).to_have_attribute('data-ids',before)
    tap('Make yours')
    tap('Finish');tap('Make card');page.get_by_label('A little note').fill('Six little treasures.');tap('Create card')
    expect(page.locator('[data-dialog="card"]')).to_have_attribute('data-card-ids',before)
    with page.expect_download() as dl:page.get_by_role('link',name='Save image',exact=True).click()
    dl.value.save_as(out/'six-families-card.png')
    passed('Each new family: actual add, return, undo, reload and real PNG export')
    tap('Close your card');tap('Edit your chain');clear()
    for f in families:
        tap('Choose a style challenge');page.locator('[data-style-choice="'+f['id']+'"]').tap()
        expect(page.locator('[data-style-rules] p')).to_have_count(3)
        tap('Back to your chain')
        # Keep the selected challenge but show all materials for cross-family companions.
        tap(f['name']+' collection')
        for id in f['solution']:add_id(id)
        tap('Finish');expect(shell).to_have_attribute('data-state','finished')
        stamps=page.evaluate('JSON.parse(localStorage.getItem("lucky-link.style-book.v1")).stamps')
        assert f['id'] in stamps
        collection=page.evaluate('JSON.parse(localStorage.getItem("lucky-link.collection.v1"))')
        assert collection['unlocked']==[] and collection['lastRewardDay']==''
        tap('Edit your chain');clear()
    passed('All six starter-solvable style challenges complete via real input without extra unlock rewards')
    tap('Choose a style challenge');tap('Free DIY')
    for id in sample_ids:add_id(id)
    before=shell.get_attribute('data-ids');tap('Back to home');page.reload(wait_until='networkidle');expect(shell).to_have_attribute('data-ready','true');tap('Make yours');expect(shell).to_have_attribute('data-ids',before)
    tap('Choose a style challenge');assert page.locator('[data-stamp]').all_text_contents()==['✓']*6;tap('Back to your chain')
    passed('Home return preserves the real design; six earned style stamps persist')
    # Inspect actual decoded pixels, not just atlas filenames or source IDs.
    pixel_check=page.evaluate('''async()=>{const {loadTabletopArt}=await import('/src/tabletop-art.js');const {FAMILIES}=await import('/src/collection-catalog.js');const art=await loadTabletopArt();return FAMILIES.flatMap(f=>f.ids.map(id=>{const c=art.sprites.get(id),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0,clear=0;for(let i=3;i<p.length;i+=4){if(p[i]>128)ink++;if(p[i]===0)clear++;}return{id,w:c.width,h:c.height,ink,clear}}))}''')
    assert len(pixel_check)==42 and all(x['ink']>100 and x['clear']>100 for x in pixel_check)
    passed('All 42 independent sprites contain actual visible pixels and transparent surroundings')
    matrix=[]
    for w,h in [(320,568),(390,844),(402,874),(844,390),(568,320),(1440,1000)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150)
        geometry=page.locator('main').evaluate('''root=>({overflow:document.documentElement.scrollWidth>innerWidth,controls:[...root.querySelectorAll('button')].filter(n=>!n.closest('dialog')&&n.checkVisibility()&&!n.disabled).map(n=>{const r=n.getBoundingClientRect();return{label:n.getAttribute('aria-label')||n.innerText,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,clipped:!!n.closest('[data-box-scroll]')}})})''')
        assert not geometry['overflow']
        for b in geometry['controls']:
            assert b['w']>=43.9 and b['h']>=43.9,b
            if not b['clipped']:assert b['x']>=-1 and b['right']<=w+1 and b['y']>=-1 and b['bottom']<=h+1,b
        page.screenshot(path=str(out/f'diy-{w}x{h}.png'));matrix.append({'size':[w,h],'geometry':geometry})
    passed('Six viewport sizes: touch targets >=44px, usable controls in bounds, no horizontal overflow')
    assert not errors,errors
    (out/'audit.json').write_text(json.dumps({'tested_at':datetime.now(timezone.utc).isoformat(),'engine':engine,'browser':browser.version,'checks':checks,'errors':errors,'matrix':matrix,'sprite_pixels':pixel_check,'physical_iphone':False,'native_share_sheet':False,'asset_sha256':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((app/'public/assets').glob('*v17.png'))}},indent=2)+'\n')
    browser.close()
