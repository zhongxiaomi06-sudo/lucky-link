"""V9 native gameplay + offline audio signal checks; no game state injection."""
from pathlib import Path
import json
import sys
import wave
import struct
from playwright.sync_api import sync_playwright, expect

out=Path(__file__).resolve().parents[1]/'evidence'/'sensory-v9'
out.mkdir(parents=True,exist_ok=True)
engine='webkit' if '--webkit' in sys.argv else 'chromium'
with sync_playwright() as p:
    browser=getattr(p,engine).launch(headless=True,args=['--use-angle=metal','--enable-gpu'] if engine=='chromium' else [])
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
    page=context.new_page();errors=[];failed=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('response',lambda r:failed.append(r.url) if '127.0.0.1' in r.url and r.status>=400 else None)
    page.goto('http://127.0.0.1:5114/3d-lab.html?debug',wait_until='networkidle')
    shell=page.locator('[data-lab-shell]')
    expect(shell).to_have_attribute('data-render-ready','true',timeout=45000)
    assert shell.get_attribute('data-sound-count') is None
    def action(name):return page.locator(f'[data-action="{name}"]')
    def cue(name):expect(shell).to_have_attribute('data-last-sound',name)
    def add(names):
        action('collection').tap()
        for name in names:page.get_by_role('button',name=f'Add {name}',exact=True).tap()
        page.get_by_role('button',name='Close bead collection').tap()
    page.locator('[data-box-slot="0"]').tap();cue('pickup')
    action('cancel-pickup').tap();cue('cancel')
    page.locator('[data-box-slot="0"]').tap();page.locator('[data-drop-target]').tap();cue('thread')
    action('undo').tap();cue('undo')
    add(['Cloud pearl']*3);action('finish').tap();cue('retry')
    action('edit').tap();action('sequence').tap();action('clear').tap();cue('return')
    page.get_by_role('button',name='Close threading order').tap()
    ocean=['Blue eye','Aqua drop','Cloud pearl','Pearl shell','Clear quartz','Cobalt gem']
    add(ocean);cue('thread')
    page.wait_for_timeout(2000)
    page.screenshot(path=str(out/f'{engine}-gameplay.png'),style='[data-diagnostics]{display:none!important}')
    action('finish').tap();cue('reward')
    action('showcase-spin').tap();action('showcase-front').tap();page.wait_for_timeout(1000)
    page.screenshot(path=str(out/f'{engine}-loop.png'),style='[data-diagnostics]{display:none!important}')
    action('edit').tap();action('finish').tap();cue('complete')
    action('edit').tap()
    action('sequence').tap();page.get_by_role('button',name='1. Blue eye',exact=True).tap()
    page.get_by_role('button',name='Return to box',exact=True).tap();cue('return')
    count=shell.get_attribute('data-sound-count')
    action('sound').tap()
    action('undo').tap();assert shell.get_attribute('data-sound-count')==count
    page.reload(wait_until='networkidle')
    expect(action('sound')).to_have_attribute('aria-pressed','false')
    action('collection').tap();page.get_by_role('button',name='Add Cloud pearl',exact=True).tap()
    page.get_by_role('button',name='Close bead collection').tap()
    assert shell.get_attribute('data-sound-count') is None
    action('sound').tap();cue('select');action('undo').tap();cue('undo')
    # Exercise an intentionally multicolored free design through the normal collection.
    action('levels').tap();page.get_by_role('button',name='Free DIY',exact=True).tap()
    add(['Rose prism','Amber cube','Aqua drop','Cloud pearl','Pearl shell','Lime gem','Lilac heart','Cobalt gem','Sun orb','Pink dice','Cherries','Jade ring'])
    models=json.loads(shell.get_attribute('data-bead-models'))
    assert len(models)==12 and all(m['version']=='v9' and 0<m['triangles']<8000 for m in models),models
    page.wait_for_timeout(1800)
    page.screenshot(path=str(out/f'{engine}-colors.png'),style='[data-diagnostics]{display:none!important}')
    action('finish').tap();action('showcase-spin').tap();action('showcase-front').tap();page.wait_for_timeout(1000)
    page.screenshot(path=str(out/f'{engine}-color-loop.png'),style='[data-diagnostics]{display:none!important}')
    for w,h in [(320,568),(844,390),(390,844)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(500)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        expect(action('edit')).to_be_in_viewport();expect(action('showcase-spin')).to_be_in_viewport()
    performance_samples=[]
    for _ in range(10):
        page.wait_for_timeout(1000);performance_samples.append(page.locator('[data-fps]').inner_text())
    # The same production sound generator renders into OfflineAudioContext, not a fake oscillator.
    signals=page.evaluate('''async()=>{
      const {createGameSound}=await import('/src/game-sound.js');const results=[];
      for(const event of ['pickup','thread','return','undo','retry','complete','reward']) {
        const ctx=new OfflineAudioContext(1,44100,44100),audio=createGameSound(ctx);
        audio.play(event,'clear-quartz',6);const buffer=await ctx.startRendering();
        const data=Array.from(buffer.getChannelData(0));
        results.push({event,peak:Math.max(...data.map(Math.abs)),rms:Math.sqrt(data.reduce((a,x)=>a+x*x,0)/data.length),data});
      }return results;
    }''')
    samples=[];summary=[]
    for item in signals:
        assert .0001<item['rms']<.1 and 0<item['peak']<.6,item['event']
        samples.extend(item.pop('data'));summary.append(item)
    if engine=='chromium':
        with wave.open(str(out/'game-actions.wav'),'wb') as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(44100)
            f.writeframes(struct.pack('<'+'h'*len(samples),*[round(max(-1,min(1,x))*32767) for x in samples]))
    burst=page.evaluate('''async()=>{
      const {createGameSound}=await import('/src/game-sound.js');
      const ctx=new OfflineAudioContext(1,44100,44100),audio=createGameSound(ctx);
      let accepted=0;for(let i=0;i<100;i++)if(audio.play('thread','clear-quartz',6))accepted++;
      const voices=audio.voices,buffer=await ctx.startRendering();
      return {accepted,voices,remaining:audio.voices,peak:Math.max(...Array.from(buffer.getChannelData(0),Math.abs))};
    }''')
    assert burst['voices']<=24 and burst['remaining']==0 and burst['peak']<.6,burst
    fallback=browser.new_context(viewport={'width':390,'height':844})
    fallback.add_init_script("window.AudioContext=class {constructor(){throw new Error('Audio unavailable for test')}};window.webkitAudioContext=window.AudioContext;")
    silent=fallback.new_page();silent_errors=[]
    silent.on('pageerror',lambda e:silent_errors.append(str(e)))
    silent.goto('http://127.0.0.1:5114/3d-lab.html',wait_until='networkidle')
    expect(silent.locator('[data-lab-shell]')).to_have_attribute('data-render-ready','true',timeout=45000)
    silent.locator('[data-action="collection"]').click()
    for _ in range(3):silent.get_by_role('button',name='Add Cloud pearl',exact=True).click()
    silent.get_by_role('button',name='Close bead collection').click();silent.locator('[data-action="finish"]').click()
    expect(silent.locator('[data-lab-shell]')).to_have_attribute('data-state','finished')
    assert not silent_errors,silent_errors
    fallback.close()
    assert not errors and not failed,(errors,failed)
    report={'engine':engine,'native_gameplay':'pass','muted_reload':'pass','first_reward_only':'pass','mobile_layout':'pass','audio':summary,'burst':burst,'audio_unavailable':'pass','models':models,'idle_fps_samples':performance_samples,'errors':errors,'failed_same_origin':failed}
    (out/f'{engine}.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report),flush=True)
    browser.close()
