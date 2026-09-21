"""Accept two continuous no-text gravity levels in an emulated iPhone browser."""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', choices=('chromium', 'webkit'), default='chromium')
parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parents[1] / 'evidence' / 'gravity-v21-acceptance')
parser.add_argument('--url', default='http://127.0.0.1:5114/?studio=1')


def assert_no_visible_words(game):
    visible_words = game.locator('h2,h3,p,small,strong,button').evaluate_all(
        """nodes => nodes.filter(node => node.getClientRects().length
          && !node.closest('.visually-hidden,.gravity-points,.chain-label')
          && /[A-Za-z\u3400-\u9fff]/.test(node.innerText)).map(node => node.innerText.trim())"""
    )
    assert not visible_words, visible_words


def play_level(page, game, level_index, out_dir):
    reward_id = game.get_attribute('data-reward-id')
    before_count = int(page.locator('[data-tabletop]').get_attribute('data-collected'))
    page.get_by_role('button', name='Play', exact=True).tap()
    expect(game).to_have_attribute('data-game-state', 'playing')
    assert_no_visible_words(game)

    layer_metrics = game.evaluate("""game => {
      const base=game.querySelector('.gravity-art-base img'),hud=game.querySelector('.gravity-art-hud img');
      const back=game.querySelector('[data-match-back]').getBoundingClientRect();
      const sound=game.querySelector('[data-match-sound]').getBoundingClientRect();
      return {
        base:{width:base.naturalWidth,height:base.naturalHeight,currentSrc:base.currentSrc,pointerEvents:getComputedStyle(base.closest('picture')).pointerEvents,zIndex:getComputedStyle(base.closest('picture')).zIndex},
        hud:{width:hud.naturalWidth,height:hud.naturalHeight,currentSrc:hud.currentSrc,pointerEvents:getComputedStyle(hud.closest('picture')).pointerEvents,zIndex:getComputedStyle(hud.closest('picture')).zIndex,display:getComputedStyle(hud.closest('picture')).display},
        hotspots:{back:[back.width,back.height],sound:[sound.width,sound.height]}
      };
    }""")
    for layer in ('base', 'hud'):
        assert layer_metrics[layer]['width'] == 941, layer_metrics
        assert layer_metrics[layer]['height'] == 1672, layer_metrics
        assert layer_metrics[layer]['currentSrc'].endswith('.webp'), layer_metrics
        assert layer_metrics[layer]['pointerEvents'] == 'none', layer_metrics
    assert layer_metrics['hud']['display'] == 'block', layer_metrics
    assert int(layer_metrics['base']['zIndex']) < int(layer_metrics['hud']['zIndex']), layer_metrics
    assert min(layer_metrics['hotspots']['back'] + layer_metrics['hotspots']['sound']) >= 44, layer_metrics

    field = game.locator('[data-gravity-field]')
    expect(field).to_be_visible()
    page.wait_for_timeout(3400)
    box = field.bounding_box()
    opening_metrics = field.evaluate(
        """field=>{const canvas=field.querySelector('[data-gravity-seed-canvas]'),context=canvas.getContext('2d'),{data,width,height}=context.getImageData(0,0,canvas.width,canvas.height);let top=height,bottom=0,occupiedPixels=0;const bands=Array(10).fill(0);
        for(let y=0;y<height;y+=2)for(let x=0;x<width;x+=2){if(data[(y*width+x)*4+3]<18)continue;top=Math.min(top,y);bottom=Math.max(bottom,y);occupiedPixels++;bands[Math.min(9,Math.floor(y/height*10))]++;}
        const coverage=(bottom-top)/height,f=field.getBoundingClientRect();return {coverage,viewportCoverage:coverage*f.height/innerHeight,bands,areaRatio:occupiedPixels/(Math.ceil(width/2)*Math.ceil(height/2))};}""")
    assert .94 <= opening_metrics['coverage'] <= 1.02, opening_metrics
    assert .78 <= opening_metrics['viewportCoverage'] <= .86, opening_metrics
    assert all(count >= 2 for count in opening_metrics['bands'][1:]), opening_metrics
    assert opening_metrics['areaRatio'] >= .39, opening_metrics
    if level_index == 1:
        browser_name = page.context.browser.browser_type.name
        page.screenshot(path=str(out_dir / f'00-settled-pile-four-fifths-{browser_name}.png'), full_page=True)
    frame_metrics = page.evaluate("""() => new Promise(resolve => {const samples=[];let previous=performance.now();
      const tick=now=>{samples.push(now-previous);previous=now;if(samples.length<120)requestAnimationFrame(tick);else{const sorted=samples.slice(5).sort((a,b)=>a-b);resolve({mean:sorted.reduce((a,b)=>a+b,0)/sorted.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)});}};requestAnimationFrame(tick);})""")
    lane_order = {}
    lane_positions = (.09, .255, .42, .58, .745, .91)
    expected_seed_count = 60
    expect(field).to_have_attribute('data-piece-count', str(expected_seed_count))
    expect(field).to_have_attribute('data-seeded-count', str(expected_seed_count))
    expect(game.locator('.gravity-piece')).to_have_count(0)
    expect(game.locator('.gravity-piece-depth')).to_have_count(0)
    expect(game.locator('.gravity-piece-face')).to_have_count(0)
    expect(game.locator('.gravity-piece-glint')).to_have_count(0)
    target_score = int(game.locator('[data-gravity-point-target]').text_content())
    expect(game.locator('[data-gravity-remaining]')).to_have_text(str(target_score))
    expect(game.locator('[data-gravity-earned]')).to_have_text('0')
    drops = 0
    saw_clear = False
    clear_capture = False
    while game.get_attribute('data-game-state') == 'playing' and drops < 78:
        preview = game.locator('[data-gravity-next] img').first
        material = preview.get_attribute('data-material')
        current = game.locator(f'.gravity-piece[data-material="{material}"]')
        if material not in lane_order:
            lane_order[material] = lane_positions[len(lane_order) % len(lane_positions)]
        ratio = lane_order[material]
        if current.count():
            centers = current.evaluate_all(
                "(nodes, box) => nodes.map(node => { const rect=node.getBoundingClientRect(); return (rect.x+rect.width/2-box.x)/box.width; })",
                box,
            )
            if centers:
                ratio = max(.075, min(.925, sum(centers) / len(centers)))
        page.touchscreen.tap(box['x'] + box['width'] * ratio, box['y'] + 42)
        page.wait_for_timeout(410)
        drops += 1
        saw_clear = saw_clear or int(game.locator('[data-gravity-cleared]').text_content() or '0') >= 3
        if not clear_capture and game.locator('.gravity-wave').count():
            page.screenshot(path=str(out_dir / f'{level_index:02d}-clear-wave-chromium.png'), full_page=True)
            clear_capture = True
        if saw_clear:
            assert int(game.locator('[data-gravity-remaining]').text_content()) < target_score

    expect(game).to_have_attribute('data-game-state', 'won', timeout=6000)
    expect(game).to_have_attribute('data-granted', 'true')
    page.wait_for_timeout(300)
    assert saw_clear
    assert_no_visible_words(game)
    expect(game.locator('.reveal-aura')).to_be_visible()
    assert game.locator('.reveal-prize img').evaluate("node => getComputedStyle(node).animationName.includes('reward-orbit')")
    expect(game.get_by_role('button', name='Use charm')).to_be_visible()

    after_count = int(page.locator('[data-tabletop]').get_attribute('data-collected'))
    assert after_count == before_count + 1, (before_count, after_count)
    stored = page.evaluate("JSON.parse(localStorage.getItem('lucky-link.collection.v1'))")
    assert reward_id in stored['unlocked']
    screenshot = out_dir / f'{level_index:02d}-{reward_id}-{page.context.browser.browser_type.name}-reveal.png'
    page.screenshot(path=str(screenshot), full_page=True)
    return {
        'rewardId': reward_id,
        'drops': drops,
        'collectedBefore': before_count,
        'collectedAfter': after_count,
        'screenshot': screenshot.name,
        'screenshotSha256': hashlib.sha256(screenshot.read_bytes()).hexdigest(),
        'revealSound': page.locator('[data-tabletop]').get_attribute('data-last-sound'),
        'openingCoverage': opening_metrics['coverage'],
        'openingViewportCoverage': opening_metrics['viewportCoverage'],
        'openingBands': opening_metrics['bands'],
        'openingAreaRatio': opening_metrics['areaRatio'],
        'frameTimeMs': frame_metrics,
        'clearEffectCaptured': clear_capture,
        'runtimeLayers': layer_metrics,
    }


