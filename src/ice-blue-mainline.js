import { safeLink } from './commerce.js';

export const MAINLINE_VERSION=1;
export const MAINLINE_TARGETS=Object.freeze([1500,1600,1700,1800,1900,2000,2100,2200,2300,2400,2500]);
export const ICE_BLUE_MODULES=Object.freeze([
  {id:'ice-module-star-drop',name:'冰晶星愿',kind:'star',cell:0,size:44},
  {id:'ice-module-tulip-drop',name:'冰露郁金香',kind:'flower',cell:1,size:48},
  {id:'ice-module-cloud',name:'云朵晶雨',kind:'cloud',cell:2,size:47},
  {id:'ice-module-crescent',name:'冰月银星',kind:'moon',cell:3,size:43},
  {id:'ice-module-checker',name:'蓝白方糖',kind:'cube',cell:4,size:49},
  {id:'ice-module-penguin',name:'冰蓝小企鹅',kind:'penguin',cell:5,size:51},
  {id:'ice-module-crystal-heart',name:'晶花蓝心',kind:'crystal',cell:6,size:50},
  {id:'ice-module-envelope',name:'蓝心来信',kind:'envelope',cell:7,size:43},
  {id:'ice-module-rocket',name:'冰蓝火箭',kind:'rocket',cell:8,size:49},
  {id:'ice-module-shooting-star',name:'深海流星',kind:'shooting-star',cell:9,size:58},
  {id:'ice-module-heart-bow',name:'珍珠心愿结',kind:'bow',cell:10,size:50},
]);
export const ICE_BLUE_MODULE_IDS=Object.freeze(ICE_BLUE_MODULES.map(item=>item.id));
export const COUPON_OPTIONS=Object.freeze([
  {value:5,weight:.6,label:'¥5 优惠券'},
  {value:10,weight:.3,label:'¥10 优惠券'},
  {value:15,weight:.1,label:'¥15 优惠券'},
]);
export const DEFAULT_PRODUCT_URL='https://example.com/products/ice-blue-star-dream';

export function normalizeMainline(raw){
  const unlocked=[...new Set(Array.isArray(raw?.unlocked)?raw.unlocked:[])].filter(id=>ICE_BLUE_MODULE_IDS.includes(id));
  const coupons=Array.isArray(raw?.coupons)?raw.coupons.filter(c=>[5,10,15].includes(c?.value)).map(c=>({value:c.value,claimedAt:Number(c.claimedAt)||0})).slice(-100):[];
  return{version:MAINLINE_VERSION,unlocked,coupons,clears:Math.max(coupons.length,Math.max(0,Math.floor(Number(raw?.clears)||0))),productUrl:safeLink(raw?.productUrl)||DEFAULT_PRODUCT_URL};
}
export const nextMainlineModule=state=>ICE_BLUE_MODULES.find(item=>!normalizeMainline(state).unlocked.includes(item.id))||null;
export const mainlineStep=state=>Math.min(10,normalizeMainline(state).unlocked.length);
export const mainlineTarget=state=>MAINLINE_TARGETS[mainlineStep(state)];
export function drawCoupon(random=Math.random){
  const roll=Math.max(0,Math.min(.999999,Number(random())||0));let cursor=0;
  for(const coupon of COUPON_OPTIONS){cursor+=coupon.weight;if(roll<cursor)return{value:coupon.value,label:coupon.label};}
  return{value:15,label:'¥15 优惠券'};
}
export function claimMainlineClear(raw,{random=Math.random,now=Date.now()}={}){
  const state=normalizeMainline(raw),module=nextMainlineModule(state),coupon=drawCoupon(random);
  return{state:{...state,unlocked:module?[...state.unlocked,module.id]:state.unlocked,coupons:[...state.coupons,{value:coupon.value,claimedAt:now}],clears:state.clears+1},module,coupon};
}
