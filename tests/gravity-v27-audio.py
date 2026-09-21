"""Record the V27 gravity-game music, impacts, clears and reward from the app bus."""
import argparse
import base64
import json
import re
import subprocess
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out',type=Path,default=Path(__file__).resolve().parents[1]/'evidence'/'gravity-v27-audio')
args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    context.add_init_script(path=str(Path(__file__).with_name('record-audio-hook.js')))
    context.add_init_script("""try{localStorage.clear()}catch{};let seed=2147483646;Math.random=()=>((seed=seed*48271%2147483647)-1)/2147483646;""")
    page=context.new_page();errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('console',lambda message:errors.append(message.text) if message.type=='error' else None)
    page.goto('http://127.0.0.1:5114/',wait_until='networkidle')
    shell=page.locator('[data-tabletop]');expect(shell).to_have_attribute('data-ready','true',timeout=45000)
    page.locator('[data-home-hook]').tap()
    game=page.locator('[data-dialog="match"]');expect(game).to_have_attribute('data-game-state','playing')
    expect(shell).to_have_attribute('data-audio-assets','ready',timeout=8000)
    expect(shell).to_have_attribute('data-music','playing')
    expect(shell).to_have_attribute('data-ambient','playing')
    page.evaluate('recordingAudit.start()')
    field=game.locator('[data-gravity-field]');box=field.bounding_box();lanes={};positions=(.09,.255,.42,.58,.745,.91)
    drops=0
    while game.get_attribute('data-game-state')=='playing' and drops<40:
        preview=game.locator('[data-gravity-next] img').first
        material=preview.get_attribute('data-material')
        if material not in lanes:lanes[material]=positions[len(lanes)%len(positions)]
        page.touchscreen.tap(box['x']+box['width']*lanes[material],box['y']+42)
        page.wait_for_timeout(410);drops+=1
    expect(game).to_have_attribute('data-game-state','won',timeout=6000)
    page.wait_for_timeout(1400)
    recording=page.evaluate('recordingAudit.stop()')
    webm=args.out/'gravity-v27-soundscape.webm';mp3=args.out/'gravity-v27-soundscape.mp3'
    webm.write_bytes(base64.b64decode(recording.pop('base64')))
    subprocess.run(['rtk','proxy','ffmpeg','-v','error','-y','-i',str(webm),'-c:a','libmp3lame','-b:a','192k',str(mp3)],check=True)
    measured=subprocess.run(['rtk','proxy','ffmpeg','-hide_banner','-i',str(mp3),'-filter:a','volumedetect','-f','null','/dev/null'],capture_output=True,text=True)
    levels={key:float(value) for key,value in re.findall(r'(mean_volume|max_volume):\s*(-?[\d.]+) dB',measured.stderr)}
    events=[entry.get('event') for entry in recording['events'] if entry.get('event')]
    for required in ['impact','match','reward']:
        assert required in events,(required,events)
    assert webm.stat().st_size>1000 and mp3.stat().st_size>1000
    assert levels.get('max_volume',0)<0 and levels.get('max_volume',-100)>-18,levels
    assert not errors,errors
    report={'drops':drops,'durationSeconds':recording['stopped']-recording['started'],'events':events,'eventTypes':sorted(set(events)),'levelsDb':levels,'bytes':{'webm':webm.stat().st_size,'mp3':mp3.stat().st_size},'runtimeErrors':errors,'physicalDevice':False}
    (args.out/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    browser.close()

print(args.out/'report.json')
