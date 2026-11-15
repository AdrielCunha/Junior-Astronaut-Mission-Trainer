// Generated with AI assistance. See README, "Use of AI tools".
// Repeatable production-game measurement through Chrome DevTools Protocol.
// Build with VITE_MEDIR=1, serve the output, then:
// node tools/dev/medir_missao.mjs URL CPU WIDTHxHEIGHT OUTPUT.json [full|reduced]
// CHROME_SOFTWARE=1 forces SwiftShader for an explicitly software-rendered stress test.
// In full motion the first two samples ("early ...") run right after the game opens, while the
// flight film is still downloading: that is when the player first walks around the base.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const [url='http://127.0.0.1:5273/?leve',cpu='4',size='412x915',output='/tmp/lunar-performance.json',motion='full']=process.argv.slice(2);
const [width,height]=size.split('x').map(Number);
const profile=await mkdtemp(join(tmpdir(),'lunar-benchmark-'));
const port=10000+Math.floor(Math.random()*2000);
const software=process.env.CHROME_SOFTWARE==='1';
const chromeBin=process.env.CHROME_BIN || (process.platform==='win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome-stable');
const chrome=spawn(chromeBin,[
 '--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,`--window-size=${width},${height}`,
 '--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows',
 ...(software?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--enable-gpu']), 'about:blank',
],{stdio:'ignore',windowsHide:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws;
const report={url,cpuSlowdown:Number(cpu),viewport:{width,height},motion,softwareRequested:software,date:new Date().toISOString(),stages:[],errors:[]};
try {
 let target;
 for(let i=0;i<60&&!target;i++) {await sleep(150);try{target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');}catch{}}
 if(!target)throw Error('Chrome did not start');
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
 let id=0;const pending=new Map();let bytes=0,requests=0;
 ws.addEventListener('message',e=>{
  const m=JSON.parse(e.data);
  if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}
  if(m.method==='Network.loadingFinished')bytes+=m.params.encodedDataLength;
  if(m.method==='Network.requestWillBeSent')requests++;
  if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description??''));
 });
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timeout=setTimeout(()=>{pending.delete(n);reject(Error('CDP timed out: '+method));},60000);pending.set(n,r=>{clearTimeout(timeout);r.error?reject(Error(JSON.stringify(r.error))):resolve(r.result);});ws.send(JSON.stringify({id:n,method,params}));});
 const js=async expression=>{
  const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
  return r.result?.value;
 };
 const until=async(expression,timeout=45000)=>{const start=Date.now();while(Date.now()-start<timeout){if(await js(expression))return;await sleep(100);}throw Error(`Timed out: ${expression}`);};
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp('Page.bringToFront');await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
 await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<800});
 await cdp('Emulation.setCPUThrottlingRate',{rate:Number(cpu)});
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:motion==='reduced'?'reduce':'no-preference'}]});
 report.browser=await cdp('Browser.getVersion');
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`
  localStorage.setItem('lunar-odyssey-video',JSON.stringify({qualidade:'auto',movimento:'sistema',efeitos:true,pegadas:true}));
  window.__perf={frames:[],longTasks:[],record:false,distance:0,ready:null,lastPosition:null};
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())__perf.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});}catch{}
  let last=performance.now();requestAnimationFrame(function frame(t){
   if(window.superficie?.corpo&&!superficie.scene.isActive('Carregar')&&__perf.ready===null)__perf.ready=performance.now();
   if(__perf.record){__perf.frames.push(t-last);const k=window.superficie?.corpo;if(k){if(__perf.lastPosition)__perf.distance+=Math.hypot(k.x-__perf.lastPosition.x,k.y-__perf.lastPosition.y);__perf.lastPosition={x:k.x,y:k.y};}}
   last=t;requestAnimationFrame(frame);
  });`});
 await cdp('Page.navigate',{url});
 await until('window.__perf?.ready!==null && !!window.superficie?.corpo');
 report.readyMs=await js('__perf.ready');
 report.firstContentfulPaintMs=await js("performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null");
 report.renderer=await js(`(()=>{const canvas=document.querySelector('canvas');const g=canvas.getContext('webgl2')||canvas.getContext('webgl');const ext=g?.getExtension('WEBGL_debug_renderer_info');return ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';})()`);

 await js("void superficie.game.scene.stop('Radar')");
 await js("(async()=>{const {iniciarNave3D}=await import('/src/cenas/irParaMarte.ts');iniciarNave3D(superficie.scene.get('Interface'),0,[200]);})()");
 await until("sessao.mundo==='nave'&&sessao.fase==='manha'",30000);
 await js("(async()=>{const ui=superficie.scene.get('Interface');sessao.estado={...sessao.estado,dia:6,meta:100};ui.irPara('fim');const texts=()=>{const out=[];const walk=o=>{if(!o.visible)return;if(o.text)out.push(o.text);if(o.list)o.list.forEach(walk);};ui.children.list.forEach(walk);return out;};for(let i=0;i<20&&!texts().some(t=>t.includes('Land on Mars'));i++){ui.acaoPrincipal?.();await new Promise(r=>requestAnimationFrame(r));}ui.acaoPrincipal?.();})()");
 await until("superficie.scene.isActive('Viagem')",20000);
 await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await sleep(200);
 report.before=await js("({world:sessao.mundo,menu:superficie.scene.isActive('MenuJogo'),travelActive:superficie.scene.isActive('Viagem'),travelPaused:superficie.scene.isPaused('Viagem'),worldPaused:superficie.scene.isPaused('Superficie')})");
 await until("sessao.mundo==='marte'",20000);await sleep(250);
 report.after=await js("({world:sessao.mundo,phase:sessao.fase,day:sessao.estado.dia,menu:superficie.scene.isActive('MenuJogo'),travelActive:superficie.scene.isActive('Viagem'),worldActive:superficie.scene.isActive('Superficie'),worldPaused:superficie.scene.isPaused('Superficie')})");
 const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(output.replace(/\.json$/,'.png'),Buffer.from(shot.data,'base64'));
 report.completed=true;
}catch(e){report.completed=false;report.failure=String(e);console.error(e);process.exitCode=1;}
finally{await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({before:report.before,after:report.after,errors:report.errors,completed:report.completed}));ws?.close();chrome.kill();await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200}).catch(e=>console.error(e.message));}
