"""Capture the real full-page game and its own audio, with timestamp-aligned MP4 export.

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
parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parents[1] / 'evidence' / 'gameplay-recording')
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
    page.goto('http://127.0.0.1:5114/3d-lab.html?debug=1', wait_until='networkidle')
    shell = page.locator('[data-lab-shell]')
    expect(shell).to_have_attribute('data-render-ready', 'true', timeout=45000)
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

    def pick(name):
        button = page.get_by_role('button', name='Pick ' + name, exact=True)
        for _ in range(6):
            if button.count():
                break
            action('box-next').tap()
            pause(300)
        expect(button).to_be_visible()
        button.tap()
        cue('pickup')
        pause(500)
        page.locator('[data-drop-target]').tap()
        cue('thread')
        pause(750)
        mark('Thread ' + name)

    pause(1000)
    mark('Start: supported phone and bead box')
    action('levels').tap()
    expect(page.locator('[data-requirements]')).to_contain_text('70 points')
    pause(2200 if not args.smoke else 400)
    page.get_by_role('button', name='Close challenges', exact=True).tap()
    pick('Blue eye')

    if not args.smoke:
        for name in ['Aqua drop', 'Cloud pearl', 'Pearl shell', 'Clear quartz', 'Cobalt gem']:
            pick(name)
        original = shell.get_attribute('data-composition')
        expect(page.locator('[data-count]')).to_have_text('6')
        # Actual chain-to-box pointer transfer and reuse; not a scripted state mutation.
        points = json.loads(shell.get_attribute('data-bead-points'))
        box = json.loads(shell.get_attribute('data-box-center'))
        page.mouse.move(points[0]['x'], points[0]['y'])
        page.mouse.down()
        pause(450)
        page.mouse.move(box['x'], box['y'], steps=24)
        pause(400)
        page.mouse.up()
        expect(page.locator('[data-count]')).to_have_text('5')
        expect(shell).to_have_attribute('data-box-contents', 'blue-eye')
        cue('return')
        mark('Return bead to right-hand box')
        pause(800)
        # A successful drag already opens Set aside; do not toggle back to the catalogue.
        expect(shell).to_have_attribute('data-box-tab', 'box')
        page.get_by_role('button', name='Pick Blue eye from set-aside box', exact=True).tap()
        pause(500)
        page.locator('[data-drop-target]').tap()
        expect(page.locator('[data-count]')).to_have_text('6')
        expect(shell).to_have_attribute('data-box-contents', '')
        pause(800)
        action('undo').tap()
        cue('undo')
        pause(700)
        action('undo').tap()
        expect(shell).to_have_attribute('data-composition', original)
        action('box-mode').tap()
        mark('Reuse and paired undo preserve the original chain')
        # Cancel a held bead without changing the draft.
        page.locator('[data-box-slot="0"]').tap()
        pause(700)
        action('cancel-pickup').tap()
        cue('cancel')
        expect(shell).to_have_attribute('data-composition', original)
        pause(1200)
        page.screenshot(path=str(out / 'making.png'))
        action('finish').tap()
        cue('reward')
        expect(shell).to_have_attribute('data-delivery-passed', 'true')
        mark('First commission complete: reward and 360 orbit')
        for _ in range(5):
            pause(5000)
        expect(shell).to_have_attribute('data-showcase-motion', 'complete')
        expect(shell).to_have_attribute('data-showcase-degrees', '360')
        page.screenshot(path=str(out / 'finished-loop.png'))
        mark('A full real-time 360-degree orbit stopped automatically')
        action('score').tap()
        expect(page.locator('[data-reward-reveal]')).to_contain_text('+40 Studio XP')
        pause(2200)
        page.get_by_role('button', name='Close score and reward', exact=True).tap()
        action('view-phone').tap()
        pause(2500)
        mark('Finished loop on the phone')
        action('next').tap()
        expect(page.locator('[data-level-name]')).to_have_text('Rose letter')
        pause(1000)
        mark('Next letter unlocked')
        action('levels').tap()
        page.get_by_role('button', name='Free DIY', exact=True).tap()
        for name in ['Rose prism', 'Cloud pearl', 'Lilac heart', 'Amber cube', 'Jade ring', 'Sun orb', 'Aqua drop', 'Cherries']:
            pick(name)
        action('finish').tap()
        cue('complete')
        pause(2500)
        action('showcase-spin').tap()
        action('showcase-front').tap()
        pause(1600)
        page.screenshot(path=str(out / 'color-loop.png'))
        mark('Eight-color free DIY with completion sound')
    else:
        pause(1800)

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
    expect(shell).to_have_attribute('data-render-ready', 'true', timeout=45000)
    expect(action('sound')).to_have_attribute('aria-pressed', 'false')
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
movie = out / 'lucky-link-gameplay-with-sound.mp4'
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
          'source_hashes': source_hashes, 'marks': marks, 'physical_iphone': False}
(out / 'audit.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'movie': str(movie), 'duration': duration, 'frames': len(frames), 'audio_peak': peak, 'audio_rms': rms, 'passed': True}), flush=True)
