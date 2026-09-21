import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Scene } from 'three';

const captured=vi.hoisted(()=>({scene:null as Scene|null,rendererDisposed:vi.fn(),targetDisposed:vi.fn(),pmremDisposed:vi.fn()}));
vi.mock('three',async importOriginal=>{
  const actual=await importOriginal<typeof import('three')>();
  return{...actual,
    WebGLRenderer:class{
      shadowMap={enabled:false};pixelRatio=1;
      setPixelRatio(value:number){this.pixelRatio=value;}
      getPixelRatio(){return this.pixelRatio;}
      setSize(){}
      render(scene:Scene){captured.scene=scene;}
      dispose(){captured.rendererDisposed();}
    },
    PMREMGenerator:class{
      fromScene(){return{texture:new actual.Texture(),dispose:captured.targetDisposed};}
      dispose(){captured.pmremDisposed();}
    },
  };
});
import { mountReward3D } from './reward-3d-viewer.js';

class CanvasStub extends EventTarget{
  dataset:Record<string,string>={};clientWidth=360;clientHeight=430;width=360;height=430;captured:number|null=null;
  setPointerCapture(id:number){this.captured=id;}
  hasPointerCapture(id:number){return this.captured===id;}
  releasePointerCapture(){this.captured=null;}
  pointer(type:string,x:number,id=1){this.dispatchEvent(Object.assign(new Event(type),{pointerId:id,clientX:x}));}
}
let callbacks:Map<number,FrameRequestCallback>,nextId:number,now:number;
function tick(count=1){for(let index=0;index<count;index++){now+=40;const frame=[...callbacks.values()];callbacks.clear();frame.forEach(callback=>callback(now));}}
const root=()=>captured.scene!.children.find(child=>child.type==='Group')!;

beforeEach(()=>{
  callbacks=new Map();nextId=0;now=0;vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callbacks.set(++nextId,callback);return nextId;});
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>callbacks.delete(id));
});
afterEach(()=>vi.unstubAllGlobals());

describe('reward viewer lifecycle',()=>{
  it('keeps presentation time aligned with the reveal when foreground rendering stalls',()=>{
    const canvas=new CanvasStub(),viewer=mountReward3D(canvas,{id:'ice-module-penguin'});
    tick();now+=2800;tick();
    expect(canvas.dataset.motion).toBe('inspect');
    viewer.destroy();
  });

  it('holds the chosen view after release rather than restoring automatic rotation',()=>{
    const canvas=new CanvasStub(),viewer=mountReward3D(canvas,{id:'ice-module-penguin'});
    tick(90);expect(canvas.dataset.motion).toBe('inspect');
    const initial=root().rotation.y;
    canvas.pointer('pointerdown',100);canvas.pointer('pointermove',200);canvas.pointer('pointerup',200);
    tick(160);const chosen=root().rotation.y;
    expect(chosen).toBeCloseTo(initial+1.2,3);
    tick(160);expect(root().rotation.y).toBeCloseTo(chosen,3);
    viewer.destroy();
  });

  it('pauses without destroying the model and resumes the same reveal phase',()=>{
    const canvas=new CanvasStub(),viewer=mountReward3D(canvas,{id:'ice-module-penguin'});
    tick(20);expect(canvas.dataset.motion).toBe('flight');const yaw=root().rotation.y;
    viewer.pause();now+=60000;tick(10);
    expect(callbacks.size).toBe(0);expect(root().rotation.y).toBe(yaw);
    expect(canvas.dataset.loaded).toBe('true');expect(captured.rendererDisposed).not.toHaveBeenCalled();
    viewer.resume();viewer.resume();expect(callbacks.size).toBe(1);tick();
    expect(root().rotation.y).toBe(yaw);tick(70);expect(canvas.dataset.motion).toBe('inspect');
    viewer.destroy();
  });

  it('releases capture and the full environment render target exactly once',()=>{
    const canvas=new CanvasStub(),viewer=mountReward3D(canvas,{id:'ice-module-penguin',reducedMotion:true});
    expect(root().rotation.y).toBe(-.18);canvas.pointer('pointerdown',100);
    expect(canvas.captured).toBe(1);viewer.destroy();viewer.destroy();viewer.resume();
    expect(canvas.captured).toBeNull();expect(canvas.dataset.loaded).toBeUndefined();expect(callbacks.size).toBe(0);
    expect(captured.targetDisposed).toHaveBeenCalledTimes(1);
    expect(captured.pmremDisposed).toHaveBeenCalledTimes(1);
    expect(captured.rendererDisposed).toHaveBeenCalledTimes(1);
  });
});
