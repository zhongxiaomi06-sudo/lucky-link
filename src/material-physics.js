import { materialById } from './collection-catalog.js';

// Relative bulk density, not a claim about the composition of a real product.
// Radius is in tray units, velocity in tray units / millisecond.
export const MATERIAL_PHYSICS=Object.freeze({
  glass:Object.freeze({density:2.4,restitution:.44,friction:.12}),
  pearl:Object.freeze({density:2.7,restitution:.22,friction:.3}),
  resin:Object.freeze({density:1.15,restitution:.12,friction:.5}),
  metal:Object.freeze({density:5.6,restitution:.32,friction:.2}),
});
const families=new Map([
  ...['ice-star','ice-drop','ice-cube','aqua-drop','blue-star','clear-quartz','sea-star','rose-heart','rose-prism','cobalt-gem','lime-gem','sunset-crystal','ice-module-star-drop','ice-module-crescent','ice-module-crystal-heart'].map(id=>[id,'glass']),
  ...['pearl','moon-pearl','coral-shell','ice-module-tulip-drop','ice-module-heart-bow'].map(id=>[id,'pearl']),
  ...['moon-gold','tiny-bell','sun-bow','ice-module-rocket'].map(id=>[id,'metal']),
  ...['ice-module-cloud','ice-module-checker','ice-module-penguin','ice-module-envelope','ice-module-shooting-star'].map(id=>[id,'resin']),
]);
export function materialFamilyFor(id){
  const family=families.get(id)||materialById.get(id)?.sound;
  return Object.hasOwn(MATERIAL_PHYSICS,family)?family:'resin';
}
export function physicsFor(id,radius){
  const family=materialFamilyFor(id),material=MATERIAL_PHYSICS[family];
  const r=Number.isFinite(radius)?Math.max(1,radius):27;
  const mass=material.density*(r/27)**3,inertia=.5*mass*(r*.9)**2;
  return{family,...material,mass,inverseMass:1/mass,inertia,inverseInertia:1/inertia};
}
