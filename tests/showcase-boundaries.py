"""Native reduced-motion, full-loop, resize and customization checks for V8."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect

out = Path(__file__).resolve().parents[1] / 'evidence' / 'showcase-v8'
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-angle=metal', '--enable-gpu'])
    context = browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce', is_mobile=True, has_touch=True)
    page = context.new_page(); errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:5114/3d-lab.html?debug', wait_until='domcontentloaded')
    shell = page.locator('[data-lab-shell]')
    expect(shell).to_have_attribute('data-render-ready','true',timeout=45000)
    def action(name): return page.locator(f'[data-action="{name}"]')
    page.get_by_role('button',name='Challenge requirements and levels',exact=True).tap()
    page.get_by_role('button',name='Free DIY',exact=True).tap()
    action('collection').tap()
    names = ['Blue eye','Aqua drop','Cloud pearl','Pearl shell','Clear quartz','Cobalt gem','Lilac heart'] * 2
    for name in names: page.get_by_role('button',name=f'Add {name}',exact=True).tap()
    page.get_by_role('button',name='Close bead collection').tap()
    original = shell.get_attribute('data-composition')
    assert len(original.split(',')) == 14
    action('finish').tap()
    expect(shell).to_have_attribute('data-showcase-motion','paused')
    expect(shell).to_have_attribute('data-showcase-composition',original)
    expect(action('score')).to_be_hidden()
    page.wait_for_timeout(1000)
    assert shell.get_attribute('data-showcase-degrees') == '0'
    def framed():
        r = json.loads(shell.get_attribute('data-showcase-rect'))
        pts = json.loads(shell.get_attribute('data-showcase-points'))
        assert len(pts) == 14
        assert all(r['x'] <= v['x'] <= r['x']+r['width'] and r['y'] <= v['y'] <= r['y']+r['height'] for v in pts), (r,pts)
    framed()
    action('showcase-spin').tap(); page.wait_for_timeout(1100)
    expect(shell).to_have_attribute('data-showcase-motion','playing')
    assert int(shell.get_attribute('data-showcase-degrees')) > 0
    for w,h in [(844,390),(320,568),(390,844)]:
        page.set_viewport_size({'width':w,'height':h}); page.wait_for_timeout(900)
        expect(shell).to_have_attribute('data-showcase-motion','playing')
        framed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    action('customize').tap()
    expect(shell).to_have_attribute('data-showcase-motion','paused')
    page.get_by_role('combobox',name='Cord color',exact=True).select_option('rose')
    expect(page.locator('[data-order-text]')).to_contain_text('Cord: rose')
    page.get_by_role('button',name='Close customization').tap()
    expect(shell).to_have_attribute('data-showcase-motion','paused')
    action('showcase-front').tap();page.wait_for_timeout(300);framed()
    page.screenshot(path=str(out/'reduced-motion-14.png'),style='[data-diagnostics]{display:none!important}')
    action('view-phone').tap();action('view-charm').tap()
    expect(shell).to_have_attribute('data-showcase-composition',original)
    action('edit').tap()
    expect(shell).to_have_attribute('data-composition',original)
    page.get_by_role('button',name='Undo last change',exact=True).tap()
    expect(page.locator('[data-count]')).to_have_text('13')
    assert not errors, errors
    result = {'result':'pass','checks':['reduced-motion-no-autoplay','native-explicit-spin','14-real-beads','live-orientation-refit','modal-pauses','cord-color-list','mode-switch-preserves-design','edit-keeps-undo'],'errors':errors}
    (out/'boundaries.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result),flush=True)
    browser.close()
