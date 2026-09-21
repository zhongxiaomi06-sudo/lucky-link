"""Check an exported recording in Chromium and WebKit, without running game actions."""
import argparse
import json
from pathlib import Path
from urllib.parse import quote
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('movie', type=Path, help='MP4 inside the lucky-link app served on port 5114')
args = parser.parse_args()
movie = args.movie.resolve()
app = Path(__file__).resolve().parents[1]
url = 'http://127.0.0.1:5114/' + quote(movie.relative_to(app).as_posix())
results = []
with sync_playwright() as p:
    for engine in ['chromium', 'webkit']:
        browser = getattr(p, engine).launch(headless=True)
        try:
            page = browser.new_page(viewport={'width': 390, 'height': 844})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            html = '''<!doctype html><meta name="viewport" content="width=device-width">
            <style>body{margin:0;background:#111}video{width:100%;height:90vh}button{height:44px}</style>
            <video controls playsinline preload="auto"></video><button>Play recording</button>
            <script>const video=document.querySelector('video');video.src=MOVIE_URL;
            document.querySelector('button').onclick=()=>video.play();</script>'''.replace('MOVIE_URL', json.dumps(url))
            page.route('**/__recording-playback__', lambda route: route.fulfill(content_type='text/html', body=html))
            page.goto('http://127.0.0.1:5114/__recording-playback__', wait_until='networkidle')
            page.wait_for_function("document.querySelector('video').readyState >= 2")
            page.get_by_role('button', name='Play recording').click()
            page.wait_for_function("document.querySelector('video').currentTime > 1")
            page.locator('video').evaluate('(video) => { video.currentTime = 40; }')
            page.wait_for_function("document.querySelector('video').currentTime > 41 && !document.querySelector('video').seeking")
            state = page.locator('video').evaluate('''video => ({width:video.videoWidth,height:video.videoHeight,
                duration:video.duration,currentTime:video.currentTime,paused:video.paused,
                muted:video.muted,volume:video.volume,readyState:video.readyState,
                error:video.error?{code:video.error.code,message:video.error.message}:null})''')
            assert state['width'] == 390 and state['height'] == 844, state
            assert not state['paused'] and not state['muted'] and state['error'] is None and not errors, (state, errors)
            results.append({'engine': engine, 'browser': browser.version, 'play_then_seek': 'passed', 'state': state, 'page_errors': errors})
        finally:
            browser.close()
report = {'movie': str(movie), 'bytes': movie.stat().st_size, 'checks': results,
          'scope': 'Desktop browser MP4 playback; not physical iPhone or speaker listening validation'}
(movie.parent / 'playback.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
