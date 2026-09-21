"""Grounded studio: native browser interaction, commerce boundaries and mobile evidence."""
from pathlib import Path
import argparse
import json
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--capture-only', action='store_true')
parser.add_argument('--webkit', action='store_true')
args = parser.parse_args()
evidence = Path(__file__).resolve().parents[1] / 'evidence' / 'tabletop-studio'
evidence.mkdir(parents=True, exist_ok=True)
solutions = [
    ['Cobalt gem', 'Cobalt orb', 'Pearl shell', 'Cloud pearl', 'Cloud pearl', 'Clear quartz'],
    ['Rose prism', 'Pink dice', 'Lilac heart', 'Cloud pearl', 'Cloud pearl', 'Clear quartz', 'Sun orb'],
    ['Jade ring', 'Lime gem', 'Jade ring', 'Cloud pearl', 'Aqua drop', 'Rose prism', 'Clear quartz', 'Sun orb'],
    ['Blue star', 'Cloud pearl', 'Rose prism', 'Rose prism', 'Cloud pearl', 'Blue star'],
    ['Cobalt gem', 'Rose prism', 'Lime gem', 'Sun orb', 'Pearl shell', 'Blue star', 'Cloud pearl', 'Lilac heart', 'Amber cube'],
]
with sync_playwright() as p:
    browser = p.webkit.launch(headless=True) if args.webkit else p.chromium.launch(headless=True, args=['--use-angle=metal', '--enable-gpu'])
    context = browser.new_context(viewport={'width':390, 'height':844}, is_mobile=True, has_touch=True, device_scale_factor=1, accept_downloads=True)
    # External-shop tests never contact a real merchant.
    context.route('https://shop.example.com/**', lambda route: route.fulfill(status=200, content_type='text/html', body='<p>Test shop</p>'))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.goto('http://127.0.0.1:5114/3d-lab.html', wait_until='networkidle')
    shell = page.locator('[data-lab-shell]')
    expect(shell).to_have_attribute('data-support', 'table-stand-mat')
    expect(page.get_by_role('button', name='Check design', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Add Cloud pearl', exact=True)).to_have_count(1)
    page.screenshot(path=str(evidence / ('webkit-initial.png' if args.webkit else '01-initial.png')))
    if args.capture_only:
        for name in solutions[0]: page.get_by_role('button', name=f'Add {name}', exact=True).click()
        page.wait_for_timeout(2500)
        page.screenshot(path=str(evidence / '02-ocean-ready.png'))
        print(json.dumps({'capture':'ready','errors':errors}), flush=True)
    else:
        # Wrong count-correct recipe must not pass; locked levels stay locked.
        for _ in range(6): page.get_by_role('button', name='Add Cloud pearl', exact=True).click()
        page.get_by_role('button', name='Check design', exact=True).click()
        expect(page.get_by_role('dialog', name='Your challenges')).to_be_visible()
        expect(page.locator('[data-level="rose"]')).to_be_disabled()
        expect(shell).to_have_attribute('data-state', 'compose')
        page.get_by_role('button', name='Close challenges', exact=True).click()
        page.get_by_role('button', name='Clear', exact=True).click()
        for index, solution in enumerate(solutions):
            for name in solution: page.get_by_role('button', name=f'Add {name}', exact=True).tap()
            expect(shell).to_have_attribute('data-challenge-passed', 'true')
            if index == 0:
                page.wait_for_timeout(500)
                page.screenshot(path=str(evidence / ('webkit-ocean.png' if args.webkit else '02-ocean-ready.png')))
            page.get_by_role('button', name='Check design', exact=True).click()
            expect(shell).to_have_attribute('data-state', 'finished')
            if index < 4: page.get_by_role('button', name='Next challenge', exact=True).click()
        saved = page.evaluate('JSON.parse(localStorage.getItem("lucky-link.studio.v1"))')
        assert len(saved['completed']) == 5
        print('Five touch-operated challenges passed', flush=True)
        page.get_by_role('button', name='Free DIY', exact=True).last.click()
        expect(shell).to_have_attribute('data-game-mode', 'free')
        expect(page.locator('[data-count]')).to_have_text('0')
        for name in ['Cloud pearl', 'Rose prism', 'Blue eye']: page.get_by_role('button', name=f'Add {name}', exact=True).click()
        # Move, replace and remove are explicit, order-preserving actions.
        page.get_by_role('button', name='Edit threading order', exact=True).click()
        page.get_by_role('button', name='2. Rose prism', exact=True).click()
        page.get_by_role('button', name='Move earlier', exact=True).click()
        expect(shell).to_have_attribute('data-composition', 'rose-prism,pearl,blue-eye')
        page.get_by_role('button', name='Replace', exact=True).click()
        page.get_by_role('button', name='Add Sun orb', exact=True).click()
        expect(shell).to_have_attribute('data-composition', 'sun-orb,pearl,blue-eye')
        page.get_by_role('button', name='Undo', exact=True).click()
        expect(shell).to_have_attribute('data-composition', 'rose-prism,pearl,blue-eye')
        page.get_by_role('button', name='Undo', exact=True).click()
        expect(shell).to_have_attribute('data-composition', 'pearl,rose-prism,blue-eye')
        page.get_by_role('button', name='Edit threading order', exact=True).click()
        page.get_by_role('button', name='2. Rose prism', exact=True).click()
        page.get_by_role('button', name='Move earlier', exact=True).click()
        page.get_by_role('button', name='Replace', exact=True).click()
        page.get_by_role('button', name='Add Sun orb', exact=True).tap()
        page.get_by_role('button', name='Edit threading order', exact=True).click()
        page.get_by_role('button', name='2. Cloud pearl', exact=True).click()
        page.get_by_role('button', name='Remove', exact=True).click()
        expect(shell).to_have_attribute('data-composition', 'sun-orb,blue-eye')
        page.get_by_role('button', name='Add Cloud pearl', exact=True).click()
        page.get_by_role('button', name='Clear', exact=True).click()
        page.get_by_role('button', name='Undo', exact=True).click()
        expect(shell).to_have_attribute('data-composition', 'sun-orb,blue-eye,pearl')
        page.get_by_role('button', name='Sound', exact=True).click()
        expect(page.get_by_role('button', name='Sound', exact=True)).to_have_attribute('aria-pressed', 'false')
        # Separate drafts survive mode switches and reload.
        page.get_by_role('button', name='Challenges', exact=True).click()
        expect(page.locator('[data-count]')).to_have_text('9')
        page.get_by_role('button', name='Free DIY', exact=True).click()
        page.reload(wait_until='networkidle')
        expect(shell).to_have_attribute('data-composition', 'sun-orb,blue-eye,pearl')
        expect(page.get_by_role('button', name='Sound', exact=True)).to_have_attribute('aria-pressed', 'false')
        # Continuous orbit cannot remove any piece or open the editor.
        before = float(shell.get_attribute('data-camera-travel'))
        for _ in range(9):
            page.mouse.move(105, 345); page.mouse.down(); page.mouse.move(350, 345, steps=8); page.mouse.up()
        page.wait_for_timeout(250)
        assert float(shell.get_attribute('data-camera-travel')) - before > 360
        assert page.locator('dialog[open]').count() == 0
        expect(page.locator('[data-count]')).to_have_text('3')
        page.get_by_role('button', name='Reset camera', exact=True).click()
        page.wait_for_timeout(1000)
        if not args.webkit:
            cdp = context.new_cdp_session(page)
            def touch(kind, points): cdp.send('Input.dispatchTouchEvent', {'type':kind,'touchPoints':points})
            rail = page.locator('[data-materials]').bounding_box()
            y = rail['y'] + 25
            touch('touchStart',[{'x':270,'y':y,'id':1}])
            for s in range(1,7): touch('touchMove',[{'x':270-s*25,'y':y,'id':1}])
            touch('touchEnd',[])
            expect(page.locator('[data-count]')).to_have_text('3')
            expect(page.locator('[data-drag-ghost]')).to_be_hidden()
            radius = float(shell.get_attribute('data-camera-radius'))
            touch('touchStart',[{'x':120,'y':370,'id':1},{'x':260,'y':370,'id':2}])
            for s in range(1, 7): touch('touchMove',[{'x':120-s*5,'y':370,'id':1},{'x':260+s*5,'y':370,'id':2}])
            touch('touchEnd',[]); page.wait_for_timeout(400)
            assert float(shell.get_attribute('data-camera-radius')) < radius
        page.get_by_role('button', name='Reset camera', exact=True).click()
        page.get_by_role('button', name='Try it on', exact=True).click()
        page.get_by_role('button', name='Follow chain', exact=True).click()
        expect(shell).to_have_attribute('data-camera-mode', 'tour')
        page.mouse.move(115,345); page.mouse.down(); page.mouse.move(300,345,steps=8); page.mouse.up()
        expect(shell).to_have_attribute('data-camera-mode','orbit')
        page.get_by_role('button', name='Customize & shop', exact=True).click()
        expect(page.locator('[data-shop-message]')).to_contain_text('No shop connected')
        page.get_by_label('Design name', exact=True).fill('Ocean gift')
        page.get_by_role('combobox', name='Cord color', exact=True).select_option('rose')
        page.get_by_label('Note for the maker', exact=True).fill('For a friend')
        expect(page.locator('[data-order-text]')).to_contain_text('Sun orb')
        with page.expect_download() as capture:
            page.get_by_role('button', name='Download list', exact=True).click()
        assert capture.value.suggested_filename == 'phone-chain-design.txt'
        page.get_by_role('button', name='Close customization', exact=True).click()
        page.get_by_role('button', name='Shop settings', exact=True).click()
        page.get_by_label('Shop link', exact=True).fill('javascript:alert(1)')
        page.get_by_role('button', name='Save links', exact=True).click()
        expect(page.locator('[data-shop-status]')).to_contain_text('Nothing was saved')
        page.get_by_label('Shop name', exact=True).fill('Test atelier')
        page.get_by_label('Shop link', exact=True).fill('https://shop.example.com/items')
        page.get_by_label('Custom-order link', exact=True).fill('https://shop.example.com/custom')
        page.get_by_role('combobox', name='Material', exact=True).select_option('pearl')
        page.get_by_label('Material product link', exact=True).fill('https://shop.example.com/pearl')
        page.get_by_role('button', name='Save links', exact=True).click()
        expect(page.locator('[data-shop-status]')).to_contain_text('Links saved')
        with page.expect_download() as capture:
            page.get_by_role('button', name='Export saved config', exact=True).click()
        assert capture.value.suggested_filename == 'commerce-config.json'
        page.get_by_role('button', name='Close shop settings', exact=True).click()
        page.get_by_role('button', name='Customize & shop', exact=True).click()
        expect(page.get_by_role('link', name='Contact maker')).to_have_attribute('href','https://shop.example.com/custom')
        page.locator('summary').click()
        expect(page.get_by_role('link', name='Cloud pearl')).to_have_attribute('rel','noopener noreferrer')
        with page.expect_popup() as popup:
            page.get_by_role('link', name='Contact maker').click()
        popup.value.wait_for_load_state(); assert popup.value.url == 'https://shop.example.com/custom'; popup.value.close()
        page.screenshot(path=str(evidence / ('webkit-custom.png' if args.webkit else '03-customization.png')))
        page.get_by_role('button', name='Close customization', exact=True).click()
        page.get_by_role('button', name='Edit', exact=True).click()
        for width,height in [(320,568),(844,390),(1440,1000)]:
            page.set_viewport_size({'width':width,'height':height})
            page.wait_for_timeout(700)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            expect(page.get_by_role('button', name='Try it on',exact=True)).to_be_in_viewport()
            if width == 320:
                page.screenshot(path=str(evidence / ('webkit-narrow.png' if args.webkit else '04-narrow.png')))
                page.get_by_role('button', name='Shop settings',exact=True).click()
                page.get_by_label('Custom-order link',exact=True).fill('https://shop.example.com/custom')
                page.get_by_role('button', name='Save links',exact=True).click()
                page.get_by_role('button', name='Close shop settings',exact=True).click()
        assert not errors, errors
        print(json.dumps({'result':'pass','browser':'webkit' if args.webkit else 'chromium-metal','levels':5,'errors':errors,'viewports':['390x844','320x568','844x390','1440x1000']}), flush=True)
    context.close(); browser.close()
