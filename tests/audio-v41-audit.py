"""Isolated browser audio integration audit: record the actual Web Audio output.

This harness uses the production sound controller and real local samples. It does
not change the owner's page/storage or claim to be a physical-device listening test.
"""
import argparse
import base64
import json
import re
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

APP = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--phase", default="after")
parser.add_argument("--webkit", action="store_true")
args = parser.parse_args()
ENGINE = "webkit" if args.webkit else "chromium"
OUT = APP / "evidence" / "ice-blue-v41-audio" / args.phase / ENGINE
OUT.mkdir(parents=True, exist_ok=True)

PAGE = """<!doctype html><html><body><main data-tabletop><button id="sound">Sound</button>
<button id="start">Start</button><button id="reveal">Reveal</button><button id="burst">Burst</button></main>
<script type="module">
import {createTabletopSound} from '/src/tabletop-sound.js';
const sound=createTabletopSound(document.querySelector('main'),document.querySelector('#sound'));
document.querySelector('#start').onclick=()=>sound.unlock();
document.querySelector('#reveal').onclick=()=>sound.play('unlock-theme','ice-module-penguin');
document.querySelector('#burst').onclick=()=>{for(let i=0;i<30;i++)sound.play('match','pearl',3);sound.play('unlock-theme','ice-module-penguin');};
window.soundFixture=sound;
</script></body></html>"""

PROBE = """(() => {
  const Real=window.AudioContext||window.webkitAudioContext;
  const original=AudioNode.prototype.connect;
  const contexts=[],sources=[],buses=new Map(),gains=[];
  AudioNode.prototype.connect=function(destination,...args){
    const result=original.call(this,destination,...args);
    if(destination===this.context.destination){
      let bus=buses.get(this.context);
      if(!bus){const stream=this.context.createMediaStreamDestination(),analyser=this.context.createAnalyser(),mix=this.context.createGain();
        original.call(mix,stream);original.call(mix,analyser);bus={stream,analyser,mix};buses.set(this.context,bus);}
      original.call(this,bus.mix);
    }return result;
  };
  class Observed extends Real{constructor(...args){super(...args);this.waiting=Boolean(window.audioResumeDelay);contexts.push(this);
    const createGain=this.createGain.bind(this);this.createGain=()=>{const n=createGain();gains.push(n);return n;};
    for(const [method,kind]of [['createOscillator','tone'],['createBufferSource','sample']]){
      const create=this[method].bind(this);this[method]=(...a)=>{const node=create(...a),record={kind,ended:false,stopped:false};sources.push(record);
        const start=node.start.bind(node),stop=node.stop.bind(node);
        node.start=(...b)=>{record.started=this.currentTime;record.frequency=node.frequency?.value;return start(...b);};
        node.stop=(...b)=>{if(!b.length||b[0]<=this.currentTime)record.stopped=true;return stop(...b);};
        node.addEventListener('ended',()=>record.ended=true);return node;};
    }
  }
    get state(){return this.waiting?'suspended':super.state;}
    resume(){if(!window.audioResumeDelay)return super.resume();return new Promise((resolve,reject)=>setTimeout(()=>super.resume().then(()=>{this.waiting=false;resolve();},reject),window.audioResumeDelay));}
  }
  window.AudioContext=Observed;window.webkitAudioContext=Observed;
  window.audioProbe={sources,gains,status(){return {states:contexts.map(c=>c.state),active:sources.filter(s=>s.started!==undefined&&!s.ended&&!s.stopped).length,
    tones:sources.filter(s=>s.kind==='tone'&&s.started!==undefined).length,samples:sources.filter(s=>s.kind==='sample'&&s.started!==undefined).length,
    rms:[...buses.values()].map(b=>{const data=new Float32Array(b.analyser.fftSize);b.analyser.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((s,n)=>s+n*n,0)/data.length);})};},
    start(){const bus=[...buses.values()][0];this.chunks=[];this.recorder=new MediaRecorder(bus.stream.stream,{mimeType:'audio/webm;codecs=opus'});this.recorder.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data);};this.recorder.start(100);},
    stop(){return new Promise(resolve=>{this.recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(this.chunks).arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));resolve(btoa(text));};this.recorder.stop();});}
  };
})();"""

