"""Regression for the letter covering the phone; isolated browser, no Owner draft writes."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--webkit', action='store_true')
args = parser.parse_args()
engine = 'webkit' if args.webkit else 'chromium'
out = Path(__file__).resolve().parents[1] / 'evidence' / 'ticket-fix'
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = getattr(p, engine).launch(headless=True, **({'args': ['--use-angle=metal', '--enable-gpu']} if engine == 'chromium' else {}))
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, device_scale_factor=1)
    page = context.new_page()
    errors, failed, samples = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('requestfailed', lambda r: failed.append(r.url) if '127.0.0.1' in r.url else None)
    page.goto('http://127.0.0.1:5114/3d-lab.html?debug=1', wait_until='networkidle')
    shell = page.locator('[data-lab-shell]')
    ticket = page.locator('[data-action="levels"]')
    expect(shell).to_have_attribute('data-render-ready', 'true', timeout=45000)
    page.add_style_tag(content='[data-diagnostics]{display:none!important}')
    for w, h in [(390, 844), (320, 568), (402, 874), (390, 664), (844, 390), (652, 368), (568, 320), (1440, 1000)]:
        page.set_viewport_size({'width': w, 'height': h})
        page.evaluate('''([w,h])=>{const s=document.documentElement.style;
          s.setProperty('--studio-top',w===402?'59px':'0px');
          s.setProperty('--studio-left',w===844?'59px':'0px');
          s.setProperty('--studio-right',w===844?'59px':'0px');
          dispatchEvent(new Event('resize'));}''', [w, h])
        for mode in ['challenge', 'free']:
            ticket.tap()
            page.locator(f'[data-play-mode="{mode}"]').tap()
            expect(shell).to_have_attribute('data-game-mode', mode)
            page.wait_for_timeout(650)
            box = ticket.bounding_box()
            assert 44 <= box['height'] <= 49, ('expanded letter covers phone', w, h, box)
            assert box['width'] >= 44
            controls = page.locator('.task-ticket,.lab-topbar a,[data-action="sound"],[data-action="reset-camera"]').evaluate_all('''els=>els.map(el=>{const r=el.getBoundingClientRect();return {label:el.getAttribute('aria-label'),x:r.x,y:r.y,width:r.width,height:r.height,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})''')
            assert all(c['hit'] and c['width'] >= 44 and c['height'] >= 44 for c in controls), controls
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            phone = json.loads(shell.get_attribute('data-phone-bounds'))
            assert box['y'] + box['height'] + 6 <= phone['top'] or box['x'] + box['width'] + 6 <= phone['left'] or box['x'] - 6 >= phone['right'], (w, h, box, phone)
            samples.append({'viewport': [w, h], 'mode': mode, 'ticket': box, 'phone': phone, 'controls': controls})
            ticket.tap()
            expect(page.locator('[data-dialog="levels"]')).to_be_visible()
            rules = page.locator('[data-requirements]').inner_text()
            assert '3–14' in rules
            assert ('70 points' in rules) == (mode == 'challenge'), rules
            assert page.locator('[data-level-list] button').count() == 5
            if mode == 'challenge':
                assert page.locator('[data-style-tags] span').count() == 3
                expect(page.locator('[data-level-brief]')).to_be_visible()
            page.get_by_role('button', name='Close challenges', exact=True).tap()
            if mode == 'free':
                page.wait_for_timeout(1600)
                page.screenshot(path=str(out / f'{engine}-{w}x{h}.png'))

        # Layout-only text fixtures: actual five titles at 200%, never unlock or alter game state.
        original = page.locator('[data-level-name]').inner_text()
        for title in ['Ocean wish', 'Rose letter', 'Garden picnic', 'Moonlight walk', 'Color story', 'Free DIY']:
            page.evaluate('''title=>{document.documentElement.style.fontSize='200%';document.querySelector('[data-level-name]').textContent=title;}''', title)
            assert ticket.bounding_box()['height'] <= 49
            assert ticket.evaluate('el=>el.scrollWidth<=el.clientWidth')
            assert ticket.evaluate('el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}')
            enlarged = ticket.bounding_box()
            assert enlarged['y'] + enlarged['height'] + 6 <= phone['top'] or enlarged['x'] + enlarged['width'] + 6 <= phone['left'], (w, h, title, enlarged, phone)
        page.evaluate('''title=>{document.documentElement.style.fontSize='';document.querySelector('[data-level-name]').textContent=title;}''', original)

    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate("document.documentElement.style.fontSize='200%'")
    expect(ticket).to_be_in_viewport()
    assert ticket.bounding_box()['height'] <= 49
    ticket.focus()
    page.keyboard.press('Enter')
    expect(page.locator('[data-dialog="levels"]')).to_be_visible()
    page.keyboard.press('Escape')
    expect(ticket).to_be_focused()
    page.evaluate("document.documentElement.style.fontSize=''")
    # Complete the existing pick/thread path, with the compact letter left in place.
    for _ in range(3):
        page.locator('[data-box-slot="0"]').tap()
        page.locator('[data-drop-target]').tap()
    expect(page.locator('[data-count]')).to_have_text('3')
    saved = page.evaluate('localStorage.getItem("lucky-link.styling.v2")')
    ticket.tap()
    page.get_by_role('button', name='Close challenges', exact=True).tap()
    assert page.evaluate('localStorage.getItem("lucky-link.styling.v2")') == saved
    yaw = shell.get_attribute('data-camera-yaw')
    page.locator('[data-canvas]').focus()
    page.keyboard.press('ArrowLeft')
    page.wait_for_timeout(250)
    assert shell.get_attribute('data-camera-yaw') != yaw
    page.locator('[data-action="reset-camera"]').tap()
    page.wait_for_timeout(1100)
    phone = json.loads(shell.get_attribute('data-phone-bounds'))
    box = ticket.bounding_box()
    assert box['y'] + box['height'] + 6 < phone['top']
    assert page.evaluate('localStorage.getItem("lucky-link.styling.v2")') == saved
    page.locator('[data-action="finish"]').tap()
    expect(shell).to_have_attribute('data-finish-view', 'charm')
    expect(ticket).to_be_hidden()
    page.locator('[data-action="edit"]').tap()
    expect(ticket).to_be_visible()
    expect(page.locator('[data-count]')).to_have_text('3')
    page.wait_for_timeout(1700)
    page.screenshot(path=str(out / f'{engine}-playing.png'))
    assert not errors, errors
    assert not failed, failed
    result = {'engine': engine, 'samples': samples, 'errors': errors, 'same_origin_failures': failed, 'physical_iphone': False, 'passed': True}
    (out / f'{engine}.json').write_text(json.dumps(result, indent=2))
    print(json.dumps({'engine': engine, 'samples': len(samples), 'passed': True}))
    browser.close()
