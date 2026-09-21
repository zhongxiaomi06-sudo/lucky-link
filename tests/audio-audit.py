"""V15 real-input audio audit; isolated headless contexts, never owner storage.

Chromium also captures the app's actual audio bus (not microphone/system audio).
Visibility/lifecycle and failure cases below are explicitly simulated fixtures.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--webkit', action='store_true')
parser.add_argument('--out', type=Path, help='Versioned evidence root; preserve earlier audio records')
args = parser.parse_args()
app = Path(__file__).resolve().parents[1]
engine = 'webkit' if args.webkit else 'chromium'
out = (args.out or app / 'evidence/audio-v15') / engine
out.mkdir(parents=True, exist_ok=True)
checks, errors = [], []
PROBE = """(() => {
  const Real = window.AudioContext || window.webkitAudioContext;
  window.audioProbe = {contexts:[], nodes:[], status() { return {contexts:this.contexts.map(c=>c.state),
    started:this.nodes.filter(n=>n.started).length, buffers:this.nodes.filter(n=>n.kind==='buffer'&&n.started).length,
    active:this.nodes.filter(n=>n.started&&!n.stopped&&!n.ended).length}; }};
  if (!Real) return;
  class Observed extends Real { constructor(...args) { super(...args); audioProbe.contexts.push(this);
    for (const [method, kind] of [['createBufferSource','buffer'],['createOscillator','oscillator']]) {
      const create = this[method].bind(this);
      this[method] = (...a) => { const node = create(...a), record = {kind,started:false,stopped:false,ended:false};
        audioProbe.nodes.push(record); const start = node.start.bind(node), stop = node.stop.bind(node);
        node.start = (...b) => { record.started=true; return start(...b); };
        node.stop = (...b) => { if (!b.length || b[0]<=this.currentTime) record.stopped=true; return stop(...b); };
        node.addEventListener('ended',()=>record.ended=true); return node; };
    }
  }}
  window.AudioContext = Observed; window.webkitAudioContext = Observed;
})();"""

def passed(name):
    checks.append(name)
    print(json.dumps({'engine': engine, 'passed': name}), flush=True)

with sync_playwright() as p:
    browser = getattr(p, engine).launch(headless=True)
    def fresh(script='', routes=None, recording=False):
        ctx = browser.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        if recording: ctx.add_init_script(path=str(Path(__file__).with_name('record-audio-hook.js')))
        ctx.add_init_script(PROBE)
        if script: ctx.add_init_script(script)
        if routes: ctx.route('**/assets/audio/*', routes)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:5114/?studio=1', wait_until='networkidle')
        expect(page.locator('[data-tabletop]')).to_have_attribute('data-ready','true',timeout=45000)
        return ctx, page

    ctx, page = fresh(recording=engine=='chromium')
    shell = page.locator('[data-tabletop]')
    def tap(name): page.get_by_role('button', name=name, exact=True).tap()
    def add(name):
        bead = page.get_by_role('button', name='Pick '+name, exact=True)
        bead.scroll_into_view_if_needed(); bead.tap(); page.wait_for_timeout(250)
        tap('Thread held bead'); page.wait_for_timeout(400)
    assert page.evaluate('audioProbe.status().started') == 0
    passed('No audio context or source started before gesture')
    tap('Beads')
    expect(shell).to_have_attribute('data-audio-assets','ready')
    expect(shell).to_have_attribute('data-music','playing')
    expect(shell).to_have_attribute('data-ambient','playing')
    passed('Four local recordings decode after gesture; music and ambience start')
    if engine=='chromium': page.evaluate('recordingAudit.start()')
    page.wait_for_timeout(800)
    for name in ['Aqua drop','Cloud pearl','Rose prism']: add(name)
    expect(shell).to_have_attribute('data-count','3')
    expect(shell).to_have_attribute('data-sound-engine','samples')
    expect(shell).to_have_attribute('data-last-sound','thread')
    assert page.evaluate('audioProbe.status().buffers') >= 7
    page.locator('[data-cord-index="0"]').tap(); tap('Return to box')
    expect(shell).to_have_attribute('data-last-sound','return'); page.wait_for_timeout(500)
    tap('Undo last change'); expect(shell).to_have_attribute('data-count','3')
    passed('Real touch pickup, thread, return and undo use decoded BufferSources')
    tap('Unlock hidden beads'); tap('Start')
    game = page.locator('[data-dialog="match"]')
    tiles = game.locator('[data-tile]')
    names = tiles.evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("aria-label").split(", bead ")[0])')
    for name in dict.fromkeys(names):
        for i, value in enumerate(names):
            if value == name: tiles.nth(i).tap(); page.wait_for_timeout(170)
        if game.get_attribute('data-game-state')=='playing': expect(shell).to_have_attribute('data-last-sound','match')
        page.wait_for_timeout(450)
    expect(game).to_have_attribute('data-game-state','won')
    expect(shell).to_have_attribute('data-last-sound','reward')
    expect(shell).to_have_attribute('data-collected','27')
    page.wait_for_timeout(1200)
    passed('Six real pairs trigger distinct match cues and one unlock reward')
    if engine=='chromium':
        recording = page.evaluate('recordingAudit.stop()')
        (out/'game-audio.webm').write_bytes(base64.b64decode(recording.pop('base64')))
        (out/'recording-events.json').write_text(json.dumps(recording, indent=2))
        subprocess.run(['rtk','proxy','ffmpeg','-v','error','-y','-i',str(out/'game-audio.webm'),'-c:a','libmp3lame','-b:a','160k',str(out/'game-audio.mp3')],check=True)
    tap('Use bead'); tap('Thread held bead')
    tap('Mute soundtrack'); expect(shell).to_have_attribute('data-music','muted')
    page.wait_for_timeout(100)
    assert page.evaluate('audioProbe.status().active') == 0
    before = page.evaluate('audioProbe.status().started')
    add('Cloud pearl')
    assert page.evaluate('audioProbe.status().started') == before
    page.reload(wait_until='networkidle'); expect(shell).to_have_attribute('data-ready','true')
    expect(shell).to_have_attribute('data-music','muted'); assert page.evaluate('audioProbe.status().started') == 0
    passed('Mute stops every voice, suppresses new cues and survives reload')
    tap('Turn on soundtrack'); expect(shell).to_have_attribute('data-audio-assets','ready')
    expect(shell).to_have_attribute('data-ambient','playing')
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(100); assert page.evaluate('audioProbe.status().active') == 0
    before = shell.get_attribute('data-sound-count')
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
    expect(shell).to_have_attribute('data-ambient','playing'); assert shell.get_attribute('data-sound-count') == before
    page.evaluate("window.dispatchEvent(new Event('pagehide'))")
    page.wait_for_timeout(100); assert page.evaluate('audioProbe.status().active') == 0
    page.evaluate("window.dispatchEvent(new Event('pageshow'))")
    expect(shell).to_have_attribute('data-ambient','playing')
    passed('Simulated visibility and page-cache lifecycle stop/restart ambience without old cues')
    for _ in range(4): tap('Mute soundtrack'); tap('Turn on soundtrack')
    tap('Mute soundtrack'); page.wait_for_timeout(200)
    assert page.evaluate('audioProbe.status().active') == 0
    passed('Rapid mute/unmute leaves no active or queued sources')
    ctx.close()

    for mode in ['fetch-failure','decode-failure','partial','no-audio-api','slow-resume','late-decode']:
        script=''; routes=None
        if mode=='fetch-failure': routes=lambda route: route.abort()
        if mode=='decode-failure': routes=lambda route: route.fulfill(status=200,content_type='audio/wav',body=b'not audio')
        if mode=='partial': routes=lambda route: route.abort() if 'beads' in route.request.url else route.continue_()
        if mode=='no-audio-api': script='window.AudioContext=undefined;window.webkitAudioContext=undefined;'
        if mode=='slow-resume': script="""const Base=window.AudioContext;window.AudioContext=class extends Base{
          get state(){return this.waiting?'suspended':super.state;}
          resume(){this.waiting=true;return new Promise((resolve,reject)=>setTimeout(()=>super.resume().then(()=>{this.waiting=false;resolve();},reject),500));}};"""
        if mode=='late-decode': script="""const Base=window.AudioContext;window.AudioContext=class extends Base{
          decodeAudioData(data){return new Promise((resolve,reject)=>setTimeout(()=>super.decodeAudioData(data).then(resolve,reject),750));}};"""
        fxctx, page = fresh(script=script, routes=routes)
        shell = page.locator('[data-tabletop]')
        page.get_by_role('button',name='Pick Aqua drop',exact=True).tap()
        page.get_by_role('button',name='Thread held bead',exact=True).tap()
        expect(shell).to_have_attribute('data-count','1')
        if mode in ['slow-resume','late-decode']:
            page.get_by_role('button',name='Mute soundtrack',exact=True).tap()
            before=page.evaluate('audioProbe.status().started'); page.wait_for_timeout(1300)
            assert page.evaluate('audioProbe.status().active')==0
            assert page.evaluate('audioProbe.status().started')==before
        elif mode=='no-audio-api': expect(shell).to_have_attribute('data-music','unavailable')
        else:
            expect(shell).to_have_attribute('data-audio-assets','partial' if mode=='partial' else 'fallback')
            expect(shell).to_have_attribute('data-sound-engine','fallback')
            assert page.evaluate('audioProbe.status().started')>0
        passed(mode+' fixture keeps placement playable and no leaked sound')
        fxctx.close()
    assert errors==[], errors
    passed('No uncaught page errors')
    browser.close()

report = {'engine':engine,'checks':checks,'errors':errors,'realDevice':False,
    'limits':['Headless browser; final listening and physical iPhone remain pending','Visibility/lifecycle, API and network faults are explicit fixtures'],
    'sourceHashes':{str(f.relative_to(app)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((app/'src').glob('*')) if f.is_file()}}
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
