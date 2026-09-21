"""Exercise the current drop flow and measure reward controls across viewport sizes."""
import argparse
import json
import time
from pathlib import Path
from playwright.sync_api import Error, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--label', default='after')
parser.add_argument('--engine', default='chromium', choices=['chromium', 'webkit'])
parser.add_argument('--url', default='http://127.0.0.1:5114/')
parser.add_argument('--out', help='Explicit evidence directory; keeps earlier runs unchanged')
args = parser.parse_args()
out = Path(args.out) if args.out else Path(__file__).resolve().parents[1] / 'evidence' / 'project-review-v41' / args.label / args.engine
out.mkdir(parents=True, exist_ok=True)
errors, warnings, resource_errors = [], [], []
transition_races = []

def drop(field, game, position):
    try:
        field.click(position=position, force=True)
    except Error as error:
        # Physics can finish a pending match between the loop's state read and
        # this click. Only a verified win may hide the tray without failing QA.
        if game.get_attribute('data-game-state') != 'won':
            raise
        transition_races.append(str(error))

def layout(page):
    return page.evaluate("""() => {
      const rect = node => { const r=node.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}; };
      const buttons=[...document.querySelectorAll('[data-dialog=match] button')].filter(n=>n.getClientRects().length);
      const reveal=document.querySelector('[data-match-end]');
      return {viewport:{width:innerWidth,height:innerHeight},
        words:[...reveal.querySelectorAll('h3,p,small,em')].filter(n=>n.getClientRects().length && /[A-Za-z\\u3400-\\u9fff]/.test(n.innerText)).map(n=>n.innerText.trim()),
        buttons:buttons.map(n=>{const r=rect(n);return {label:n.getAttribute('aria-label'),...r,enabled:!n.disabled,inViewport:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}),
        canvas:rect(document.querySelector('[data-reward-3d]')),overflow:document.documentElement.scrollWidth>innerWidth};
    }""")

with sync_playwright() as p:
    browser=getattr(p,args.engine).launch(headless=True)
    context=browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=1)
    context.add_init_script("""let seed=7413;Math.random=()=>((seed=seed*48271%2147483647)-1)/2147483646;""")
    page=context.new_page()
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: errors.append(m.text) if m.type=='error' else warnings.append(m.text) if m.type=='warning' else None)
    page.on('response',lambda r: resource_errors.append({'url':r.url,'status':r.status}) if r.url.startswith(args.url.rstrip('/')) and r.status>=400 else None)
    page.on('requestfailed',lambda r: resource_errors.append({'url':r.url,'failure':r.failure}) if r.url.startswith(args.url.rstrip('/')) else None)
    page.goto(args.url,wait_until='networkidle')
    page.locator('[data-home-hook]').wait_for(state='visible')
    page.screenshot(path=str(out/'home.png'))
    page.locator('[data-home-hook]').click()
    game=page.locator('[data-dialog=match]')
    page.locator('[data-dialog=match][data-game-state=playing]').wait_for(state='visible')
    page.screenshot(path=str(out/'game.png'))
    field=page.locator('[data-gravity-field]')
    page.evaluate("""() => { window.contactEvidence=[];const field=document.querySelector('[data-gravity-field]');new MutationObserver(()=>{window.contactEvidence.push({family:field.dataset.impactFamily,intensity:Number(field.dataset.impactIntensity),count:Number(field.dataset.impactCount)});}).observe(field,{attributes:true,attributeFilter:['data-impact-count']}); }""")
    slots={}
    deadline=time.monotonic()+65
    while game.get_attribute('data-game-state')=='playing' and time.monotonic()<deadline:
        material=page.locator('[data-gravity-next] img').first.get_attribute('data-material')
        if material not in slots: slots[material]=[42,101,160,219,278][min(len(slots),4)]
        box=field.bounding_box()
        drop(field,game,{'x':box['width']*slots[material]/320,'y':box['height']*.08})
        page.wait_for_timeout(385)
    page.locator('[data-dialog=match][data-game-state=won]').wait_for(state='visible',timeout=15000)
    page.locator('[data-reward-3d][data-motion=inspect]').wait_for(timeout=15000)
    page.wait_for_timeout(3300)
    views=[]
    for width,height in [(390,844),(320,568),(844,390),(1280,800)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(150)
        views.append(layout(page))
        page.screenshot(path=str(out/f'reward-{width}x{height}.png'))
    page.emulate_media(reduced_motion='reduce')
    page.set_viewport_size({'width':390,'height':844})
    page.locator('[data-match-again]').click()
    next_target=game.get_attribute('data-reward-id')
    next_goal=page.locator('[data-gravity-goal]').get_attribute('alt')
    slots={}
    deadline=time.monotonic()+65
    while game.get_attribute('data-game-state')=='playing' and time.monotonic()<deadline:
        material=page.locator('[data-gravity-next] img').first.get_attribute('data-material')
        if material not in slots: slots[material]=[42,101,160,219,278][min(len(slots),4)]
        box=field.bounding_box()
        drop(field,game,{'x':box['width']*slots[material]/320,'y':box['height']*.08})
        page.wait_for_timeout(385)
    page.locator('[data-dialog=match][data-game-state=won]').wait_for(state='visible',timeout=15000)
    page.locator('[data-reward-3d][data-motion=inspect]').wait_for(timeout=15000)
    page.wait_for_timeout(150)
    views.append({'reducedMotion':True,**layout(page)})
    page.screenshot(path=str(out/'reduced-motion-second-round.png'))
    stored=page.evaluate("JSON.parse(localStorage.getItem('lucky-link.collection.v1'))?.mainline")
    contacts=page.evaluate('window.contactEvidence')
    sound=page.locator('[data-match-sound]')
    sound.click()
    muted=page.locator('[data-tabletop]').get_attribute('data-music')
    page.reload(wait_until='networkidle')
    persisted=page.evaluate("JSON.parse(localStorage.getItem('lucky-link.collection.v1'))?.mainline")
    muted_after=page.locator('[data-action=sound]').get_attribute('aria-pressed')
    checks={'visibleControls':all(b['inViewport'] and b['hit'] and b['enabled'] for v in views for b in v['buttons']),
            'textFree':all(not v['words'] for v in views),
            'noOverflow':all(not v['overflow'] for v in views),
            'canvasVisible':all(v['canvas']['width']>0 and v['canvas']['height']>0 and v['canvas']['y']>=0 and v['canvas']['bottom']<=v['viewport']['height'] for v in views),
            'oneRewardPerRound':len(stored['unlocked'])==2 and len(stored['coupons'])==2,
            'nextTarget':next_target=='ice-module-tulip-drop' and next_goal!='Unlock 冰晶星愿',
            'persistent':stored==persisted,'mutePersists':muted_after=='true',
            'noRuntimeErrors':not errors,'noResourceErrors':not resource_errors}
    result={'engine':args.engine,'views':views,'stored':stored,'nextTarget':next_target,'nextGoal':next_goal,'contacts':contacts,'persistent':stored==persisted,'muted':muted,'mutePersists':muted_after=='true','checks':checks,'errors':errors,'resourceErrors':resource_errors,'warnings':warnings,'verifiedWinTransitionRaces':transition_races}
    (out/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
    browser.close()
    if args.label!='before':
        assert all(checks.values()), f"Failed checks: {[key for key,value in checks.items() if not value]}"
