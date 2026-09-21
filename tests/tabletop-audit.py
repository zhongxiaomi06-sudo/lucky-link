"""Native, isolated browser checks for the 2D worktable. Does not touch Owner storage."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--webkit', action='store_true')
parser.add_argument('--smoke', action='store_true')
args = parser.parse_args()
out = Path(__file__).resolve().parents[1] / 'evidence' / 'tabletop-v12'
out.mkdir(parents=True, exist_ok=True)
engine = 'webkit' if args.webkit else 'chromium'

with sync_playwright() as pw:
    browser = getattr(pw, engine).launch(headless=True)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True)
    page = context.new_page()
    errors, console, failed, requests = [], [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: console.append(message.text) if message.type == 'error' else None)
    page.on('requestfailed', lambda request: failed.append(request.url) if request.url.startswith('http://127.0.0.1:5114/') else None)
    page.on('request', lambda request: requests.append(request.url))
    page.goto('http://127.0.0.1:5114/', wait_until='networkidle')
    page.wait_for_selector('[data-ready="true"]', timeout=20000)
    shell = page.locator('[data-tabletop]')
    page.screenshot(path=str(out / f'{engine}-empty.png'))
    for name in ['Aqua drop', 'Cloud pearl', 'Rose prism']:
        page.get_by_role('button', name=f'Pick {name}', exact=True).tap()
        page.get_by_role('button', name='Thread held bead', exact=True).tap()
    assert shell.get_attribute('data-ids') == 'aqua-drop,pearl,rose-prism'
    assert shell.get_attribute('data-count') == '3'
    page.screenshot(path=str(out / f'{engine}-making.png'))
    page.get_by_role('button', name='Show Mia', exact=True).click()
    assert shell.get_attribute('data-state') == 'finished'
    assert shell.get_attribute('data-ids') == 'aqua-drop,pearl,rose-prism'
    page.screenshot(path=str(out / f'{engine}-finished.png'))
    page.wait_for_function("Number(document.querySelector('[data-tabletop]').dataset.soundCount) >= 6")
    initial_audio = {'soundEvents': int(shell.get_attribute('data-sound-count')), 'music': shell.get_attribute('data-music')}
    assert initial_audio['music'] == 'playing', initial_audio
    page.get_by_role('button', name='Edit your chain', exact=True).click()
    if not args.smoke:
        saved = shell.get_attribute('data-ids')
        # Actual mouse drag out of the cord into the right-hand box.
        source = page.locator('[data-cord-index="0"]').bounding_box()
        dest = page.locator('[data-aside]').bounding_box()
        page.mouse.move(source['x'] + 22, source['y'] + 22)
        page.mouse.down()
        page.mouse.move(dest['x'] + dest['width'] / 2, dest['y'] + 22, steps=12)
        page.mouse.up()
        assert shell.get_attribute('data-count') == '2'
        assert shell.get_attribute('data-box-count') == '1'
        page.get_by_role('button', name='Pick Aqua drop', exact=True).click()
        page.get_by_role('button', name='Thread held bead', exact=True).click()
        assert shell.get_attribute('data-box-count') == '0'
        page.get_by_role('button', name='Undo last change', exact=True).click()
        page.get_by_role('button', name='Undo last change', exact=True).click()
        assert shell.get_attribute('data-ids') == saved
        # Empty drag cancels without mutation.
        page.get_by_role('button', name='Back to bead catalog', exact=True).click()
        page.get_by_role('button', name='Pick Lilac heart', exact=True).click()
        page.keyboard.press('Escape')
        assert shell.get_attribute('data-ids') == saved
        # The existing list offers precise editing without small hit targets.
        page.get_by_role('button', name='Threading order and settings', exact=True).click()
        page.get_by_role('button', name='1. Aqua drop', exact=True).click()
        page.get_by_role('button', name='Replace', exact=True).click()
        page.get_by_role('button', name='Add Cobalt gem', exact=True).click()
        assert page.locator('dialog[open]').count() == 0
        assert shell.get_attribute('data-ids') == 'cobalt-gem,pearl,rose-prism'
        page.get_by_role('button', name='Undo last change', exact=True).click()
        assert shell.get_attribute('data-ids') == saved
        # Replay cannot claim the first reward twice.
        xp = shell.get_attribute('data-xp')
        page.get_by_role('button', name='Show Mia', exact=True).click()
        assert shell.get_attribute('data-xp') == xp
        page.get_by_role('button', name='Next letter', exact=True).click()
        assert shell.get_attribute('data-level-id') == 'rose'
        # Free mode, custom list and shop validation retain the original semantics.
        page.get_by_role('button', name='Letters and rules', exact=True).click()
        page.get_by_role('button', name='Free DIY', exact=True).click()
        assert shell.get_attribute('data-mode') == 'free'
        colors = ['Blue eye', 'Cloud pearl', 'Aqua drop', 'Pearl shell', 'Rose prism', 'Jade ring', 'Amber cube', 'Lilac heart', 'Blue star', 'Cherries', 'Clear quartz', 'Sun bow']
        for name in colors:
            page.get_by_role('button', name='All beads and categories', exact=True).click()
            page.get_by_role('button', name=f'Add {name}', exact=True).click()
        page.screenshot(path=str(out / f'{engine}-color-loop.png'))
        page.get_by_role('button', name='Done', exact=True).click()
        exact = shell.get_attribute('data-ids')
        page.wait_for_timeout(450)
        page.screenshot(path=str(out / f'{engine}-finished-phone.png'))
        page.get_by_role('button', name='Charm', exact=True).click()
        page.wait_for_timeout(450)
        assert shell.get_attribute('data-ids') == exact
        assert shell.get_attribute('data-finish-view') == 'charm'
        assert not page.locator('[data-box-scroll]').is_visible()
        page.screenshot(path=str(out / f'{engine}-finished-charm.png'))
        page.get_by_role('button', name='On phone', exact=True).click()
        assert shell.get_attribute('data-ids') == exact
        page.get_by_role('button', name='Customize', exact=True).click()
        page.locator('[data-custom-name]').fill('Summer keepsake')
        page.locator('[data-custom-note]').fill('Test only; do not send.')
        assert 'Summer keepsake' in page.locator('[data-order-text]').text_content()
        assert '12. Sun bow' in page.locator('[data-order-text]').text_content()
        page.get_by_role('button', name='Close customization', exact=True).click()
        page.get_by_role('button', name='Edit your chain', exact=True).click()
        page.get_by_role('button', name='Threading order and settings', exact=True).click()
        page.get_by_role('button', name='Shop settings', exact=True).click()
        page.locator('input[name=shopUrl]').fill('https://user:password@shop.example.com/')
        page.get_by_role('button', name='Save links', exact=True).click()
        assert 'Nothing was saved' in page.locator('[data-shop-status]').text_content()
        page.get_by_role('button', name='Close shop settings', exact=True).click()
        page.get_by_role('button', name='Mute soundtrack', exact=True).click()
        page.reload(wait_until='networkidle')
        page.wait_for_selector('[data-ready="true"]')
        assert shell.get_attribute('data-count') == '12'
        assert shell.get_attribute('data-mode') == 'free'
        assert page.get_by_role('button', name='Turn on soundtrack', exact=True).count() == 1
        page.get_by_role('button', name='Turn on soundtrack', exact=True).click()
        matrices = []
        for width, height in [(320,568),(390,844),(402,874),(390,664),(844,390),(568,320),(1440,1000)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(150)
            check = page.evaluate('''() => {
                const s=document.querySelector('[data-tabletop]'), r=s.getBoundingClientRect();
                const buttons=[...s.querySelectorAll('button')].filter(b=>{
                  if(!b.getClientRects().length||b.disabled)return false;
                  const sc=b.closest('[data-box-scroll]');
                  if(!sc)return true;
                  const a=b.getBoundingClientRect(),clip=sc.getBoundingClientRect();
                  return a.top>=clip.top-.5&&a.bottom<=clip.bottom+.5;
                });
                return {overflow:document.documentElement.scrollWidth>innerWidth,
                  bad:buttons.filter(b=>{const a=b.getBoundingClientRect();return a.width<43.9||a.height<43.9||a.left<r.left-.5||a.right>r.right+.5||a.top<0||a.bottom>innerHeight+.5;}).map(b=>({name:b.getAttribute('aria-label')||b.textContent,box:b.getBoundingClientRect().toJSON()}))};
            }''')
            assert not check['overflow'] and not check['bad'], (width,height,check)
            page.screenshot(path=str(out / f'{engine}-{width}x{height}.png'))
            matrices.append({'width':width,'height':height,**check})
        (out / f'{engine}-matrix.json').write_text(json.dumps(matrices, indent=2))
        # The old in-app worktable URL must show the same new 2D experience.
        page.goto('http://127.0.0.1:5114/3d-lab.html', wait_until='networkidle')
        page.wait_for_selector('[data-ready="true"]')
        assert shell.get_attribute('data-count') == '12'
    checks = {'flow': 'smoke' if args.smoke else 'extended', 'status': 'passed',
              'checks': ['touch-pick-and-thread', 'exact-result', 'edit', 'gesture-audio'] + ([] if args.smoke else [
                  'mouse-return-to-box', 'reuse-and-paired-undo', 'cancel', 'replace', 'no-duplicate-reward',
                  'next-letter', 'free-diy-12-colors', 'exact-charm-and-phone-showcase', 'custom-list', 'unsafe-link-rejected',
                  'reload-and-mute-persistence', 'seven-viewport-button-bounds', 'old-url-defaults-to-2d']),
              'pageErrors': errors, 'consoleErrors': console, 'sameOriginFailures': failed,
              'webglRequested': any('/three' in url or 'RoomEnvironment' in url or '/3d-lab.js' in url for url in requests),
              'initialAudio': initial_audio, 'afterNavigationMusic': shell.get_attribute('data-music'),
              'device': 'isolated headless browser, not a physical iPhone'}
    (out / f'{engine}.json').write_text(json.dumps(checks, indent=2))
    assert not errors and not console and not failed, checks
    assert not checks['webglRequested'], checks
    print(json.dumps(checks, indent=2))
    context.close()
    browser.close()
