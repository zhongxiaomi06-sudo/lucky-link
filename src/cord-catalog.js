// Cord rewards have their own identities; never add them to the bead directory.
export const CORDS=[
  {id:'cord-cotton',name:'Ice blue braid',texture:'cotton',color:'#9fc9dd',dark:'#557d94',light:'#e9f8ff',width:4.2,starter:true},
  {id:'cord-satin',name:'Ivory silk',texture:'satin',color:'#dfccaa',dark:'#a18a69',light:'#fff6dc',width:3.8,starter:true},
  {id:'cord-sea-braid',name:'Ocean weave',texture:'two-tone',color:'#447b83',dark:'#28505d',light:'#f0e5c9',width:4.6,starter:false},
  {id:'cord-silver',name:'Silver links',texture:'metal',color:'#d1d3c8',dark:'#535c5b',light:'#fffced',width:4,starter:false},
  {id:'cord-classic',name:'Classic cord',texture:'plain',color:'#43566c',dark:'#364653',light:'#f4e9d0',width:2,starter:true},
];
export const cordById=new Map(CORDS.map(c=>[c.id,c]));
export const CORD_REWARD_IDS=CORDS.filter(c=>!c.starter).map(c=>c.id);
export const ownedCordIds=c=>[...CORDS.filter(c=>c.starter).map(c=>c.id),...new Set((Array.isArray(c?.unlockedCords)?c.unlockedCords:[]).filter(id=>CORD_REWARD_IDS.includes(id)))];
export function normalizeCordState(raw){
  const unlockedCords=[...new Set((Array.isArray(raw?.unlockedCords)?raw.unlockedCords:[]).filter(id=>CORD_REWARD_IDS.includes(id)))];
  const cordId=ownedCordIds({unlockedCords}).includes(raw?.cordId)?raw.cordId:'cord-cotton';
  return{cordId,unlockedCords};
}
export function selectCord(collection,id){return ownedCordIds(collection).includes(id)?{...collection,cordId:id}:null;}
