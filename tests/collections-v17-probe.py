"""Isolated rendered-page reconnaissance. No owner-browser or owner storage access."""
import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--webkit',action='store_true')
args=parser.parse_args()
engine='webkit' if args.webkit else 'chromium'
out=Path(__file__).resolve().parents[1]/'evidence'/'collections-v17'/engine
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=getattr(p,engine).launch(headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.goto('http://127.0.0.1:5114/',wait_until='networkidle')
    expect(page.locator('[data-tabletop]')).to_have_attribute('data-ready','true',timeout=45000)
    page.screenshot(path=str(out/'home.png'))
    print(json.dumps({'errors':errors,'buttons':page.get_by_role('button').evaluate_all('(ns)=>ns.filter(n=>n.getBoundingClientRect().width&&n.getBoundingClientRect().height).map(n=>({label:n.getAttribute("aria-label"),text:n.innerText}))')}),flush=True)
    page.get_by_role('button',name='Make yours').tap()
    for name in ['Aqua drop','Cloud pearl','Rose prism','Lilac heart','Blue star']:
        page.get_by_role('button',name='Pick '+name,exact=True).scroll_into_view_if_needed()
        page.get_by_role('button',name='Pick '+name,exact=True).tap()
        page.get_by_role('button',name='Thread held bead',exact=True).tap()
    page.screenshot(path=str(out/'diy.png'))
    print(json.dumps({'errors':errors,'state':page.locator('[data-tabletop]').get_attribute('data-ids')}),flush=True)
    browser.close()
