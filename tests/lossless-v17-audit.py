"""Verify actual browser decoded pixels and whole-app PNG fallback in isolation."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--webkit', action='store_true')
args = parser.parse_args()
app = Path(__file__).resolve().parents[1]
files = [f for f in json.loads((app / 'content/lossless-delivery-v17.json').read_text())['files'] if f['activeDelivery']]
with sync_playwright() as p:
    engine = 'webkit' if args.webkit else 'chromium'
    browser = getattr(p, engine).launch(headless=True)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:5114/', wait_until='networkidle')
    page.wait_for_function("document.querySelector('[data-tabletop]')?.dataset.ready === 'true'")
    decoded = page.evaluate("""async files => {
      const read = async name => {
        const image = new Image(); image.src='/assets/'+name; await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
        return {width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};
      };
      const results=[];
      for(const pair of files){
        const a=await read(pair.source),b=await read(pair.target);
        let mismatch=0,maxDifference=0;
        for(let i=0;i<a.data.length;i++)if(a.data[i]!==b.data[i]){mismatch++;maxDifference=Math.max(maxDifference,Math.abs(a.data[i]-b.data[i]));}
        results.push({source:pair.source,target:pair.target,width:a.width,height:a.height,
          equalDimensions:a.width===b.width&&a.height===b.height,mismatchedChannels:mismatch,maxDifference});
      }
      const {loadTabletopArt}=await import('/src/tabletop-art.js');
      const art=await loadTabletopArt();
      return {files:results,sprites:Object.fromEntries([...art.sprites].map(([id,c])=>[id,c.toDataURL()]))};
    }""", files)
    assert all(f['equalDimensions'] and f['mismatchedChannels'] == 0 for f in decoded['files']), json.dumps(decoded['files'])
    assert len(decoded['sprites']) == 53
    assert errors == []
    context.close()
    fallback = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    fallback.route('**/*-lossless.webp', lambda route: route.abort())
    page = fallback.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:5114/', wait_until='networkidle')
    page.wait_for_function("document.querySelector('[data-tabletop]')?.dataset.ready === 'true'")
    recovered = page.evaluate("""async () => {
      const {loadTabletopArt}=await import('/src/tabletop-art.js');const art=await loadTabletopArt();
      return {background:art.backgroundUrl,sprites:Object.fromEntries([...art.sprites].map(([id,c])=>[id,c.toDataURL()]))};
    }""")
    assert recovered['sprites'] == decoded['sprites']
    assert recovered['background'].endswith('tabletop-room-v17.png')
    assert page.evaluate('localStorage.getItem("lucky-link.collection.v1")') is None
    page.get_by_role('button', name='Make yours', exact=True).tap()
    assert page.locator('[data-tabletop]').get_attribute('data-state') == 'compose'
    assert errors == []
    print(json.dumps({'engine': engine, 'browserVersion': browser.version, 'files': decoded['files'],
                      'normalAndFallbackSpritesEqual': 53, 'fallbackBackground': recovered['background'],
                      'fallbackEnterDIY': True, 'pageErrors': errors, 'physicalIphone': False,
                      'limits': 'Expected WebP request aborts are a fixture, not real network failures.'}), flush=True)
    fallback.close()
    browser.close()
