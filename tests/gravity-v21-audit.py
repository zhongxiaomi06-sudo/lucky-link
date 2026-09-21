"""Mobile preview audit for the V21 irregular accessory gravity game."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out',type=Path,default=Path(__file__).resolve().parents[1]/'evidence'/'gravity-v21-preview')
args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.goto('http://127.0.0.1:5114/?studio=1',wait_until='networkidle')
    shell=page.locator('[data-tabletop]');expect(shell).to_have_attribute('data-ready','true',timeout=45000)
    page.get_by_role('button',name='Unlock hidden beads',exact=True).tap()
    game=page.locator('[data-dialog="match"]');expect(game.locator('[data-prize-rule]')).to_have_class('visually-hidden')
    page.get_by_role('button',name='Play',exact=True).tap();field=game.locator('[data-gravity-field]')
    expect(field).to_be_visible();expect(game.locator('[data-tile]')).to_have_count(0)
    visible_words=game.locator('h2,h3,p,small,strong,button').evaluate_all("""nodes => nodes.filter(node => node.getClientRects().length && !node.closest('.visually-hidden,.gravity-points,.chain-label') && /[A-Za-z\\u3400-\\u9fff]/.test(node.innerText)).map(node => node.innerText.trim())""")
    assert not visible_words,visible_words
    box=field.bounding_box()
    for ratio in [.25,.25,.25,.55,.55,.55,.78,.78,.78,.4,.4,.4]:
        page.touchscreen.tap(box['x']+box['width']*ratio,box['y']+45);page.wait_for_timeout(360)
    page.wait_for_timeout(1600)
    expect(game.locator('.gravity-piece')).not_to_have_count(0)
    page.screenshot(path=str(args.out/'iphone-gravity-game.png'),full_page=True)
    if errors:raise AssertionError(errors)
    browser.close()
print(args.out/'iphone-gravity-game.png')
