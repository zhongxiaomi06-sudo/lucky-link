"""Check V30 photographic layers and DOM hotspots at supported mobile viewports."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parents[1] / 'evidence' / 'gravity-v30-layout')
parser.add_argument('--url', default='http://127.0.0.1:5114/?studio=1')

VIEWPORTS = (
    ('iphone-se', 320, 568),
    ('iphone-15', 390, 844),
    ('iphone-plus', 430, 932),
    ('iphone-landscape', 844, 390),
)


def run(args):
    args.out.mkdir(parents=True, exist_ok=True)
    reports = []
    with sync_playwright() as playwright:
        for browser_name in ('chromium', 'webkit'):
            browser = getattr(playwright, browser_name).launch(headless=True)
            for name, width, height in VIEWPORTS:
                context = browser.new_context(
                    viewport={'width': width, 'height': height},
                    device_scale_factor=1,
                    is_mobile=True,
                    has_touch=True,
                )
                context.add_init_script('localStorage.clear()')
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
                page.goto(args.url, wait_until='networkidle')
                expect(page.locator('[data-tabletop]')).to_have_attribute('data-ready', 'true', timeout=45000)
                page.get_by_role('button', name='Unlock hidden beads', exact=True).tap()
                game = page.locator('[data-dialog="match"]')
                page.get_by_role('button', name='Play', exact=True).tap()
                expect(game).to_have_attribute('data-game-state', 'playing')
                page.wait_for_timeout(500)
                metrics = game.evaluate("""game => {
                  const rect = node => {const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
                  const base=game.querySelector('.gravity-art-base'),hud=game.querySelector('.gravity-art-hud'),field=game.querySelector('[data-gravity-field]');
                  const baseImage=base.querySelector('img'),hudImage=hud.querySelector('img');
                  const visibleWords=[...game.querySelectorAll('h2,h3,p,small,strong,button')].filter(node=>node.getClientRects().length&&!node.closest('.visually-hidden,.gravity-points,.chain-label')&&/[A-Za-z\u3400-\u9fff]/.test(node.innerText)).map(node=>node.innerText.trim());
                  return {
                    viewport:[innerWidth,innerHeight],dialog:rect(game),field:rect(field),
                    base:{rect:rect(base),natural:[baseImage.naturalWidth,baseImage.naturalHeight],src:baseImage.currentSrc,pointerEvents:getComputedStyle(base).pointerEvents},
                    hud:{rect:rect(hud),natural:[hudImage.naturalWidth,hudImage.naturalHeight],src:hudImage.currentSrc,pointerEvents:getComputedStyle(hud).pointerEvents},
                    back:rect(game.querySelector('[data-match-back]')),sound:rect(game.querySelector('[data-match-sound]')),
                    visibleWords,overflow:document.documentElement.scrollWidth-innerWidth
                  };
                }""")
                assert abs(metrics['dialog']['width'] - width) <= 1 and abs(metrics['dialog']['height'] - height) <= 1, metrics
                assert abs(metrics['base']['rect']['width'] - width) <= 1 and abs(metrics['base']['rect']['height'] - height) <= 1, metrics
                assert abs(metrics['hud']['rect']['width'] - width) <= 1 and abs(metrics['hud']['rect']['height'] - height) <= 1, metrics
                assert metrics['base']['natural'] == [941, 1672] and metrics['hud']['natural'] == [941, 1672], metrics
                assert metrics['base']['src'].endswith('.webp') and metrics['hud']['src'].endswith('.webp'), metrics
                assert metrics['base']['pointerEvents'] == 'none' and metrics['hud']['pointerEvents'] == 'none', metrics
                assert min(metrics['back']['width'], metrics['back']['height'], metrics['sound']['width'], metrics['sound']['height']) >= 44, metrics
                assert metrics['back']['x'] >= 0 and metrics['back']['right'] <= width, metrics
                assert metrics['sound']['x'] >= 0 and metrics['sound']['right'] <= width, metrics
                assert metrics['field']['x'] >= 0 and metrics['field']['right'] <= width, metrics
                assert metrics['field']['y'] >= 0 and metrics['field']['bottom'] <= height, metrics
                assert metrics['overflow'] <= 1 and not metrics['visibleWords'] and not errors, (metrics, errors)
                if name in ('iphone-se', 'iphone-landscape'):
                    page.screenshot(path=str(args.out / f'{browser_name}-{name}.png'), full_page=True)
                reports.append({'browser': browser_name, 'viewport': name, 'metrics': metrics, 'runtimeErrors': errors})
                context.close()
            browser.close()
    report = args.out / 'audit.json'
    report.write_text(json.dumps({'checks': len(reports), 'reports': reports}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return report


if __name__ == '__main__':
    print(run(parser.parse_args()))
