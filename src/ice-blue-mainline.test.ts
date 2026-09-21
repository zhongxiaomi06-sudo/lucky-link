import{describe,expect,it}from'vitest';
import{DEFAULT_PRODUCT_URL,ICE_BLUE_MODULE_IDS,MAINLINE_TARGETS,claimMainlineClear,drawCoupon,mainlineTarget,nextMainlineModule,normalizeMainline}from'./ice-blue-mainline.js';

describe('ice-blue mainline progression',()=>{
  it('unlocks all eleven complete modules once, in the approved order',()=>{
    let state=normalizeMainline(null);const unlocked=[];
    for(let i=0;i<11;i++){const result=claimMainlineClear(state,{random:()=>0,now:i});state=result.state;unlocked.push(result.module?.id);}
    expect(unlocked).toEqual(ICE_BLUE_MODULE_IDS);expect(nextMainlineModule(state)).toBeNull();
  });
  it('raises the target by 100 through the eleven progression steps',()=>{
    let state=normalizeMainline(null);const targets=[];
    for(let i=0;i<11;i++){targets.push(mainlineTarget(state));state=claimMainlineClear(state,{random:()=>0}).state;}
    expect(targets).toEqual(MAINLINE_TARGETS);
  });
  it('keeps awarding one coupon after the module collection is complete',()=>{
    const full={unlocked:[...ICE_BLUE_MODULE_IDS],coupons:[],clears:11};const result=claimMainlineClear(full,{random:()=>.95,now:99});
    expect(result.module).toBeNull();expect(result.coupon.value).toBe(15);expect(result.state.coupons).toHaveLength(1);
  });
  it('uses the confirmed 60/30/10 coupon boundaries',()=>{
    expect(drawCoupon(()=>.5999).value).toBe(5);expect(drawCoupon(()=>.6).value).toBe(10);expect(drawCoupon(()=>.8999).value).toBe(10);expect(drawCoupon(()=>.9).value).toBe(15);
  });
  it('only restores complete HTTPS product links without embedded credentials',()=>{
    const moduleId=ICE_BLUE_MODULE_IDS[0];
    for(const productUrl of ['javascript:alert(1)','data:text/html,hello','http://shop.example.com/item','https://name:secret@shop.example.com/item','/products/item',' https://shop.example.com/item',{},null]){
      const restored=normalizeMainline({productUrl,unlocked:[moduleId],coupons:[{value:10,claimedAt:12}]});
      expect(restored.productUrl).toBe(DEFAULT_PRODUCT_URL);
      expect(restored.unlocked).toEqual([moduleId]);
      expect(restored.coupons).toEqual([{value:10,claimedAt:12}]);
    }
    expect(normalizeMainline({productUrl:'https://shop.example.com/item?variant=ice-blue'}).productUrl).toBe('https://shop.example.com/item?variant=ice-blue');
  });
});
