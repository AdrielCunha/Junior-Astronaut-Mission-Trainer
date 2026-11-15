// Repeatable production-game measurement through Chrome DevTools Protocol.
// Build with VITE_MEDIR=1, serve the output, then:
// node tools/dev/medir_missao.mjs URL CPU WIDTHxHEIGHT OUTPUT.json [full|reduced]
// CHROME_SOFTWARE=1 forces SwiftShader for an explicitly software-rendered stress test.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const [url='http://127.0.0.1:5273/?leve',cpu='4',size='412x915',output='/tmp/lunar-performance.json',motion='full']=process.argv.slice(2);
const [width,height]=size.split('x').map(Number);
const profile=await mkdtemp(join(tmpdir(),'lunar-benchmark-'));
const port=10000+Math.floor(Math.random()*2000);
const software=process.env.CHROME_SOFTWARE==='1';
const chrome=spawn('google-chrome-stable',[
 '--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,`--window-size=${width},${height}`,
 '--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows',
 ...(software?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--enable-gpu']), 'about:blank',
],{stdio:'ignore'});
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
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,r=>r.error?reject(Error(JSON.stringify(r.error))):resolve(r.result));ws.send(JSON.stringify({id:n,method,params}));});
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
 await js("(()=>{const ui=superficie.scene.get('Interface');ui.scene.stop('Radar');ui.fecharPainel();return true;})()");
 if(motion!=='reduced')await until('sessao.filmePronto',45000);
 await sleep(3000);
 report.warmup='all flight downloads completed, then 3 seconds idle';
 const sample=async(name,ms,action)=>{
  if(action)await js(action);
  const initial=await js('({vista:sessao.vista,flight:!!sessao.voo,transition:!!sessao.transicao})');
  await js('__perf.frames=[];__perf.distance=0;__perf.lastPosition=null;__perf.start=performance.now();__perf.record=true;');
  await sleep(ms);
  const raw=await js(`(()=>{__perf.record=false;return {frames:__perf.frames,distance:__perf.distance,elapsed:performance.now()-__perf.start,longTasks:__perf.longTasks.filter(e=>e.start>=__perf.start),heap:performance.memory?.usedJSHeapSize??null,vista:sessao.vista,footprints:superficie.ambiente?.marcas.length??0};})()`);
  const frames=raw.frames.sort((a,b)=>a-b);if(!frames.length)throw Error(`No animation frames: ${name}`);
  const mean=frames.reduce((a,b)=>a+b,0)/frames.length;
  const result={name,initial,finalView:raw.vista,frames:frames.length,meanMs:mean,p95Ms:frames[Math.min(frames.length-1,Math.floor(frames.length*0.95))],fps:1000/mean,over50msPercent:100*frames.filter(f=>f>50).length/frames.length,longTasks:raw.longTasks.length,longTaskMs:raw.longTasks.reduce((a,b)=>a+b.duration,0),heapBytes:raw.heap,distanceTiles:raw.distance,footprints:raw.footprints,elapsedMs:raw.elapsed};
  report.stages.push(result);console.log(JSON.stringify(result));
 };
 await sample('surface idle',3000);
 await sample('surface walking',4000,`(()=>{const k=superficie.corpo;const start={gx:k.x,gy:k.y};const end={gx:k.x,gy:k.y+6};superficie.rota=[end,start,end,start];return true;})()`);
 if(report.stages.at(-1).distanceTiles<1)throw Error('Walking scenario did not actually move');
 await js('superficie.rota=[];superficie.corpo.vx=superficie.corpo.vy=0;');
 if(motion!=='reduced')await until('sessao.filmePronto',45000);
 await sample('surface to Moon',motion==='reduced'?900:4400,"sessao.voar('lua')");
 await until("sessao.vista==='lua'&&!sessao.voo&&!sessao.transicao",45000);
 await sample('Moon idle',2200);
 await sample('Moon to planets',motion==='reduced'?900:2800,"sessao.voar('sistema')");
 await until("sessao.vista==='sistema'&&!sessao.voo&&!sessao.transicao",20000);
 await sample('solar system idle',2200);
 report.network={requests,encodedBytes:bytes};
 report.constellations=await js("(()=>{const e=superficie.scene.get('Espaco');return {loaded:superficie.textures.exists('const0'),current:!!e.constelacaoAtual,skyDepth:e.ceu.depth,figureDepth:e.constelacaoAtual?.img.depth??null};})()");
 report.completed=true;
} catch(e) {report.completed=false;report.failure=String(e);console.error(e);process.exitCode=1;}
finally {
 await writeFile(output,JSON.stringify(report,null,2));console.log(`Saved ${output}`);
 ws?.close();chrome.kill();
 await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));
 await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200}).catch(e=>console.error('Temporary profile cleanup:',e.message));
}
