"""Record the current V12 2D tabletop first commission and its live game audio.

No microphone, whole-desktop capture, injected game state, generated replacement sound, or speed-up.
Requires the existing 5114 dev server, native Python Playwright, ffmpeg and ffprobe.
"""
import argparse
from array import array
import base64
import hashlib
import json
import statistics
import subprocess
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--smoke', action='store_true', help='Capture one pickup/thread, then verify audiovisual export')
parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parents[1] / 'evidence' / 'tabletop-recording-v12')
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
out = Path(tempfile.mkdtemp(prefix='smoke-' if args.smoke else 'run-', dir=args.out))
frames_dir = out / 'frames'
frames_dir.mkdir()
app = Path(__file__).resolve().parents[1]
source_hashes = {str(f.relative_to(app)): hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((app / 'src').glob('*')) if f.is_file()}
frames, marks, errors, failed = [], [], [], []

def run(command):
    return subprocess.run(['rtk', 'proxy', *command], check=True, capture_output=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-angle=metal', '--enable-gpu'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    context.add_init_script(path=str(Path(__file__).with_name('record-audio-hook.js')))
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('response', lambda r: failed.append({'url': r.url, 'status': r.status}) if '127.0.0.1' in r.url and r.status >= 400 else None)
    page.goto('http://127.0.0.1:5114/', wait_until='networkidle')
    shell = page.locator('[data-lab-shell]')
    expect(shell).to_have_attribute('data-ready', 'true', timeout=45000)
    page.add_style_tag(content='[data-diagnostics]{display:none!important}')
    action = lambda name: page.locator(f'[data-action="{name}"]')
    pause = page.wait_for_timeout
    cue = lambda name: expect(shell).to_have_attribute('data-last-sound', name)

    # A real first gesture starts game music before the capture. No autoplay bypass.
    action('levels').tap()
    expect(shell).to_have_attribute('data-music', 'playing')
    page.get_by_role('button', name='Close challenges', exact=True).tap()
    pause(900)
    audio_ready = page.evaluate('recordingAudit.status()')
    assert audio_ready[0]['state'] == 'running' and audio_ready[0]['sources'] == 2, audio_ready

    cdp = context.new_cdp_session(page)
    def frame(event):
        path = frames_dir / f'{len(frames):06d}.jpg'
        path.write_bytes(base64.b64decode(event['data']))
        frames.append({'path': str(path), 'epoch': event['metadata']['timestamp']})
        cdp.send('Page.screencastFrameAck', {'sessionId': event['sessionId']})

    cdp.on('Page.screencastFrame', frame)
    audio_start = page.evaluate('recordingAudit.start()')
    cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 90, 'maxWidth': 780, 'maxHeight': 1688, 'everyNthFrame': 1})

    def mark(name):
        state = page.evaluate('''() => ({epoch:(performance.timeOrigin+performance.now())/1000,
          state:{...document.querySelector('[data-lab-shell]').dataset},audio:recordingAudit.status()})''')
        state['name'] = name
        marks.append(state)
        print(json.dumps({'step': name, 'seconds': round(state['epoch'] - audio_start['epoch'], 2)}), flush=True)

    def center(locator):
        rect = locator.bounding_box()
        assert rect, 'Target has no visible rectangle'
        return (rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2)

    def glide(start, end, steps=24):
        for index in range(1, steps + 1):
            t = index / steps
            page.mouse.move(start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t)
            pause(30)

    def pick(name, drag=False):
        button = page.get_by_role('button', name='Pick ' + name, exact=True)
        if not button.count():
            page.get_by_role('button', name='Charms', exact=True).tap()
        if not button.count():
            page.get_by_role('button', name='Beads', exact=True).tap()
        expect(button).to_be_visible()
        button.scroll_into_view_if_needed()
        pause(250)
        before = int(shell.get_attribute('data-count'))
        if drag:
            # Resolve the visible cord before pickup: its insertion button is
            # intentionally hidden while the pointer is away from the cord.
            landing = center(page.locator('[data-cord-index="0"]'))
            source = center(button)
            picked_id = json.loads(button.get_attribute('data-source'))['id']
            page.mouse.move(*source)
            page.mouse.down()
            pause(180)
            glide(source, (source[0] - 28, source[1]), 6)
            expect(shell).to_have_attribute('data-held', picked_id)
            cue('pickup')
            glide((source[0] - 28, source[1]), landing)
            pause(350)
            page.mouse.up()
        else:
            button.tap()
            cue('pickup')
            pause(500)
            page.get_by_role('button', name='Thread held bead', exact=True).tap()
        expect(shell).to_have_attribute('data-count', str(before + 1))
        cue('thread')
        pause(850)
        mark(('Drag and thread ' if drag else 'Tap and thread ') + name)

    pause(1400)
    mark('Current V12 2D tabletop: first commission')
    action('open-letter').tap()
    expect(page.locator('[data-requirements]')).to_contain_text('70 points')
    pause(1800 if not args.smoke else 300)
    page.get_by_role('button', name='Close challenges', exact=True).tap()
    pause(450)
    pick('Aqua drop')

    if not args.smoke:
        for name, drag in [('Cloud pearl', False), ('Blue star', True), ('Cloud pearl', False),
                           ('Pearl shell', False), ('Blue eye', False), ('Cobalt gem', False),
                           ('Aqua drop', True)]:
            pick(name, drag)
        original = shell.get_attribute('data-ids')
        expect(shell).to_have_attribute('data-count', '8')
        star_index = original.split(',').index('blue-star')
        source = center(page.locator(f'[data-cord-index="{star_index}"]'))
        destination = center(page.locator('[data-aside]'))
        page.mouse.move(*source)
        page.mouse.down()
        pause(350)
        glide(source, destination, 30)
        pause(300)
        page.mouse.up()
        expect(shell).to_have_attribute('data-count', '7')
        expect(shell).to_have_attribute('data-box-ids', 'blue-star')
        cue('return')
        mark('Return the actual Blue star to the right-hand tray')
        pause(900)
        pick('Blue star')
        expect(shell).to_have_attribute('data-box-count', '0')
        action('undo').tap()
        cue('undo')
        pause(900)
        action('undo').tap()
        pause(900)
        expect(shell).to_have_attribute('data-ids', original)
        expect(shell).to_have_attribute('data-box-count', '0')
        mark('Two undo actions restore the exact original chain and tray')
        page.get_by_role('button', name='Back to bead catalog', exact=True).tap()
        button = page.get_by_role('button', name='Pick Aqua drop', exact=True)
        button.scroll_into_view_if_needed()
        button.tap()
        pause(600)
        page.keyboard.press('Escape')
        cue('cancel')
        expect(shell).to_have_attribute('data-ids', original)
        pause(900)
        mark('Cancel a held bead without changing the chain')
        page.screenshot(path=str(out / 'making.png'))
        action('finish').tap()
        expect(shell).to_have_attribute('data-state', 'finished')
        expect(shell).to_have_attribute('data-xp', '40')
        cue('reward')
        expect(shell).to_have_attribute('data-ids', original)
        mark('First commission completed with the actual reward')
        pause(3500)
        action('view-charm').tap()
        pause(4500)
        page.screenshot(path=str(out / 'finished-loop.png'))
        mark('Close-up of the exact closed-loop charm, no simulated 360')
        action('view-phone').tap()
        pause(3800)
        page.screenshot(path=str(out / 'finished-phone.png'))
        mark('The same eight pieces displayed with the phone')
        # Show editing is reversible and a second delivery does not duplicate rewards.
        action('edit').tap()
        expect(shell).to_have_attribute('data-ids', original)
        pause(1200)
        action('finish').tap()
        cue('complete')
        expect(shell).to_have_attribute('data-xp', '40')
        action('view-charm').tap()
        pause(3000)
        mark('Reopen and finish the same piece; no second reward')
    else:
        pause(1200)

    mark('Capture end')
    end_epoch = page.evaluate('(performance.timeOrigin + performance.now()) / 1000')
    cdp.send('Page.stopScreencast')
    captured = page.evaluate('recordingAudit.stop()')
    raw_audio = out / 'game-audio.webm'
    raw_audio.write_bytes(base64.b64decode(captured.pop('base64')))
    (out / 'capture.json').write_text(json.dumps({'frames': frames, 'marks': marks, 'audio': captured,
        'audio_start': audio_start, 'end_epoch': end_epoch, 'source_hashes': source_hashes}, indent=2) + '\n')
    # Outside the movie: mute suppresses new cues and persists on reload.
    sound_count = shell.get_attribute('data-sound-count')
    action('sound').tap()
    pause(300)
    assert page.evaluate('recordingAudit.status()[0].state') == 'suspended'
    if not args.smoke:
        action('edit').tap()
    action('undo').tap()
    assert shell.get_attribute('data-sound-count') == sound_count
    page.reload(wait_until='networkidle')
    expect(shell).to_have_attribute('data-ready', 'true', timeout=45000)
    expect(action('sound')).to_have_attribute('aria-pressed', 'true')
    action('sound').tap()
    expect(shell).to_have_attribute('data-music', 'playing')
    pause(400)
    assert page.evaluate('recordingAudit.status()[0].state') == 'running'
    assert not errors and not failed, (errors, failed)
    browser_version = browser.version
    browser.close()

