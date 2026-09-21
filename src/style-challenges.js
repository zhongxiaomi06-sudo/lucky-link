import { FAMILIES, materialById, presentationFor, colorFamily } from './collection-catalog.js';
export const STYLE_BOOK_KEY='lucky-link.style-book.v1';
export function normalizeStyleBook(value){return{version:1,stamps:[...new Set(Array.isArray(value?.stamps)?value.stamps.filter(id=>FAMILIES.some(f=>f.id===id)):[])]};}
export function evaluateStyle(familyId,ids){
  const family=FAMILIES.find(f=>f.id===familyId), valid=family&&Array.isArray(ids)&&ids.length<=14&&ids.every(id=>materialById.has(id));
  const pieces=valid?ids:[],count=f=>pieces.filter(id=>presentationFor(id).family===f).length;
  const rule=(label,value,target)=>({label,value,target,passed:value>=target});
  const secondary={jelly:()=>rule('Colors',new Set(pieces.map(colorFamily)).size,4),pearl:()=>rule('Silver',count('chrome'),1),sea:()=>rule('Pearls',count('pearl'),1),chrome:()=>rule('Smoky crystal',pieces.filter(id=>id==='smoke-crystal').length,1),gems:()=>rule('Colors',new Set(pieces.map(colorFamily)).size,3),bloom:()=>rule('Glass',pieces.filter(id=>['jelly','gems'].includes(presentationFor(id).family)||id==='green-leaf').length,1)};
  const rules=family?[rule('Pieces',pieces.length,['pearl','chrome'].includes(familyId)?5:6),rule(family.name,count(familyId),familyId==='gems'?4:3),secondary[familyId]()]:[];
  return{family:familyId,rules,passed:Boolean(valid&&rules.every(r=>r.passed))};
}
export function completeStyle(book,id,ids){const clean=normalizeStyleBook(book);return evaluateStyle(id,ids).passed?{...clean,stamps:[...new Set([...clean.stamps,id])]}:clean;}
