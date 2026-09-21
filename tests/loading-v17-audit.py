"""Read-only V17 cold-load measurement; desktop emulation, never real iPhone evidence."""
import argparse
import json
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--webkit', action='store_true')
parser.add_argument('--mbps', type=float, default=0, help='Chromium download cap; 0 means no cap')
args = parser.parse_args()
if args.mbps < 0 or (args.webkit and args.mbps):
    parser.error('Download cap must be non-negative and is Chromium-only')

with sync_playwright() as p:
    engine = 'webkit' if args.webkit else 'chromium'
    browser = getattr(p, engine).launch(headless=True)
    context = browser.new_context(viewport={'width': 390, 'height': 844},
                                  device_scale_factor=1, is_mobile=True, has_touch=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: errors.append(f'{response.status} {response.url}')
            if response.status >= 400 else None)
    if args.mbps:
        session = context.new_cdp_session(page)
        session.send('Network.enable')
        session.send('Network.setCacheDisabled', {'cacheDisabled': True})
        session.send('Network.emulateNetworkConditions', {
            'offline': False, 'latency': 150,
            'downloadThroughput': args.mbps * 1_000_000 / 8,
            'uploadThroughput': 1_000_000 / 8,
        })
    page.goto('http://127.0.0.1:5114/', wait_until='domcontentloaded', timeout=30000)
    page.wait_for_function("document.querySelector('[data-tabletop]')?.dataset.ready === 'true'",
                           timeout=180000)
    ready_ms = page.evaluate('performance.now()')
    page.wait_for_load_state('networkidle', timeout=30000)
    resources = page.evaluate("""() => performance.getEntriesByType('resource')
        .filter(r => r.name.startsWith(location.origin))
        .map(r => ({path:new URL(r.name).pathname, type:r.initiatorType,
                   transferBytes:r.transferSize, bodyBytes:r.encodedBodySize,
                   durationMs:r.duration}))""")
    home = page.locator('[data-tabletop]')
    assert home.get_attribute('data-state') == 'home'
    assert page.locator('[data-home-bead]').count() == 14
    assert page.evaluate('localStorage.getItem("lucky-link.collection.v1")') is None
    assert len(errors) == 0, errors
    page.get_by_role('button', name='Make yours', exact=True).tap()
    assert home.get_attribute('data-state') == 'compose'
    assert home.get_attribute('data-count') == '0'
    result = {
        'measuredAtUtc': datetime.now(timezone.utc).isoformat(),
        'engine': engine, 'browserVersion': browser.version,
        'environment': 'Local Vite development server; isolated desktop headless browser',
        'viewport': [390, 844], 'dpr': 1, 'physicalIphone': False,
        'network': {'downloadMbps': args.mbps or None, 'latencyMs': 150 if args.mbps else None,
                    'note': 'CDP simulation; not a real mobile network or hosting benchmark'},
        'artAndControlsReadyMs': round(ready_ms, 1),
        'sameOriginTransferBytes': sum(r['transferBytes'] for r in resources),
        'sameOriginBodyBytes': sum(r['bodyBytes'] for r in resources),
        'resources': resources, 'pageErrors': errors,
        'homeDoesNotWriteDraft': True, 'canEnterOwnEmptyDraft': True,
        'limits': 'No native share, physical screen latency, FPS, total memory or production-network claim',
    }
    print(json.dumps(result, ensure_ascii=False), flush=True)
    context.close()
    browser.close()
