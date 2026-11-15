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
 report.cases=[];
 const save=()=>writeFile(output,JSON.stringify(report,null,2));
 const probe=async(name,expression)=>{try{const evidence=await js(expression);report.cases.push({name,evidence});console.log(name+': '+JSON.stringify(evidence));}catch(e){report.cases.push({name,failure:String(e)});console.error(name,e);}await save();};
 const setup=()=>js(`window.qa={frame:()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),texts:key=>{const out=[];const walk=(o,visible=true)=>{visible=visible&&o.visible!==false;if(visible&&typeof o.text==='string')out.push({text:o.text,bounds:o.getBounds?.()});if(o.list)for(const c of o.list)walk(c,visible);};for(const o of superficie.scene.get(key).children.list)walk(o);return out;}};`);
 const reload=async()=>{await cdp('Page.reload');await sleep(1000);await until('!!window.superficie?.corpo&&!superficie.scene.isActive("Carregar")',45000);await setup();};
 const world=async(mundo,idx)=>{await js(`(async()=>{superficie.game.scene.stop('Radar');const {iniciarMundo3D}=await import('/src/cenas/irParaMarte.ts');iniciarMundo3D(superficie.scene.get('Interface'),'${mundo}',${idx},42,[200].slice(0,${idx}));})()`);await until(`sessao.mundo==='${mundo}'&&sessao.fase==='manha'`,30000);await js("sessao.novoDia();superficie.scene.get('Interface').irPara('dia')");};
 const shot=async(name)=>{const r=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(output.replace(/\.json$/,'-'+name+'.png'),Buffer.from(r.data,'base64'));};
 const click=async(label)=>{const p=await js(`(()=>{const scene=superficie.scene.get('Radar');const all=[];const words=o=>typeof o.text==='string'?[o.text]:(o.list??[]).flatMap(words);const walk=o=>{if(o.visible!==false&&o.input?.enabled&&words(o).some(t=>t.includes(${JSON.stringify(label)}))){const b=o.getBounds();all.push({x:b.centerX,y:b.centerY});}if(o.list)for(const c of o.list)walk(c);};for(const o of scene.children.list)walk(o);return all.at(-1);})()`);if(!p)throw Error('Button missing: '+label);await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y});await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',clickCount:1});await sleep(150);};
 await setup();await world('nave',1);
 await probe('station-complete-and-save',`(async()=>{const d=superficie.decoVisuais.find(o=>o.d.id==='nave_plantas').d;superficie.usarEstacao(d);await qa.frame();const cena=superficie.scene.get('HortaTarefa');const {concluirTarefa,fecharTarefa}=await import('/src/cenas/conclusaoTarefa.ts');concluirTarefa(cena,cena.aoConcluir);fecharTarefa(cena);await qa.frame();sessao.salvar();return {done:[...sessao.estacoesHoje],day:sessao.estado.dia,dose:sessao.estado.dose,points:sessao.pontos,saved:JSON.parse(localStorage.getItem('lunar-odyssey-save-v1'))};})()`);
 await reload();
 await probe('station-after-real-reload',`({done:[...sessao.estacoesHoje],mundo:sessao.mundo,day:sessao.estado.dia,dose:sessao.estado.dose,points:sessao.pontos,radar:superficie.scene.isActive('Radar')})`);
 await click('EXPLORE THE BASE');await shot('explore-ship-menu');
 await probe('explore-ship-labels',`({mundo:sessao.mundo,texts:qa.texts('Radar')})`);
 await click('GO!');
 await probe('explore-moon-selected-from-ship',`({mundo:sessao.mundo,fase:sessao.fase,day:sessao.estado.dia,radar:superficie.scene.isActive('Radar')})`);
 await probe('exploration-before-save',`(()=>{sessao.estado={...sessao.estado,dia:2};const old=Math.random;Math.random=()=>0;try{sessao.novoDia();}finally{Math.random=old;}superficie.scene.get('Interface').irPara('dia');const exp=sessao.exploracaoEm;sessao.salvar();const raw=JSON.parse(localStorage.getItem('lunar-odyssey-save-v1'));return {countdown:exp,savedCountdown:raw.exploracaoEm??null,day:sessao.estado.dia};})()`);
 await reload();
 await probe('exploration-after-real-reload',`({countdown:sessao.exploracaoEm,expedition:sessao.expedicao,day:sessao.estado.dia,mundo:sessao.mundo})`);
 await world('lua',0);
 await probe('death-message-oxygen-with-rocket-ready',`(async()=>{sessao.estado={...sessao.estado,oxigenio:0,meta:100};const ui=superficie.scene.get('Interface');ui.irPara('fim');const pages=[];for(let i=0;i<8;i++){pages.push(qa.texts('Interface').map(t=>t.text));if(qa.texts('Interface').some(t=>t.text==='PLAY AGAIN'))break;ui.acaoPrincipal?.();await qa.frame();}return {state:sessao.estado,pages};})()`);
 await shot('oxygen-failure');
 await world('marte',2);
 await probe('mars-death-actions',`(async()=>{sessao.estado={...sessao.estado,oxigenio:0};const ui=superficie.scene.get('Interface');ui.irPara('fim');const pages=[];for(let i=0;i<10;i++){pages.push(qa.texts('Interface').map(t=>t.text));if(qa.texts('Interface').some(t=>t.text==='PLAY AGAIN FROM THE MOON'))break;ui.acaoPrincipal?.();await qa.frame();}return {state:sessao.estado,pages};})()`);
 await shot('mars-failure');
 await probe('restart-after-death-saved',`(()=>{sessao.salvar();return {saved:JSON.parse(localStorage.getItem('lunar-odyssey-save-v1')).fase};})()`);
 await js("superficie.scene.get('Interface').acaoPrincipal?.()").catch(()=>{});await sleep(1200);await until('!!window.superficie?.corpo&&!superficie.scene.isActive("Carregar")',45000);await setup();
 await probe('restart-after-death-reloaded',`({mundo:sessao.mundo,fase:sessao.fase,oxygen:sessao.estado.oxigenio,radar:superficie.scene.isActive('Radar')})`);
 await world('marte',2);
 await probe('mars-exploration-menu-label',`(async()=>{const ui=superficie.scene.get('Interface');ui.abrirMenu();await qa.frame();const labels=qa.texts('MenuJogo');ui.scene.stop('MenuJogo');return labels;})()`);
 await cdp('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});await sleep(600);
 await probe('small-mobile-mars-result',`(async()=>{const ui=superficie.scene.get('Interface');sessao.estado={...sessao.estado,meta:100,dia:9};ui.irPara('fim');for(let i=0;i<15&&!qa.texts('Interface').some(t=>t.text==='PLAY AGAIN FROM THE MOON');i++){ui.acaoPrincipal?.();await qa.frame();}return {texts:qa.texts('Interface'),width:innerWidth,height:innerHeight};})()`);
 await shot('small-mobile-result');
 await probe('credits-placeholder',`(async()=>{const ui=superficie.scene.get('Interface');ui.abrirTelaInicial();await qa.frame();const r=ui.scene.get('Radar');r.creditos();await qa.frame();return qa.texts('Radar').filter(t=>/author|Music|Claude|Codex/.test(t.text));})()`);
 await world('nave',1);
 await probe('ship-victory-cinematic-open',`(async()=>{sessao.estado={...sessao.estado,dia:6,meta:100};const ui=superficie.scene.get('Interface');ui.irPara('fim');for(let i=0;i<20&&!qa.texts('Interface').some(t=>t.text.includes('Land on Mars'));i++){ui.acaoPrincipal?.();await qa.frame();}ui.acaoPrincipal?.();return {fase:sessao.fase};})()`);
 await until("superficie.scene.isActive('Viagem')",20000);
 await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(100);
 await probe('pause-during-mars-landing',`(async()=>{const ui=superficie.scene.get('Interface'),v=ui.scene.get('Viagem');const before={t:v.t,pouso:v.pouso};const menu=ui.scene.isActive('MenuJogo');const paused=ui.scene.isPaused('Viagem');await new Promise(r=>setTimeout(r,900));const after={t:v.t,pouso:v.pouso};ui.scene.stop('MenuJogo');ui.scene.stop('Viagem');await qa.frame();return {menu,paused,before,after};})()`);
 await probe('ship-death-retry',`(async()=>{const ui=superficie.scene.get('Interface');sessao.estado={...sessao.estado,oxigenio:0,dose:100};ui.irPara('fim');for(let i=0;i<20&&!qa.texts('Interface').some(t=>t.text==='Try the trip again');i++){ui.acaoPrincipal?.();await qa.frame();}ui.acaoPrincipal?.();await qa.frame();return {mundo:sessao.mundo,fase:sessao.fase,dia:sessao.estado.dia,oxygen:sessao.estado.oxigenio,dose:sessao.estado.dose};})()`);
 await world('lua',0);
 await probe('rover-rapid-key-fixture',`(async()=>{const {desembarcar}=await import('/src/engine/rover.ts');const r=sessao.rover;const p=desembarcar(r,sessao.terreno,sessao.grade.caixas());superficie.corpo=p;sessao.diaCargaRover=sessao.estado.dia;superficie.aplicarZoom();await qa.frame();return {position:p,charged:sessao.roverCarregado};})()`);
 for(let i=0;i<20;i++){await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'e',code:'KeyE',windowsVirtualKeyCode:69});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'e',code:'KeyE',windowsVirtualKeyCode:69});await sleep(25);}
 await probe('rover-after-20-physical-e-presses',`({dirigindo:sessao.rover.dirigindo,body:superficie.corpo,locked:sessao.emTarefa,finite:Number.isFinite(superficie.corpo.x+superficie.corpo.y+superficie.corpo.z)})`);
 report.completed=true;
}catch(e){report.completed=false;report.failure=String(e);console.error(e);process.exitCode=1;}
finally{await writeFile(output,JSON.stringify(report,null,2));console.log('Saved '+output);ws?.close();chrome.kill();await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200}).catch(e=>console.error(e.message));}
