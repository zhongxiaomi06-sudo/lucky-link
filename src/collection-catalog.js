import { MATERIALS as LEGACY, colorFamily as legacyColor } from './materials.js';
import { ICE_BLUE_MODULES } from './ice-blue-mainline.js';

// This catalog never changes the order or availability of the legacy 3D directory.
const groups = {
  jelly:['lilac-heart','blue-star','jelly-heart-red','jelly-heart-pink','jelly-flower-lilac','jelly-ring-forest'],
  pearl:['pearl','moon-pearl','pearl-bow','pearl-heart','pearl-drop','pearl-cluster'],
  sea:['coral-shell','aqua-drop','sea-cowrie','sea-starfish','sea-turtle','sea-glass-oval'],
  chrome:['chrome-bow','chrome-heart','chrome-link','chrome-star','smoke-crystal','silver-orb'],
  gems:['rose-prism','amber-cube','jade-ring','cobalt-gem','malachite-barrel','lapis-orb'],
  bloom:['daisy','cherries','enamel-blossom','green-leaf','porcelain-bud','honey-bee'],
};
const craft = [
  ['turquoise-pebble','Turquoise pebble','nugget','blue','#269b99',34,'sea'],
  ['ceramic-flute','Ivory ceramic','flute','neutral','#f2e8d4',31,'pearl'],
  ['braided-knot','Cinnamon knot','knot','brown','#a76535',34,'bloom'],
  ['gold-medallion','Hammered gold','medallion','yellow','#d8a344',34,'chrome'],
  ['cinnamon-tassel','Silk tassel','tassel','brown','#a66b42',44,'bloom'],
  ['silver-flower-bead','Carved silver','orb','neutral','#aebbb9',29,'chrome'],
];
export const CRAFT_IDS=craft.map(([id])=>id);
export const CRAFT_REWARD_IDS=CRAFT_IDS.slice(3);
for(const [id,,,,,,family] of craft)groups[family].push(id);
const definitions = [
  ['jelly-heart-red','Cherry heart','heart','red','#e94050',32],
  ['jelly-heart-pink','Blush heart','heart','pink','#ed9abc',38],
  ['jelly-flower-lilac','Lilac blossom','flower','purple','#b494d7',37],
  ['jelly-ring-forest','Forest glass','ring','green','#1b775f',33],
  ['pearl-bow','Pearl bow','bow','neutral','#f4ead5',39],
  ['pearl-heart','Nacre heart','heart','neutral','#f8ead8',32],
  ['pearl-drop','Baroque drop','pearl','neutral','#f2e4d3',31],
  ['pearl-cluster','Pearl cluster','cluster','neutral','#e9ddcb',35],
  ['sea-cowrie','Cowrie','shell','neutral','#eee1c5',32],
  ['sea-starfish','Shore star','starfish','neutral','#e6c7a3',36],
  ['sea-turtle','Sea turtle','turtle','green','#84c5ae',38],
  ['sea-glass-oval','Sea glass','oval','blue','#7dcbd3',32],
  ['chrome-bow','Silver bow','bow','neutral','#c8d6dc',39],
  ['chrome-heart','Silver heart','heart','neutral','#cbd8df',33],
  ['chrome-link','Silver link','link','neutral','#b8c8ce',34],
  ['chrome-star','Silver star','star','neutral','#d8dfe1',35],
  ['smoke-crystal','Smoky crystal','crystal','black','#45484d',30],
  ['silver-orb','Silver orb','orb','neutral','#b3c5d0',25],
  ['malachite-barrel','Malachite','barrel','green','#24855e',31],
  ['lapis-orb','Lapis','orb','blue','#1c4b99',28],
  ['enamel-blossom','Pink blossom','flower','pink','#eab3b3',37],
  ['green-leaf','Glass leaf','leaf','green','#67ad73',35],
  ['porcelain-bud','Porcelain rose','bud','pink','#e9d5c9',34],
  ['honey-bee','Honey bee','bee','yellow','#c79d4c',34],
  ...craft.map(item=>item.slice(0,6)),
];
const familyFor = id => Object.entries(groups).find(([,ids])=>ids.includes(id))?.[0];
const newItems = definitions.map(([id,name,kind,colorGroup,color,size])=>({id,name,kind,colorGroup,color,size,accent:'#fff5e6',icon:'✧',shape:'40%',category:['flower','leaf','bow','shell','turtle','starfish','cluster','bud','bee'].includes(kind)?'symbol':'crystal',family:familyFor(id),sound:id==='smoke-crystal'||id==='green-leaf'?'glass':familyFor(id)==='chrome'?'metal':['pearl','sea'].includes(familyFor(id))?'pearl':familyFor(id)==='bloom'?'resin':'glass'}));
const iceBlueItems=ICE_BLUE_MODULES.map(item=>({...item,colorGroup:'blue',color:'#a9d9ff',accent:'#f8fcff',icon:'✧',shape:'42%',category:'symbol',family:'ice-blue',sound:['bow','envelope','rocket'].includes(item.kind)?'metal':item.kind==='penguin'?'resin':'glass'}));
export const MATERIALS = [...LEGACY,...newItems,...iceBlueItems];
export const materialById = new Map(MATERIALS.map(item=>[item.id,item]));
export const EXCLUDED_DISPLAY_IDS=Object.freeze(['braided-knot','cinnamon-tassel','jade-ring','garden-jade','jelly-ring-forest','jelly-heart-pink','rose-heart','coral-shell','sea-cowrie','blue-eye','pink-dice']);
const excludedDisplayIds=new Set(EXCLUDED_DISPLAY_IDS);
export const isDisplayMaterial=id=>materialById.has(id)&&!excludedDisplayIds.has(id);
export const NEW_STARTER_IDS=['jelly-heart-red','jelly-heart-pink','pearl-heart','pearl-drop','sea-cowrie','sea-glass-oval','chrome-bow','smoke-crystal','malachite-barrel','lapis-orb','enamel-blossom','green-leaf',...CRAFT_IDS.slice(0,3)];
export const colorFamily = id => materialById.get(id)?.colorGroup || legacyColor(id);
export const FEATURED_IDS=['aqua-drop','pearl','smoke-crystal','turquoise-pebble','ceramic-flute','blue-star','moon-pearl','gold-medallion','chrome-star','pearl','silver-flower-bead','ceramic-flute','aqua-drop','green-leaf'];
const sizes={'pearl':25,'moon-pearl':25,'lilac-heart':35,'blue-star':37,'coral-shell':38,'aqua-drop':35,'rose-prism':30,'amber-cube':32,'jade-ring':31,'cobalt-gem':32,'daisy':36,'cherries':37};
export function presentationFor(id){
  const item=materialById.get(id);if(!item)return null;
  if(item.family==='ice-blue')return{family:'ice-blue',atlas:'/assets/ice-blue-modules-v34.png',cell:item.cell,chromaKey:false,size:item.size,attachment:'charm',sound:item.sound,grid:[4,3]};
  const family=familyFor(id);
  const craftCell=CRAFT_IDS.indexOf(id);
  return {family:family||'classic',atlas:craftCell>=0?'/assets/collections-craft-v18.png':family?`/assets/collections-${family}-v17.png`:null,cell:craftCell>=0?craftCell:family?groups[family].indexOf(id):null,chromaKey:craftCell>=0,size:item.size||sizes[id]||30,attachment:['bow','shell','flower','cherry','leaf','cluster','turtle','starfish','bud','bee','medallion','tassel'].includes(item.kind)?'charm':'bead',sound:item.sound};
}
export const FAMILIES=[
  {id:'jelly',name:'Jelly',sample:'blue-star',solution:['jelly-heart-red','blue-star','lilac-heart','pearl','ice-cube','daisy']},
  {id:'pearl',name:'Pearl',sample:'pearl-bow',solution:['pearl','pearl','pearl-heart','pearl-drop','chrome-bow']},
  {id:'sea',name:'Sea',sample:'aqua-drop',solution:['aqua-drop','sea-glass-oval','sea-starfish','sea-turtle','pearl','blue-star']},
  {id:'chrome',name:'Chrome',sample:'chrome-bow',solution:['chrome-bow','smoke-crystal','chrome-bow','pearl','rose-prism']},
  {id:'gems',name:'Gems',sample:'cobalt-gem',solution:['rose-prism','amber-cube','cobalt-gem','lapis-orb','pearl','clear-quartz']},
  {id:'bloom',name:'Bloom',sample:'enamel-blossom',solution:['enamel-blossom','green-leaf','enamel-blossom','pearl','blue-star','lilac-heart']},
].map(f=>({...f,ids:f.ids||groups[f.id]}));
