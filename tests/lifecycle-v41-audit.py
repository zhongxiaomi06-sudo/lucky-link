"""Browser integration audit for collection lifecycle, not gameplay or real GPU fidelity.

Runs in an isolated in-memory collection. Wins are controlled, the viewer is a
test double, and visibilitychange is dispatched synthetically. Actual gameplay,
GPU rendering, audio audibility, and real-device behavior require separate tests.
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--engine', choices=['chromium', 'webkit'], default='chromium')
parser.add_argument('--base-url', default='http://127.0.0.1:5114')
args = parser.parse_args()
app_root = Path(__file__).resolve().parents[1]
output = app_root / 'evidence' / 'project-review-v41' / 'lifecycle' / f'{args.engine}.json'
report = {
    'engine': args.engine,
    'viewport': {'width': 390, 'height': 844},
    'startedAt': datetime.now(timezone.utc).isoformat(),
    'baseUrl': args.base_url,
    'isolatedHarness': True,
    'collectionInMemoryOnly': True,
    'controlledWinFixture': True,
    'viewerStubbed': True,
    'syntheticVisibility': True,
    'soundStubbed': True,
    'realDevice': False,
    'checks': {},
    'pageErrors': [],
    'status': 'running',
}

with sync_playwright() as playwright:
    browser = getattr(playwright, args.engine).launch(headless=True)
    page = browser.new_page(viewport=report['viewport'])
    page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))
    try:
        page.route('**/__lifecycle-audit', lambda route: route.fulfill(
            content_type='text/html',
            body='''<!doctype html><meta charset="utf-8">
              <link rel="stylesheet" href="/src/collection.css">
              <div class="tt-app"><button data-action="sound" aria-pressed="false">Sound</button></div>'''))
        page.route('**/src/gravity-game.js*', lambda route:
            route.continue_() if 'lifecycle-original' in route.request.url else route.fulfill(
                content_type='application/javascript', body='''
                  import * as original from '/src/gravity-game.js?lifecycle-original=1';
                  export * from '/src/gravity-game.js?lifecycle-original=1';
                  export function stepGravity(round,dt){
                    if(window.__finishRequested){
                      window.__finishRequested=false;
                      return{round:{...round,status:'won',score:round.targetScore},event:'none'};
                    }
                    return original.stepGravity(round,dt);
                  }
                '''))
        page.route('**/src/reward-3d-viewer.js*', lambda route: route.fulfill(
            content_type='application/javascript', body='''
              export function mountReward3D(canvas,{onReady}){
                window.__viewerCalls={pause:0,resume:0,destroy:0};
                canvas.dataset.loaded='true';onReady();
                return{
                  pause(){window.__viewerCalls.pause++;},
                  resume(){window.__viewerCalls.resume++;},
                  destroy(){window.__viewerCalls.destroy++;delete canvas.dataset.loaded;}
                };
              }
            '''))
        page.goto(args.base_url + '/__lifecycle-audit')
        page.wait_for_load_state('networkidle')
        page.evaluate('''async()=>{
          const {createCollectionUI}=await import('/src/collection-ui.js');
          const {normalizeCollection}=await import('/src/collection-game.js');
          const {MATERIALS}=await import('/src/collection-catalog.js');
          window.__collection=normalizeCollection(null);window.__awards=0;window.__sounds=[];
          window.__art={urls:new Map(MATERIALS.map(item=>[item.id,
            'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><title>${item.id}</title><circle cx="10" cy="10" r="9" fill="skyblue"/></svg>`)
          ]))};
          window.__ui=createCollectionUI({
            shell:document.querySelector('.tt-app'),getCollection:()=>window.__collection,
            setCollection:value=>{window.__collection=value;window.__awards++;},
            getArt:()=>window.__art,beforeOpen:()=>{},
            sound:{play:(...args)=>window.__sounds.push(args),stopReveal:()=>{}}
          });
          window.__visibility=value=>{
            Object.defineProperty(document,'hidden',{value,configurable:true});
            document.dispatchEvent(new Event('visibilitychange'));
          };
          const field=document.querySelector('[data-gravity-field]');
          field.addEventListener('keydown',event=>{
            if(event.key===' ')window.__keyboardDropCount=Number(field.dataset.pieceCount);
          });
          window.__ui.openAndStart();
        }''')
        dialog = page.locator('[data-dialog=match]')
        field = page.locator('[data-gravity-field]')
        page.wait_for_timeout(400)
        initial_count = int(field.get_attribute('data-piece-count'))
        field.press('ArrowRight')
        field.press('Space')
        assert page.evaluate('window.__keyboardDropCount') == initial_count + 1
        report['checks']['keyboardDropAddedPiece'] = True

        page.evaluate('window.__finishRequested=true')
        page.wait_for_function("document.querySelector('[data-dialog=match]').dataset.gameState==='resolving'")
        page.evaluate("document.querySelector('dialog').close()")
        page.wait_for_timeout(900)
        assert page.evaluate('window.__awards') == 0
        assert dialog.get_attribute('data-game-state') == 'closed'
        report['checks']['abandonedRoundAwards'] = 0

        page.evaluate('window.__ui.openAndStart()')
        page.wait_for_timeout(800)
        assert dialog.get_attribute('data-game-state') == 'playing'
        page.evaluate('window.__finishRequested=true')
        page.wait_for_function("document.querySelector('[data-dialog=match]').dataset.gameState==='won'")
        assert page.evaluate('window.__awards') == 1
        assert page.locator('[data-match-again]').is_disabled()
        page.evaluate("document.querySelector('[data-match-again]').click()")
        assert dialog.get_attribute('data-game-state') == 'won'
        report['checks']['normalRoundAwards'] = 1
        report['checks']['actionsBlockedBeforeReveal'] = True

        page.wait_for_timeout(700)
        page.evaluate('window.__visibility(true)')
        page.wait_for_timeout(3900)
        assert page.locator('[data-reward-3d]').get_attribute('data-loaded') == 'true'
        assert page.evaluate('window.__viewerCalls.pause') == 1
        assert page.evaluate('window.__viewerCalls.destroy') == 0
        assert page.locator('[data-match-again]').is_disabled()
        page.evaluate('window.__visibility(false)')
        page.wait_for_function("!document.querySelector('[data-match-again]').disabled")
        assert page.locator('[data-reward-3d]').get_attribute('data-loaded') == 'true'
        assert page.evaluate('window.__viewerCalls.resume') == 1
        report['checks']['backgroundCalledPauseAndResumeWithoutDestroy'] = True

        first_reward = dialog.get_attribute('data-reward-id')
        first_alt = page.locator('[data-gravity-goal]').get_attribute('alt')
        assert first_reward == 'ice-module-star-drop'
        assert first_alt == 'Unlock 冰晶星愿'
        assert page.evaluate("document.querySelector('[data-gravity-goal]').getAttribute('src')===window.__art.urls.get('ice-module-star-drop')")
        page.evaluate("document.querySelector('[data-match-again]').click()")
        second_reward = dialog.get_attribute('data-reward-id')
        second_alt = page.locator('[data-gravity-goal]').get_attribute('alt')
        assert dialog.get_attribute('data-game-state') == 'playing'
        assert second_reward == 'ice-module-tulip-drop'
        assert second_alt == 'Unlock 冰露郁金香'
        assert page.evaluate("document.querySelector('[data-gravity-goal]').getAttribute('src')===window.__art.urls.get('ice-module-tulip-drop')")
        report['checks']['nextRewardUpdated'] = [first_reward, second_reward]
        report['checks']['nextGoalAltUpdated'] = [first_alt, second_alt]
        report['checks']['nextGoalArtMatchesReward'] = True
        assert not report['pageErrors'], report['pageErrors']
        report['status'] = 'passed'
    except Exception as error:
        report['status'] = 'failed'
        report['failure'] = repr(error)
        raise
    finally:
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'status':report['status'], 'engine':args.engine, 'report':str(output)},ensure_ascii=False))
        browser.close()