# Reconstruct the actual frame timing, not a slideshow or a sped-up scripted animation.
frames.sort(key=lambda f: f['epoch'])
assert len(frames) > 20
start_epoch = frames[0]['epoch']
duration = end_epoch - start_epoch
audio_offset = audio_start['epoch'] - start_epoch
assert abs(audio_offset) < 1, audio_offset
concat = ['ffconcat version 1.0']
gaps = []
for index, f in enumerate(frames):
    finish = frames[index + 1]['epoch'] if index + 1 < len(frames) else end_epoch
    gap = max(.001, finish - f['epoch'])
    gaps.append(gap)
    concat.extend([f"file '{f['path']}'", 'option framerate 1000', f'duration {gap:.6f}'])
concat.extend([f"file '{frames[-1]['path']}'", 'option framerate 1000'])
manifest = out / 'frames.ffconcat'
manifest.write_text('\n'.join(concat) + '\n')
movie = out / 'lucky-link-v12-first-level-with-sound.mp4'
run(['ffmpeg', '-hide_banner', '-loglevel', 'warning', '-f', 'concat', '-safe', '0', '-i', str(manifest),
     '-itsoffset', f'{audio_offset:.6f}', '-i', str(raw_audio), '-map', '0:v:0', '-map', '1:a:0',
     '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p',
     '-af', 'aresample=async=1:first_pts=0,apad', '-c:a', 'aac', '-b:a', '192k', '-t', f'{duration:.6f}', '-movflags', '+faststart', str(movie)])
