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
 report.checks=[];
 const check=async(name,expression)=>{const r=await js(expression);report.checks.push({name,...r});await writeFile(output,JSON.stringify(report,null,2));console.log(name+': '+(r.ok?'PASS':'FAIL'));if(!r.ok)throw Error(name+': '+JSON.stringify(r));};
 const setup=()=>js(`window.qa={frame:()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),texts:key=>{const out=[];const walk=(o,vis=true)=>{vis=vis&&o.visible!==false;if(vis&&typeof o.text==='string')out.push(o.text);if(o.list)for(const c of o.list)walk(c,vis);};for(const o of superficie.scene.get(key).children.list)walk(o);return out;}};`);
 const reload=async()=>{await cdp('Page.reload');await sleep(1000);await until('!!window.superficie?.corpo&&!superficie.scene.isActive("Carregar")',45000);await setup();};
 const world=async(mundo,idx)=>{await js(`(async()=>{superficie.game.scene.stop('Radar');const {iniciarMundo3D}=await import('/src/cenas/irParaMarte.ts');iniciarMundo3D(superficie.scene.get('Interface'),'${mundo}',${idx},8,[202].slice(0,${idx}));})()`);await until(`sessao.mundo==='${mundo}'&&sessao.fase==='manha'`,30000);};
 const day=()=>js("sessao.novoDia();superficie.scene.get('Interface').irPara('dia');void 0");
 const click=async(scene,label)=>{const p=await js(`(()=>{const out=[];const words=o=>typeof o.text==='string'?[o.text]:(o.list??[]).flatMap(words);const walk=(o,vis=true)=>{vis=vis&&o.visible!==false;if(vis&&o.input?.enabled&&words(o).some(t=>t.includes(${JSON.stringify(label)}))){const b=o.getBounds();out.push({x:b.centerX,y:b.centerY});}if(o.list)for(const c of o.list)walk(c,vis);};superficie.scene.get(${JSON.stringify(scene)}).children.list.forEach(o=>walk(o));return out[0];})()`);if(!p)throw Error('Missing button '+label);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});await sleep(100);};
 const result=async(mundo,win)=>{await js(`(async()=>{sessao.estado={...sessao.estado,dia:${win?(mundo==='nave'?6:9):1},meta:${win?100:0},oxigenio:${win?60:0}};const ui=superficie.scene.get('Interface');ui.irPara('fim');for(let i=0;i<20;i++){const t=qa.texts('Interface');if(t.some(x=>x.includes('${mundo==='nave'?(win?'Land on Mars':'Try the trip again'):'PLAY AGAIN FROM THE MOON'}')))break;ui.acaoPrincipal?.();await qa.frame();}})()`);};
 await setup();await world('nave',1);
 await check('forecast uses the range instead of the hidden level',`(async()=>{const ui=superficie.scene.get('Interface');const pages=[];for(let i=0;i<20&&sessao.fase==='manha';i++){pages.push(...qa.texts('Interface'));if(pages.some(t=>t.startsWith('Forecast:')))break;ui.acaoPrincipal?.();await qa.frame();}return {ok:pages.some(t=>t.includes('1–3 batteries'))&&!pages.some(t=>t.includes('needs 2 batteries')),pages};})()`);
 await day();
 await check('station success and active expedition are saved',`(async()=>{const d=superficie.decoVisuais.find(x=>x.d.id==='nave_plantas').d;superficie.usarEstacao(d);await qa.frame();const ready=performance.now();while(!superficie.scene.isActive('HortaTarefa')){if(performance.now()-ready>5000)throw Error('Horta did not open');await qa.frame();}const s=superficie.scene.get('HortaTarefa');s.vencer();const done=performance.now();while(!sessao.estacoesHoje.has('nave_plantas')){if(performance.now()-done>5000)throw Error('Horta result not applied');await qa.frame();}sessao.estado={...sessao.estado,dia:2};superficie.iniciarExploracao('ferramenta');const e=sessao.expedicao;sessao.expedicao={...e,atual:1,feitos:e.feitos.map((v,i)=>i===0),espera:0};sessao.exploracaoEm=7;const saved=sessao.salvar();return {ok:saved&&sessao.estacoesHoje.has('nave_plantas'),exp:sessao.expedicao};})()`);
 await reload();
 await check('station and expedition survive a real page reload',`({ok:sessao.estacoesHoje.has('nave_plantas')&&sessao.expedicao?.atual===1&&sessao.exploracaoEm===7,done:[...sessao.estacoesHoje],exp:sessao.expedicao,countdown:sessao.exploracaoEm})`);
 await click('Radar','EXPLORE THE BASE');
 await click('Radar','GO!');await until("sessao.mundo==='lua'&&sessao.explorando",20000);
 await check('selected Moon exploration preserves campaign save',`(()=>{const before=localStorage.getItem('lunar-odyssey-save-v1');const attempted=sessao.salvar();return {ok:sessao.mundo==='lua'&&sessao.fase==='inicio'&&!attempted&&localStorage.getItem('lunar-odyssey-save-v1')===before&&JSON.parse(before).mundo==='nave',world:sessao.mundo,exploring:sessao.explorando};})()`);
 await reload();await check('campaign returns after free exploration',`({ok:sessao.mundo==='nave'&&sessao.estado.dia===2&&sessao.expedicao?.atual===1,world:sessao.mundo,day:sessao.estado.dia})`);
 await world('marte',2);await result('marte',true);
 await click('Interface','PLAY AGAIN FROM THE MOON');await until("sessao.mundo==='lua'&&sessao.fase==='manha'",15000);
 await check('restart after victory starts a fresh Moon campaign',`({ok:sessao.estado.dia===1&&sessao.estado.meta===0&&sessao.estado.dose===0&&sessao.pontos.length===0,state:sessao.estado,world:sessao.mundo})`);
 await js('void sessao.salvar()');await reload();
 await check('fresh restart persists after reloading',`({ok:sessao.mundo==='lua'&&sessao.estado.dia===1&&sessao.fase==='manha',world:sessao.mundo,phase:sessao.fase})`);
 await world('marte',2);await result('marte',false);
 await check('death explanation names oxygen',`(async()=>{const ui=superficie.scene.get('Interface');ui.mostrarFase();const texts=qa.texts('Interface');return {ok:texts.some(t=>t.includes('ran out of oxygen'))&&!texts.some(t=>t.includes('not finished in time')),texts};})()`);
 await result('marte',false);await click('Interface','Try Mars again');await until("sessao.mundo==='marte'&&sessao.fase==='manha'",15000);
 await check('Mars can retry without replaying the whole campaign',`({ok:sessao.estado.dia===1&&sessao.estado.oxigenio===60&&sessao.estado.meta===0,world:sessao.mundo,state:sessao.estado})`);
 await day();
 await js("superficie.scene.get('Interface').guia?.terminar();superficie.scene.get('Interface').guia=undefined;void 0");
 await click('Interface','JUMP');
 await check('touch jump uses the same character physics',`({ok:!superficie.corpo.noChao&&superficie.corpo.vz>0,body:superficie.corpo})`);
 await check('science fact remains accessible after the fast close',`(async()=>{const {lerDescobertas}=await import('/src/descobertas.ts');const ui=superficie.scene.get('Interface');ui.abrirMenu();await qa.frame();const menu=ui.scene.get('MenuJogo');menu.abrirPagina('science');await qa.frame();const texts=qa.texts('MenuJogo');const notes=lerDescobertas();menu.scene.stop();await qa.frame();return {ok:notes.some(d=>d.fato.includes('Plants also make oxygen'))&&texts.some(t=>t.includes('Plants also make oxygen')),notes,texts};})()`);
 await world('nave',1);await result('nave',true);await click('Interface','Land on Mars');await until("superficie.scene.isActive('Viagem')",20000);
 await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(100);
 await check('pausing freezes the landing and its chapter transition',`(async()=>{const ui=superficie.scene.get('Interface'),s=ui.scene.get('Viagem'),before=s.t;await new Promise(r=>setTimeout(r,1200));return {ok:ui.scene.isActive('MenuJogo')&&ui.scene.isPaused('Viagem')&&s.t===before&&sessao.mundo==='nave',before,after:s.t,world:sessao.mundo};})()`);
 await js("void superficie.scene.stop('MenuJogo')");await until("sessao.mundo==='marte'",20000);
 await check('landing resumes once and removes the pause overlay',`({ok:!superficie.scene.isActive('MenuJogo')&&superficie.scene.isActive('Superficie')&&!superficie.scene.isPaused('Superficie'),world:sessao.mundo,phase:sessao.fase})`);
 await check('restart clears the rocket departure animation state',`(async()=>{superficie.foguetePartiu=true;superficie.scene.get('Interface').novoJogo();await qa.frame();return {ok:sessao.mundo==='lua'&&!superficie.foguetePartiu&&superficie.decolagem===null,world:sessao.mundo,departed:superficie.foguetePartiu};})()`);
 if(process.argv.includes('--capturar')) {
  await day();
  let shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(output.replace(/\.json$/,'-touch.png'),Buffer.from(shot.data,'base64'));
  await cdp('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});await sleep(600);
  await js(`(async()=>{const {BANCO}=await import('/src/tarefas/index.ts');const {registrarDescoberta,lerDescobertas}=await import('/src/descobertas.ts');registrarDescoberta(BANCO[0].titulo,BANCO[0].fato);const ui=superficie.scene.get('Interface');ui.abrirMenu();await qa.frame();const menu=ui.scene.get('MenuJogo');menu.descoberta=lerDescobertas().length-1;menu.abrirPagina('science');await qa.frame();})()`);
  shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(output.replace(/\.json$/,'-science.png'),Buffer.from(shot.data,'base64'));
 }
 if(report.errors.length)throw Error('Runtime errors: '+report.errors.join('; '));
 report.completed=true;
}catch(e){report.completed=false;report.failure=String(e);console.error(e);process.exitCode=1;}
finally{await writeFile(output,JSON.stringify(report,null,2));console.log('Saved '+output);ws?.close();chrome.kill();await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200}).catch(e=>console.error(e.message));}
