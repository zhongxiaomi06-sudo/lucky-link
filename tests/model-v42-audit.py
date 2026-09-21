"""Isolated real-WebGL star preview; no gameplay, saves, or aesthetic approval."""
import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url',default='http://127.0.0.1:5114')
args=parser.parse_args()
output=Path(__file__).resolve().parents[1]/'evidence'/'material-model-v42'
output.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'engine':'chromium','viewport':{'width':390,'height':844},'isolatedFixture':True,'realWebGL':True,'viewerStubbed':False,'syntheticPointer':False,'realDevice':False,'userStorageTouched':False,'aestheticApproval':False,'pageErrors':[],'consoleErrors':[],'views':[],'status':'running'}
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True)
    page=browser.new_page(viewport=report['viewport'],device_scale_factor=1,reduced_motion='reduce')
    page.on('pageerror',lambda error:report['pageErrors'].append(str(error)))
    page.on('console',lambda message:report['consoleErrors'].append(message.text) if message.type=='error' else None)
    try:
        page.route('**/__model-v42',lambda route:route.fulfill(content_type='text/html',body='''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/tabletop.css"><link rel="stylesheet" href="/src/collection.css"><style>*{box-sizing:border-box}body{margin:0}</style><div class="tt-app"><dialog class="studio-dialog match-dialog gravity-dialog is-reveal" data-game-state="won"><section class="match-reveal"><div class="unlock-world" aria-hidden="true"><i class="unlock-depth"></i><i class="unlock-beam"></i><i class="unlock-ring"></i><i class="unlock-flare"></i></div><div class="reveal-stage"><div class="reveal-aura"></div><div class="prize-image reveal-prize"><canvas data-reward-3d></canvas></div></div><div class="coupon-ticket"><strong>¥5</strong></div><div class="match-end-actions"><button type="button" class="icon-cta" aria-label="Play again"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21"/><path d="M33 20a10 10 0 1 0 0 8m0-13v7h-7"/></svg></button><button type="button" class="icon-cta" aria-label="View item"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21"/><path d="M14 18h20l-2 17H16Zm5 0a5 5 0 0 1 10 0"/></svg></button></div></section></dialog></div>'''))
        page.goto(args.base_url+'/__model-v42')
        page.wait_for_load_state('networkidle')
        page.evaluate('''async()=>{
          document.querySelector('dialog').showModal();
          const {mountReward3D}=await import('/src/reward-3d-viewer.js');
          window.__viewer=mountReward3D(document.querySelector('canvas'),{id:'ice-module-star-drop',reducedMotion:true,onError:error=>{window.__renderError=String(error);}});
        }''')
        page.wait_for_function("document.querySelector('canvas').dataset.loaded==='true' || window.__renderError")
        assert not page.evaluate('window.__renderError||null')
        report['geometry']=page.evaluate('''async()=>{
          const {createStarCharm}=await import('/src/charm-geometry.js');
          const group=createStarCharm(),meshes=[];
          group.traverse(mesh=>{
            if(!mesh.geometry)return;
            const g=mesh.geometry;g.computeBoundingBox();
            const positions=g.attributes.position,indices=g.index;
            const vertex=index=>[positions.getX(index),positions.getY(index),positions.getZ(index)];
            const key=v=>v.map(value=>Math.round(value*1e5)).join(',');
            const edges=new Map();let volume=0,zeroArea=0;
            const count=indices?indices.count:positions.count;
            for(let index=0;index<count;index+=3){
              const [a,b,c]=[0,1,2].map(offset=>vertex(indices?indices.getX(index+offset):index+offset));
              for(const [p,q] of [[a,b],[b,c],[c,a]]){const edge=[key(p),key(q)].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}
              const cross=[b[1]*c[2]-b[2]*c[1],b[2]*c[0]-b[0]*c[2],b[0]*c[1]-b[1]*c[0]];
              volume+=(a[0]*cross[0]+a[1]*cross[1]+a[2]*cross[2])/6;
              const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
              const area=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]);
              if(area<1e-10)zeroArea++;
            }
            meshes.push({name:mesh.name,triangles:count/3,bounds:{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()},position:mesh.position.toArray(),scale:mesh.scale.toArray(),nonManifoldEdges:[...edges.values()].filter(count=>count!==2).length,zeroAreaTriangles:zeroArea,signedVolume:volume,transmission:mesh.material.transmission,transparent:mesh.material.transparent});
          });
          const geometries=new Set(),materials=new Set();group.traverse(mesh=>{if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)materials.add(mesh.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
          return{meshCount:meshes.length,triangles:meshes.reduce((sum,mesh)=>sum+mesh.triangles,0),meshes};
        }''')
        current=-.18
        for label,target in [('front',0),('angle-45',math.pi/4),('side-90',math.pi/2),('back-180',math.pi)]:
            bounds=page.locator('[data-reward-3d]').bounding_box()
            assert bounds and bounds['width']>0 and bounds['height']>0
            start_x=bounds['x']+bounds['width']/2-70
            y=bounds['y']+bounds['height']/2
            delta=(target-current)/.012
            page.mouse.move(start_x,y)
            page.mouse.down()
            page.mouse.move(start_x+delta,y,steps=4)
            page.mouse.up()
            page.wait_for_timeout(220)
            path=output/f'{label}-390x844.png'
            page.screenshot(path=str(path))
            report['views'].append({'view':label,'targetYawRadians':target,'pointerDeltaX':delta,'canvas':bounds,'screenshot':str(path)})
            current=target
        page.evaluate('window.__viewer.destroy()')
        assert not report['pageErrors'],report['pageErrors']
        assert not report['consoleErrors'],report['consoleErrors']
        report['status']='passed'
    except Exception as error:
        report['status']='failed';report['failure']=repr(error)
        raise
    finally:
        report['finishedAt']=datetime.now(timezone.utc).isoformat()
        (output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({'status':report['status'],'report':str(output/'report.json')},ensure_ascii=False))
        browser.close()