probe = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(movie)]).stdout)
pcm = run(['ffmpeg', '-v', 'error', '-i', str(movie), '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']).stdout
samples = array('f')
samples.frombytes(pcm)
peak = max(map(abs, samples))
rms = (sum(x * x for x in samples) / len(samples)) ** .5
assert .0001 < rms < .2 and .005 < peak < .99, (rms, peak)
video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
audio = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
assert abs(float(video['duration']) - float(audio['duration'])) < .12
assert all(hashlib.sha256((app / name).read_bytes()).hexdigest() == sha for name, sha in source_hashes.items())
for m in marks:
    m['movie_seconds'] = round(m['epoch'] - start_epoch, 3)
for event in captured['events']:
    event['movie_seconds'] = event['epoch'] - start_epoch
if not args.smoke:
    assert {'pickup', 'thread', 'return', 'undo', 'cancel', 'reward', 'complete'} <= {e['event'] for e in captured['events']}
report = {'movie': str(movie), 'smoke': args.smoke, 'browser': browser_version, 'viewport': [390, 844],
          'video_size': [video['width'], video['height']], 'duration': duration, 'frames': len(frames),
          'captured_fps': len(frames) / duration, 'frame_gap_median': statistics.median(gaps), 'frame_gap_max': max(gaps),
          'audio_offset_seconds': audio_offset, 'audio_raw': captured, 'audio_rms': rms, 'audio_peak': peak,
          'video_duration': video['duration'], 'audio_duration': audio['duration'],
          'audio_source': 'Live game Web Audio output, original gain, no microphone or added soundtrack',
          'mute_and_reload': 'passed', 'errors': errors, 'same_origin_failures': failed,
          'source_hashes': source_hashes, 'marks': marks, 'physical_iphone': False, 'version': 'V12 current 2D, not the V13 visual proposal', 'source_url': 'http://127.0.0.1:5114/'}
(out / 'audit.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'movie': str(movie), 'duration': duration, 'frames': len(frames), 'audio_peak': peak, 'audio_rms': rms, 'passed': True}), flush=True)
