"""V14 collection, real matching, PNG export and isolated failure fixtures."""
import argparse
import hashlib
import json
import struct
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--webkit',action='store_true')
parser.add_argument('--quick',action='store_true',help='Skip the real 45-second timeout and failure fixtures')
parser.add_argument('--out',type=Path,help='Versioned evidence root; preserve prior reports')
args=parser.parse_args()
app=Path(__file__).resolve().parents[1]
engine='webkit' if args.webkit else 'chromium'
out=(args.out or app/'evidence'/'collection-v14')/engine
out.mkdir(parents=True,exist_ok=True)
checks=[]
source_hashes={str(f.relative_to(app)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((app/'src').glob('*')) if f.is_file()}
def passed(name):
    checks.append(name)
    print(json.dumps({'passed':name,'engine':engine}),flush=True)

with sync_playwright() as p:
    browser=getattr(p,engine).launch(headless=True)
    errors=[]
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,accept_downloads=True)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if '127.0.0.1' in r.url and r.status>=400 else None)
    page.goto('http://127.0.0.1:5114/?studio=1',wait_until='networkidle')
    shell=page.locator('[data-tabletop]')
    expect(shell).to_have_attribute('data-ready','true',timeout=45000)
    expect(shell).to_have_attribute('data-mode','free')
    expect(shell).to_have_attribute('data-collected','29')
    page.screenshot(path=str(out/'worktable.png'))
    # Reconnaissance: the selectors below refer to this rendered app, not injected state.
    (out/'initial-buttons.json').write_text(json.dumps(page.get_by_role('button').evaluate_all('(nodes)=>nodes.map(n=>({label:n.getAttribute("aria-label"),text:n.textContent}))'),indent=2))
    def tap(name):page.get_by_role('button',name=name,exact=True).tap()
    def add(name):
        button=page.get_by_role('button',name='Pick '+name,exact=True)
        button.scroll_into_view_if_needed();button.tap();tap('Thread held bead')
    for name in ['Aqua drop','Cloud pearl','Rose prism']:add(name)
    expect(shell).to_have_attribute('data-count','3')
    expect(shell).to_have_attribute('data-music','playing')
    expect(shell).to_have_attribute('data-last-sound','thread')
    passed('Free DIY actual touch placement and audio')
    source=page.get_by_role('button',name='Pick Blue star',exact=True)
    source.scroll_into_view_if_needed()
    src=source.bounding_box();target=page.locator('[data-cord-index="0"]').bounding_box()
    page.mouse.move(src['x']+src['width']/2,src['y']+src['height']/2);page.mouse.down()
    page.mouse.move(src['x']-15,src['y']+src['height']/2,steps=8)
    page.mouse.move(target['x']+22,target['y']+22,steps=20);page.mouse.up()
    expect(shell).to_have_attribute('data-count','4')
    original=shell.get_attribute('data-ids')
    passed('Original drag insertion preserved')
    tap('All beads and categories')
    expect(page.locator('[data-dialog="collection"] [data-unlock-id]')).to_have_count(30)
    expect(page.get_by_role('button',name='Add Sea-glass star',exact=True)).to_have_count(0)
    page.screenshot(path=str(out/'collection.png'))
    page.locator('[data-dialog="collection"]').get_by_role('button',name='Unlock Sea-glass star',exact=True).tap()
    game=page.locator('[data-dialog="match"]')
    expect(game).to_have_attribute('data-game-state','ready')
    expect(game.locator('[data-prize-rule]')).to_contain_text('Match to unlock')
    page.wait_for_timeout(600)
    expect(game).to_have_attribute('data-game-state','ready')
    tap('Start')
    def tiles():return game.locator('[data-tile]')
    names=tiles().evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("aria-label").split(", bead ")[0])')
    tiles().nth(0).tap();tiles().nth(0).tap()
    expect(game.locator('[data-match-count]')).to_have_text('0 / 6 pairs')
    mismatch=next(i for i,n in enumerate(names) if n!=names[0])
    tiles().nth(mismatch).tap()
    expect(game.locator('[data-match-feedback]')).to_contain_text('Try another pair')
    passed('Locked bead routes to real game; self-pair and mismatch never score')
    page.screenshot(path=str(out/'matching.png'))
    def solve():
        current=tiles().evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("aria-label").split(", bead ")[0])')
        for name in dict.fromkeys(current):
            for index,value in enumerate(current):
                if value==name:tiles().nth(index).tap()
    solve()
    expect(game).to_have_attribute('data-game-state','won')
    expect(game).to_have_attribute('data-granted','true')
    expect(shell).to_have_attribute('data-collected','30')
    expect(shell).to_have_attribute('data-ids',original)
    page.wait_for_timeout(1000)
    page.screenshot(path=str(out/'unlocked.png'))
    tap('Use bead')
    expect(shell).to_have_attribute('data-held','sea-star')
    expect(shell).to_have_attribute('data-count','4')
    tap('Thread held bead')
    expect(shell).to_have_attribute('data-count','5')
    original=shell.get_attribute('data-ids')
    passed('Six actual pairs unlock once; reward is picked, not silently added')
    page.reload(wait_until='networkidle');expect(shell).to_have_attribute('data-ready','true')
    expect(shell).to_have_attribute('data-collected','30');expect(shell).to_have_attribute('data-ids',original)
    tap('Unlock hidden beads')
    expect(game.locator('[data-prize-rule]')).to_contain_text('tomorrow')
    tap('Practice');solve()
    expect(game).to_have_attribute('data-granted','false');expect(shell).to_have_attribute('data-collected','30')
    tap('Return to DIY')
    passed('Reload preserves collection and chain; same-day practice does not reward')
    if not args.quick:
        tap('Unlock hidden beads');tap('Practice')
        page.wait_for_timeout(45500)
        expect(game).to_have_attribute('data-game-state','lost')
        expect(game).to_have_attribute('data-granted','false')
        tap('Try again');expect(game).to_have_attribute('data-game-state','playing')
        page.keyboard.press('Escape');expect(game).not_to_be_visible()
        expect(shell).to_have_attribute('data-ids',original)
        passed('Real 45-second expiry, immediate retry and Escape cancellation')
    tap('Finish');expect(shell).to_have_attribute('data-state','finished')
    tap('Make card')
    card=page.locator('[data-dialog="card"]')
    note='A little ocean, wherever I go.\nMade with a little luck.'
    card.get_by_label('A little note').fill(note)
    tap('Create card')
    expect(card.locator('[data-card-status]')).to_have_text('Your card is ready.')
    expect(card).to_have_attribute('data-card-ids',original)
    expect(card).to_have_attribute('data-card-note',note)
    page.screenshot(path=str(out/'card-preview.png'))
    with page.expect_download() as download:
        page.get_by_role('link',name='Save image',exact=True).click()
    download.value.save_as(out/'my-phone-chain.png')
    data=(out/'my-phone-chain.png').read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II',data[16:24])==(1080,1440)
    first_hash=hashlib.sha256(data).hexdigest()
    tap('Edit note');card.get_by_label('A little note').fill('Just mine.');tap('Create card')
    expect(card.locator('[data-card-status]')).to_have_text('Your card is ready.')
    with page.expect_download() as download:page.get_by_role('link',name='Save image',exact=True).click()
    download.value.save_as(out/'edited-note.png')
    assert hashlib.sha256((out/'edited-note.png').read_bytes()).hexdigest()!=first_hash
    tap('Close your card');tap('Edit your chain');expect(shell).to_have_attribute('data-ids',original)
    passed('Actual PNG 1080x1440, exact ordered design, Note changes pixels, edit preserves chain')
    # Existing reversible return/undo contract, no synthetic input dispatch.
    page.locator('[data-cord-index="0"]').click()
    tap('Return to box');expect(shell).to_have_attribute('data-count','4');expect(shell).to_have_attribute('data-box-count','1')
    tap('Undo last change');expect(shell).to_have_attribute('data-ids',original);expect(shell).to_have_attribute('data-box-count','0')
    passed('Placed bead return and paired undo remain correct')
    tap('Mute soundtrack');expect(shell).to_have_attribute('data-music','muted')
    count=shell.get_attribute('data-sound-count');tap('Unlock hidden beads');tap('Practice');tiles().nth(0).tap()
    page.wait_for_timeout(300);assert shell.get_attribute('data-sound-count')==count
    page.reload(wait_until='networkidle');expect(shell).to_have_attribute('data-ready','true');expect(shell).to_have_attribute('data-music','muted')
    passed('Persistent mute suppresses matching cues')
    matrix=[]
    for w,h in [(320,568),(390,844),(402,874),(844,390),(568,320),(1440,1000)]:
        page.set_viewport_size({'width':w,'height':h})
        tap('Unlock hidden beads');tap('Practice')
        geometry=game.evaluate('''d=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...d.querySelectorAll('button')].filter(n=>n.getClientRects().length&&!n.disabled).map(n=>{const r=n.getBoundingClientRect();return {label:n.getAttribute('aria-label')||n.textContent,w:r.width,h:r.height,x:r.x,right:r.right}})})''')
        assert not geometry['overflow'],geometry
        assert all(b['w']>=43.9 and b['h']>=43.9 and b['x']>=0 and b['right']<=w+1 for b in geometry['buttons']),geometry
        tap('Return to DIY');matrix.append({'viewport':[w,h],'game':geometry})
    passed('Matching controls >=44px and no horizontal overflow in six sizes')
    page.set_viewport_size({'width':390,'height':844})
    page.emulate_media(reduced_motion='reduce')
    page.get_by_role('button',name='Unlock hidden beads',exact=True).focus();page.keyboard.press('Enter')
    game.get_by_role('button',name='Practice',exact=True).focus();page.keyboard.press('Enter')
    names=tiles().evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("aria-label").split(", bead ")[0])')
    for i,n in enumerate(names):
        if n==names[0]:tiles().nth(i).focus();page.keyboard.press('Enter')
    expect(game.locator('[data-match-count]')).to_have_text('1 / 6 pairs')
    assert game.locator('.pair-matched img').first.evaluate('n=>getComputedStyle(n).animationName')=='none'
    page.keyboard.press('Escape');expect(game).not_to_be_visible()
    passed('Keyboard pair/close and reduced-motion animation suppression')
    tap('Finish');tap('Make card')
    long_note='🌸'*130
    card.get_by_label('A little note').fill(long_note)
    expect(card.locator('[data-card-count]')).to_have_text('120 / 120')
    assert card.get_by_label('A little note').input_value()=='🌸'*120
    card.get_by_label('A little note').fill('<img src=x onerror=alert(1)>\nJust mine.')
    expect(card.locator('textarea img')).to_have_count(0)
    card.get_by_label('A little note').fill('🌸'*120)
    tap('Create card');expect(card.locator('[data-card-status]')).to_have_text('Your card is ready.')
    expect(card).to_have_attribute('data-card-note','🌸'*120)
    for w,h in [(320,568),(390,844),(844,390),(568,320)]:
        page.set_viewport_size({'width':w,'height':h})
        for role,name in [('link','Save image'),('button','Edit note'),('button','Close your card')]:
            target=card.get_by_role(role,name=name,exact=True);target.scroll_into_view_if_needed();r=target.bounding_box()
            assert r and r['width']>=44 and r['height']>=44 and r['x']>=0 and r['x']+r['width']<=w+1 and r['y']>=0 and r['y']+r['height']<=h+1,r
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    tap('Close your card')
    passed('Unicode Note capped at 120; artwork and card controls fit four mobile sizes')
    context.close()
    if not args.quick:
        # Explicit API fixtures only verify rejection paths, not a native OS share sheet.
        for mode in ['cancel','failure','unsupported','image-failure','storage-failure']:
            c=browser.new_context(viewport={'width':390,'height':844},has_touch=True,accept_downloads=True)
            if mode in ['cancel','failure']:
                c.add_init_script(f"Object.defineProperty(navigator,'canShare',{{value:()=>true}});Object.defineProperty(navigator,'share',{{value:()=>Promise.reject(new DOMException('fixture','{'AbortError' if mode=='cancel' else 'NotAllowedError'}'))}});")
            if mode=='unsupported':c.add_init_script("Object.defineProperty(navigator,'share',{value:undefined});")
            if mode=='image-failure':c.add_init_script("HTMLCanvasElement.prototype.toBlob=function(cb){cb(null)};")
            if mode=='storage-failure':c.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('fixture','QuotaExceededError')};")
            q=c.new_page();q.goto('http://127.0.0.1:5114/?studio=1',wait_until='networkidle');expect(q.locator('[data-ready]')).to_have_attribute('data-ready','true')
            downloads=[];q.on('download',lambda d:downloads.append(d.suggested_filename))
            for name in ['Aqua drop','Cloud pearl','Rose prism']:
                q.get_by_role('button',name='Pick '+name,exact=True).tap();q.get_by_role('button',name='Thread held bead',exact=True).tap()
            if mode=='storage-failure':expect(q.locator('[data-tabletop]')).to_have_attribute('data-storage','session')
            q.get_by_role('button',name='Finish',exact=True).tap();q.get_by_role('button',name='Make card',exact=True).tap();q.get_by_role('button',name='Create card',exact=True).tap()
            if mode=='image-failure':
                expect(q.locator('[data-card-status]')).to_contain_text('could not be made');expect(q.locator('[data-card-result]')).not_to_be_visible()
            else:
                expect(q.locator('[data-card-status]')).to_have_text('Your card is ready.')
                if mode in ['cancel','failure']:
                    q.get_by_role('button',name='Share card',exact=True).tap()
                    expect(q.locator('[data-card-status]')).to_contain_text('Not shared' if mode=='cancel' else 'Sharing is unavailable')
                    assert not downloads,'Rejected share must not auto-download'
                if mode=='unsupported':expect(q.locator('[data-share-card]')).not_to_be_visible();expect(q.get_by_role('link',name='Save image')).to_be_visible()
            c.close();passed('Isolated '+mode+' fixture')
    assert not errors,errors
    assert all(hashlib.sha256((app/name).read_bytes()).hexdigest()==sha for name,sha in source_hashes.items()),'Runtime source changed during audit'
    (out/('quick-audit.json' if args.quick else 'audit.json')).write_text(json.dumps({'tested_at':datetime.now(timezone.utc).isoformat(),'engine':engine,'browser':browser.version,'checks':checks,'errors':errors,'matrix':matrix,'physical_iphone':False,'native_share_sheet':False,'png_sha256':first_hash,'source_sha256':source_hashes},indent=2)+'\n')
    browser.close()
print(json.dumps({'checks':len(checks),'passed':True,'out':str(out)}))