def run(args):
    args.out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = getattr(playwright, args.browser).launch(headless=True)
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=1,
            is_mobile=True,
            has_touch=True,
        )
        context.add_init_script("""
          try { localStorage.clear(); } catch {}
          let seed = 2147483646;
          Math.random = () => ((seed = seed * 48271 % 2147483647) - 1) / 2147483646;
        """)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.goto(args.url, wait_until='networkidle')
        shell = page.locator('[data-tabletop]')
        expect(shell).to_have_attribute('data-ready', 'true', timeout=45000)
        page.evaluate("""window.v27SoundEvents=[];new MutationObserver(()=>{const value=document.querySelector('[data-tabletop]')?.dataset.lastSound;if(value)window.v27SoundEvents.push(value);}).observe(document.querySelector('[data-tabletop]'),{attributes:true,attributeFilter:['data-sound-count']});""")
        page.get_by_role('button', name='Unlock hidden beads', exact=True).tap()
        game = page.locator('[data-dialog="match"]')
        expect(game).to_have_attribute('data-game-state', 'ready')
        assert_no_visible_words(game)

        first = play_level(page, game, 1, args.out)
        assert first['revealSound'] == 'reward'
        first_sound_count = int(shell.get_attribute('data-sound-count') or '0')
        assert first_sound_count > 0

        page.get_by_role('button', name='Next challenge', exact=True).tap()
        expect(game).to_have_attribute('data-game-state', 'ready')
        assert game.get_attribute('data-reward-id') != first['rewardId']
        second = play_level(page, game, 2, args.out)
        assert second['rewardId'] != first['rewardId']
        assert second['revealSound'] == 'reward'

        page.get_by_role('button', name='Use charm', exact=True).tap()
        expect(game).not_to_be_visible()
        expect(shell).to_have_attribute('data-held', second['rewardId'])
        page.get_by_role('button', name='Thread held bead', exact=True).tap()
        expect(shell).to_have_attribute('data-held', '')
        expect(shell).to_have_attribute('data-ids', second['rewardId'])

        stored = page.evaluate("JSON.parse(localStorage.getItem('lucky-link.collection.v1'))")
        assert stored['version'] == 2
        assert stored['unlocked'][:2] == [first['rewardId'], second['rewardId']]
        sound_events=page.evaluate('window.v27SoundEvents')
        for event in ['impact','match','reward']:
            assert event in sound_events,(event,sound_events)
        assert not errors, errors
        result = {
            'browser': args.browser,
            'viewport': '390x844',
            'visibleGameplayWords': 0,
            'levels': [first, second],
            'continuousUniqueUnlocks': 2,
            'returnedToDIYAndThreadedItem': second['rewardId'],
            'soundEvents': int(shell.get_attribute('data-sound-count') or '0'),
            'soundEventTypes': sorted(set(sound_events)),
            'lastSound': shell.get_attribute('data-last-sound'),
            'runtimeErrors': errors,
        }
        browser.close()
    report = args.out / f'{args.browser}.json'
    report.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return report


if __name__ == '__main__':
    options = parser.parse_args()
    print(run(options))
