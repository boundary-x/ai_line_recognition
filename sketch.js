'use strict';
const $=id=>document.getElementById(id), canvas=$('preview'), ctx=canvas.getContext('2d',{willReadFrequently:true}), video=$('camera');
const SERVICE='6e400001-b5a3-f393-e0a9-e50e24dcca9e',RX='6e400003-b5a3-f393-e0a9-e50e24dcca9e';
let stream,device,rx,engineReady=false,cameraReady=false,cameraBusy=false,connecting=false,disconnecting=false;
let facing='environment',mirrored=false,cameraEpoch=0,sending=false,writing=false,stopPending=false,latest=null,epoch=0,lastFrame=0,lastSend=0,lastVideoTime=-1,mats;
const binaryCanvas=document.createElement('canvas'),binaryCtx=binaryCanvas.getContext('2d');
const STOP_PACKET='L000R000';
function motorValues(result,base,gain){
 const clamp=n=>Math.round(Math.max(0,Math.min(140,n)));
 if(!result||!Number.isFinite(result.x)||!Number.isFinite(base)||!Number.isFinite(gain)||base<=0)return {left:0,right:0,correction:0};
 const error=200-Math.max(0,Math.min(400,result.x)),correction=error*Math.max(0,Math.min(1,gain));
 base=clamp(base);return {left:clamp(base-correction),right:clamp(base+correction),correction};
}
function motorPacket(m){return 'L'+String(m.left).padStart(3,'0')+'R'+String(m.right).padStart(3,'0');}
function showMotorPreview(result){
 const base=Number($('base-speed').value),gain=Number($('steering-gain').value),m=motorValues(result,base,gain);
 $('left-speed').textContent=m.left;$('right-speed').textContent=m.right;$('left-meter').value=m.left;$('right-meter').value=m.right;
 $('packet-preview').textContent=motorPacket(m);
 $('motion-preview').textContent=!result?'라인 없음 · 정지':!m.left&&!m.right?'정지':m.left===m.right?'직진':m.left<m.right?'왼쪽으로 회전':'오른쪽으로 회전';
 $('calculation').textContent=result?'라인 위치: '+result.x+' / 중앙: 200\n오차 = 200 − '+result.x+' = '+(200-result.x)+'\n회전 보정 = 오차 × '+gain+' = '+Number(m.correction.toFixed(2))+'\n왼쪽 = '+base+' − 보정 → '+m.left+'\n오른쪽 = '+base+' + 보정 → '+m.right+' (범위 제한 적용)'+(base===0?'\n기본 속도 0: 양쪽 정지 우선':''):'라인이 없어 양쪽 속도를 0으로 보냅니다.';
 return motorPacket(m);
}
function controls(){
 $('connect').disabled=connecting||disconnecting||!!rx;
 $('disconnect').disabled=!rx||disconnecting;
 $('start-send').disabled=!rx||!cameraReady||!engineReady||sending||writing||stopPending||disconnecting||document.hidden;
 $('stop-send').disabled=!sending;
 $('switch-camera').disabled=cameraBusy;$('mirror-camera').disabled=cameraBusy;
}
function engineStatus(text,state){$('engine-status').textContent=text;$('engine-status').dataset.state=state;}
function connectionStatus(text,state=''){$('bluetoothStatus').textContent=text;$('bluetoothStatus').className=state;}
async function startCamera(){
 requestStop();showMotorPreview(null);const token=++cameraEpoch;cameraReady=false;cameraBusy=true;
 if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;
 $('camera-status').hidden=false;$('camera-status').textContent='카메라 연결 중…';$('retry-camera').hidden=true;controls();
 let candidate;
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('HTTPS 환경에서 카메라를 사용해주세요.');
  candidate=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:640},height:{ideal:480}},audio:false});
  if(token!==cameraEpoch){candidate.getTracks().forEach(t=>t.stop());return;}
  stream=candidate;video.srcObject=stream;await video.play();if(token!==cameraEpoch)return;
  cameraReady=true;lastVideoTime=-1;$('camera-status').hidden=true;
  stream.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>{if(token!==cameraEpoch)return;cameraReady=false;requestStop();showMotorPreview(null);$('camera-status').hidden=false;$('camera-status').textContent='카메라 연결이 종료되었습니다.';$('retry-camera').hidden=false;controls();}));
 }catch(error){
  if(candidate)candidate.getTracks().forEach(t=>t.stop());if(token!==cameraEpoch)return;
  $('camera-status').textContent=({NotAllowedError:'카메라 권한을 허용한 뒤 다시 연결해주세요.',NotFoundError:'카메라를 찾지 못했습니다.',NotReadableError:'다른 앱의 카메라 사용을 종료하고 다시 연결해주세요.'})[error.name]||'카메라 연결 실패: '+error.message;
  $('retry-camera').hidden=false;
 }finally{if(token===cameraEpoch){cameraBusy=false;controls();}}
}
function releaseMats(){if(mats)Object.values(mats).forEach(m=>m.delete());mats=null;}
function detectLine(){
 const h=Math.floor(300*Number($('roi-slider').value)/100),y=300-h;
 if(!mats)mats={src:new cv.Mat(300,400,cv.CV_8UC4),gray:new cv.Mat(),binary:new cv.Mat(),rgba:new cv.Mat()};
 mats.src.data.set(ctx.getImageData(0,0,400,300).data);
 let roi,contours,hierarchy,result=null;
 try{
  roi=mats.src.roi(new cv.Rect(0,y,400,h));cv.cvtColor(roi,mats.gray,cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(mats.gray,mats.gray,new cv.Size(5,5),0,0,cv.BORDER_DEFAULT);
  cv.threshold(mats.gray,mats.binary,Number($('threshold-slider').value),255,$('line-type-select').value==='dark'?cv.THRESH_BINARY_INV:cv.THRESH_BINARY);
  if($('debug-view').checked){
   cv.cvtColor(mats.binary,mats.rgba,cv.COLOR_GRAY2RGBA);
   if(binaryCanvas.width!==400||binaryCanvas.height!==h){binaryCanvas.width=400;binaryCanvas.height=h;}
   binaryCtx.putImageData(new ImageData(new Uint8ClampedArray(mats.rgba.data),400,h),0,0);ctx.drawImage(binaryCanvas,0,y);
  }
  contours=new cv.MatVector();hierarchy=new cv.Mat();cv.findContours(mats.binary,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
  let largest=300;
  for(let i=0;i<contours.size();i++){
   const contour=contours.get(i);
   try{const area=cv.contourArea(contour);if(area<=largest)continue;const m=cv.moments(contour,false);if(m.m00){largest=area;result={x:Math.round(m.m10/m.m00),y:m.m01/m.m00+y};}}
   finally{contour.delete();}
  }
 }finally{if(roi)roi.delete();if(contours)contours.delete();if(hierarchy)hierarchy.delete();}
 ctx.strokeStyle='#ffcc00';ctx.lineWidth=2;ctx.strokeRect(1,y+1,398,h-2);
 ctx.strokeStyle='#0096ff';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(200,y);ctx.lineTo(200,300);ctx.stroke();ctx.setLineDash([]);
 if(result){
  // X and error both refer to the displayed, possibly mirrored image.
  result.error=200-result.x;ctx.strokeStyle='#00e685';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(200,result.y);ctx.lineTo(result.x,result.y);ctx.stroke();
  ctx.fillStyle='#ff3232';ctx.beginPath();ctx.arc(result.x,result.y,6,0,Math.PI*2);ctx.fill();
 }
 return result;
}
function frame(now){
 requestAnimationFrame(frame);if(document.hidden||!cameraReady||now-lastFrame<80)return;
 if(video.currentTime===lastVideoTime){if(now-lastFrame>750){showMotorPreview(null);if(sending)requestStop();}return;}
 lastFrame=now;lastVideoTime=video.currentTime;if(!video.videoWidth||!video.videoHeight)return;
 const vw=video.videoWidth,vh=video.videoHeight,sw=Math.min(vw,vh*4/3),sh=sw*3/4;
 ctx.save();if(mirrored){ctx.translate(400,0);ctx.scale(-1,1);}ctx.drawImage(video,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,400,300);ctx.restore();
 if(!engineReady)return;
 try{
  const result=detectLine();
  const packet=showMotorPreview(result);
  $('result-display').textContent=result?'라인 감지됨 · '+(result.error===0?'중앙':result.error>0?'왼쪽':'오른쪽')+' · 오차 '+result.error:'라인 없음';
  if(sending&&now-lastSend>=100){lastSend=now;latest=packet;flush();}
 }catch(error){engineReady=false;requestStop();showMotorPreview(null);releaseMats();engineStatus('인식 처리 오류: '+error.message+' 새로고침해주세요.','error');controls();}
}
function requestStop(){
 const active=sending;sending=false;latest=null;epoch++;
 if(rx&&(active||writing)){stopPending=true;$('dataDisplay').textContent='정지 데이터 전송 중…';flush();}
 controls();
}
async function flush(){
 if(writing||!rx)return;writing=true;controls();const target=rx;
 try{
  while(target===rx&&(stopPending||(sending&&latest!==null))){
   const isStop=stopPending,value=isStop?STOP_PACKET:latest,token=epoch;
   if(isStop)stopPending=false;else latest=null;
   const bytes=new TextEncoder().encode(value+'\n');
   if(target.writeValueWithResponse)await target.writeValueWithResponse(bytes);else await target.writeValue(bytes);
   if(target===rx&&token===epoch){$('dataDisplay').textContent='전송됨: '+value;$('dataDisplay').style.color='#0f0';}
  }
 }catch(error){if(target===rx){sending=false;latest=null;stopPending=false;epoch++;$('dataDisplay').textContent='전송 실패: '+error.message;$('dataDisplay').style.color='#ff9b9b';}}
 finally{writing=false;controls();}
}
function disconnected(){
 sending=false;rx=null;latest=null;stopPending=false;epoch++;
 connectionStatus('연결 해제됨');$('dataDisplay').textContent='연결이 끊어졌습니다. 전송을 중단했습니다.';controls();
}
async function connect(){
 if(connecting||rx)return;connecting=true;connectionStatus('기기 연결 중…');controls();
 try{
  if(!navigator.bluetooth)throw new Error('이 브라우저는 블루투스를 지원하지 않습니다.');
  device=await navigator.bluetooth.requestDevice({filters:[{namePrefix:'BBC micro:bit'}],optionalServices:[SERVICE]});
  device.addEventListener('gattserverdisconnected',disconnected);
  const server=await device.gatt.connect(),service=await server.getPrimaryService(SERVICE);rx=await service.getCharacteristic(RX);
  if(!device.gatt.connected)throw new Error('연결이 종료되었습니다.');
  connectionStatus('연결됨: '+device.name,'status-connected');$('dataDisplay').textContent='연결 완료 · 전송 시작을 눌러주세요.';
 }catch(error){if(device?.gatt.connected)device.gatt.disconnect();rx=null;connectionStatus(error.name==='NotFoundError'?'기기 선택을 취소했습니다.':'연결 실패: '+error.message,error.name==='NotFoundError'?'':'status-error');}
 finally{connecting=false;controls();}
}
async function disconnect(){
 disconnecting=true;requestStop();const until=performance.now()+1000;
 while((writing||stopPending)&&performance.now()<until)await new Promise(r=>setTimeout(r,25));
 if(device?.gatt.connected)device.gatt.disconnect();disconnected();disconnecting=false;controls();
}
$('connect').addEventListener('click',connect);$('disconnect').addEventListener('click',disconnect);
$('start-send').addEventListener('click',()=>{if(!rx||!engineReady||!cameraReady||writing||stopPending||document.hidden)return;sending=true;lastSend=0;epoch++;$('dataDisplay').textContent='전송 준비 중…';controls();});
$('stop-send').addEventListener('click',requestStop);
$('switch-camera').addEventListener('click',()=>{facing=facing==='user'?'environment':'user';startCamera();});
$('mirror-camera').addEventListener('click',()=>{requestStop();mirrored=!mirrored;$('mirror-camera').setAttribute('aria-pressed',String(mirrored));lastVideoTime=-1;});
$('retry-camera').addEventListener('click',startCamera);
for(const id of ['threshold-slider','roi-slider','line-type-select'])$(id).addEventListener('input',()=>{
 requestStop();lastVideoTime=-1;$('threshold-label').textContent='현재 값: '+$('threshold-slider').value;$('roi-label').textContent='화면 하단 '+$('roi-slider').value+'% 사용';
});
for(const id of ['base-speed','steering-gain'])$(id).addEventListener('input',()=>{
 requestStop();lastVideoTime=-1;$('base-speed-value').textContent=$('base-speed').value;$('steering-gain-value').textContent=$('steering-gain').value;showMotorPreview(null);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)requestStop();});
window.addEventListener('pagehide',()=>{requestStop();cameraEpoch++;cameraReady=false;if(stream)stream.getTracks().forEach(t=>t.stop());releaseMats();});
window.addEventListener('pageshow',e=>{if(e.persisted)startCamera();});
window.addEventListener('line-guide-start',requestStop);
new ResizeObserver(()=>document.documentElement.style.setProperty('--header-height',document.querySelector('header').getBoundingClientRect().height+'px')).observe(document.querySelector('header'));
const deadline=performance.now()+30000;
const engineTimer=setInterval(()=>{
 if(window.cv?.Mat){clearInterval(engineTimer);engineReady=true;engineStatus('인식 엔진 준비 완료','ready');controls();}
 else if(performance.now()>deadline){clearInterval(engineTimer);engineStatus('인식 엔진을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해주세요.','error');}
},250);
controls();startCamera();requestAnimationFrame(frame);
