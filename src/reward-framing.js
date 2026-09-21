// Match the approved square model framing while the background fills the dialog.
export function rewardFraming(viewport,frame,cameraZ=7.7){
  const width=Math.max(1,Number(viewport?.width)||1),height=Math.max(1,Number(viewport?.height)||1);
  const target=frame?.height>0&&frame?.width>0?frame:{left:viewport?.left||0,top:viewport?.top||0,width,height};
  const distance=Math.max(.1,Number(cameraZ)||7.7),halfAngle=Math.tan(13*Math.PI/180);
  const pixelsPerUnit=target.height/(2*distance*halfAngle);
  const centreX=target.left-(viewport?.left||0)+target.width/2;
  const centreY=target.top-(viewport?.top||0)+target.height/2;
  return{fov:2*Math.atan(height/target.height*halfAngle)*180/Math.PI,
    x:(width/2-centreX)/pixelsPerUnit,y:.05+(centreY-height/2)/pixelsPerUnit};
}