with sync_playwright() as pw:
    browser = getattr(pw, ENGINE).launch(headless=True)
    context = browser.new_context(viewport={"width": 390, "height": 844})
    context.route("**/audio-v41-fixture", lambda route: route.fulfill(content_type="text/html", body=PAGE))
    context.add_init_script(PROBE)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:5114/audio-v41-fixture", wait_until="networkidle")
    assert page.evaluate("audioProbe.status().tones") == 0
    page.locator("#start").click()
    page.wait_for_function("document.querySelector('main').dataset.audioAssets === 'ready'")
    page.wait_for_timeout(350)
    if ENGINE == "chromium":
        page.evaluate("audioProbe.start()")
    page.wait_for_timeout(1500)
    before = page.evaluate("audioProbe.status()")
    page.locator("#reveal").click()
    page.wait_for_timeout(100)
    revealed = page.evaluate("audioProbe.status()")
    page.wait_for_timeout(5300)
    restored = page.evaluate("audioProbe.gains.map(g=>g.gain.value)")
    if ENGINE == "chromium":
        recording = page.evaluate("audioProbe.stop()")
        webm, mp3 = OUT / "unlock-theme.webm", OUT / "unlock-theme.mp3"
        webm.write_bytes(base64.b64decode(recording))
        subprocess.run(["rtk", "proxy", "ffmpeg", "-v", "error", "-y", "-i", str(webm), "-c:a", "libmp3lame", "-b:a", "192k", str(mp3)], check=True)
        result = subprocess.run(["rtk", "proxy", "ffmpeg", "-hide_banner", "-i", str(mp3), "-filter:a", "volumedetect", "-f", "null", "/dev/null"], capture_output=True, text=True)
        levels = {key: float(value) for key, value in re.findall(r"(mean_volume|max_volume):\s*(-?[\d.]+) dB", result.stderr)}
    else:
        levels = {}
    page.locator("#sound").click()
    page.wait_for_timeout(120)
    muted = page.evaluate("audioProbe.status()")
    assert muted["active"] == 0
    page.locator("#reveal").click()
    page.wait_for_timeout(200)
    assert page.evaluate("audioProbe.status().tones") == muted["tones"]
    page.reload(wait_until="networkidle")
    assert page.locator("main").get_attribute("data-music") == "muted"
    assert page.evaluate("audioProbe.status().tones") == 0
    page.locator("#sound").click()
    page.wait_for_function("document.querySelector('main').dataset.audioAssets === 'ready'")
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(150)
    assert page.evaluate("audioProbe.status().active") == 0
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(150)
    burst_before = page.evaluate("audioProbe.status()")
    page.locator("#burst").click()
    page.wait_for_timeout(100)
    burst_after = page.evaluate("audioProbe.status()")
    page.wait_for_timeout(5500)
    page.locator("#sound").click()
    page.wait_for_timeout(120)
    assert page.evaluate("audioProbe.status().active") == 0
    checks = ["no pre-gesture playback", "mute stops every voice", "mute persists reload", "hidden fixture stops voices", "burst remains bounded"]
    if args.phase == "after":
        page.locator("#sound").click()
        page.locator("#reveal").click()
        page.wait_for_timeout(100)
        page.evaluate("soundFixture.stopReveal()")
        page.wait_for_timeout(250)
        cancelled = page.evaluate("audioProbe.status()")
        assert cancelled["active"] <= 8, cancelled
        checks.append("scene cancellation stops reveal without stopping background")
        context.add_init_script("window.audioResumeDelay=1900")
        page.reload(wait_until="networkidle")
        page.locator("#reveal").click()
        page.wait_for_timeout(2200)
        assert page.evaluate("audioProbe.status().tones") == 15
        checks.append("1900ms resume still plays active reveal score")
        page.reload(wait_until="networkidle")
        page.locator("#reveal").click()
        page.wait_for_timeout(100)
        page.evaluate("soundFixture.stopReveal()")
        page.wait_for_timeout(2200)
        assert page.evaluate("audioProbe.status().tones") == 7
        checks.append("scene cancellation suppresses pending reveal after slow resume")
    report = {"engine": ENGINE, "fixture": "production audio controller; real decoded local samples; no app UI end-to-end claim", "before": before, "revealed": revealed,
              "themeToneCount": revealed["tones"] - before["tones"], "themeSampleCount": revealed["samples"] - before["samples"], "levelsDb": levels,
              "restoredGains": restored[:7], "burstThemeToneCount": burst_after["tones"] - burst_before["tones"], "burstMaxActive": burst_after["active"],
              "checks": checks, "errors": errors, "physicalDevice": False}
    if args.phase == "after":
        assert report["themeToneCount"] >= 8, report
        assert report["burstThemeToneCount"] >= 8, report
        assert report["burstMaxActive"] <= 42, report
    assert not errors, errors
    (OUT / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    browser.close()
    print(json.dumps(report, ensure_ascii=False))
