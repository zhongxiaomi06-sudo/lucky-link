/** A held piece owns the placement gesture, even over an existing bead. */
export function pointerIntent(hasHeld, source) {
  if(source==='catalog'||source==='box')return 'browse';
  if(hasHeld)return 'place';
  return source==='cord'?'pick-cord':'none';
}

/** Pure render-only mapping. It never changes composition, undo or rewards. */
export function previewPieces(ids, held, insertion) {
  const pieces=ids.map((id,originalIndex)=>({id,originalIndex,held:false}));
  if(!held||insertion==null||held.kind!=='cord'&&ids.length>=14)return pieces;
  let index=Math.max(0,Math.min(ids.length,insertion));
  if(held.kind==='cord'){
    if(!pieces[held.index])return pieces;
    pieces.splice(held.index,1);if(index>held.index)index--;
  }
  pieces.splice(index,0,{id:held.id,originalIndex:held.kind==='cord'?held.index:-1,held:true});
  return pieces;
}
