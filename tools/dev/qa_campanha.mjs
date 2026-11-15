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
 report.cases=[];report.campaign=[];
 const persist=()=>writeFile(output,JSON.stringify(report,null,2));
 const state=()=>js(`(()=>({mundo:sessao.mundo,fase:sessao.fase,estado:sessao.estado,pontos:sessao.pontos,carregando:sessao.carregando,emTarefa:sessao.emTarefa,scenes:superficie.game.scene.scenes.filter(s=>s.scene.isActive()).map(s=>s.sys.settings.key)}))()`);
 const probe=async(name,expression)=>{try{const evidence=await js(expression);report.cases.push({name,evidence});console.log(name+': '+JSON.stringify(evidence));}catch(e){report.cases.push({name,failure:String(e)});console.error(name,e);}await persist();};
 const shot=async(name)=>{const r=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(output.replace(/\.json$/,'-'+name+'.png'),Buffer.from(r.data,'base64'));};
 const key=async(k,code,n,ms=100)=>{await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:k,code,windowsVirtualKeyCode:n});await sleep(ms);await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:k,code,windowsVirtualKeyCode:n});};
 await js(`window.qa={
  frame:()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),
  texts:(key)=>{const out=[];const walk=(o,vis=true)=>{vis=vis&&o.visible!==false;if(vis&&typeof o.text==='string')out.push({text:o.text,bounds:o.getBounds?.()});if(o.list)for(const c of o.list)walk(c,vis);};const s=superficie.game.scene.getScene(key);if(s)for(const o of s.children.list)walk(o);return out;},
  finish:async()=>{await qa.frame();for(const s of superficie.game.scene.scenes)if(s.scene.isActive()&&s.sys.settings.key.endsWith('Tarefa'))s.input.keyboard?.emit('keydown-ESC');await qa.frame();await qa.frame();},
  panel:async(pattern)=>{const ui=superficie.scene.get('Interface');for(let i=0;i<30;i++){if(qa.texts('Interface').some(t=>new RegExp(pattern,'i').test(t.text)))return;ui.acaoPrincipal?.();await qa.frame();}throw Error('Panel not found: '+pattern);}
 };`);
 await probe('title',`({texts:qa.texts('Radar'),audio:document.querySelector('audio')?.querySelector('source')?.src})`);
 await shot('title');
 await key('Enter','Enter',13);
 await until("sessao.fase==='manha'",15000);
 for(const mundo of ['lua','nave','marte']) {
  await until(`sessao.mundo==='${mundo}'&&sessao.fase==='manha'`,30000);
  await probe(mundo+':morning',`({mundo:sessao.mundo,day:sessao.estado.dia,texts:qa.texts('Interface'),forecast:sessao.dia.previsao,actual:sessao.dia.nivel,audio:document.querySelector('audio')?.querySelector('source')?.src})`);
  await js(`(async()=>{const ui=superficie.scene.get('Interface');for(let i=0;i<30&&sessao.fase==='manha';i++){ui.acaoPrincipal?.();await qa.frame();}})()`);
  const p0=await js('({...superficie.corpo})');
  await key('w','KeyW',87,800);await key(' ','Space',32,90);
  const p1=await js('({...superficie.corpo})');
  report.cases.push({name:mundo+':keyboard-walk-jump',evidence:{before:p0,after:p1,distance:Math.hypot(p1.x-p0.x,p1.y-p0.y)}});
  await probe(mundo+':pause',`(async()=>{const ui=superficie.scene.get('Interface');ui.abrirMenu();await qa.frame();const p={...superficie.corpo};const scenes=['Espaco','Superficie','Interface'].map(k=>({key:k,paused:ui.scene.isPaused(k)}));await new Promise(r=>setTimeout(r,250));const moved=Math.hypot(superficie.corpo.x-p.x,superficie.corpo.y-p.y);ui.scene.get('MenuJogo').input.keyboard.emit('keydown-ESC');await qa.frame();return {scenes,moved,resumed:ui.scene.isActive('Superficie')};})()`);
  if(mundo!=='nave') {
   await probe(mundo+':rover-spam',`(async()=>{const s=superficie,r=sessao.rover;const original=s.corpo;const {desembarcar,pontoLivre}=await import('/src/engine/rover.ts');sessao.diaCargaRover=sessao.estado.dia;const results=[];for(let i=0;i<30;i++){r.dirigindo=true;s.corpo=r.corpo;const out=desembarcar(r,sessao.terreno,sessao.grade.caixas());if(out)s.corpo=out;results.push({exited:!!out,finite:Number.isFinite(s.corpo.x+s.corpo.y+s.corpo.z),free:out?pontoLivre(sessao.terreno,sessao.grade.caixas(),out.x,out.y,out.raio):null});}r.dirigindo=false;s.corpo=original;return results;})()`);
   await probe(mundo+':planner',`(async()=>{const ui=superficie.scene.get('Interface');const opened=ui.abrirEditor();await qa.frame();const active=ui.scene.isActive('EditorBase');if(active)ui.scene.stop('EditorBase');await qa.frame();return {opened,active,editando:sessao.editandoBase,worldActive:ui.scene.isActive('Superficie')};})()`);
  } else {
   await probe('nave:station-save',`(async()=>{const d=superficie.decoVisuais.find(o=>o.d.id==='nave_plantas')?.d;if(!d)return {missing:true};superficie.usarEstacao(d);await qa.frame();const ready=performance.now();while(!superficie.scene.isActive('HortaTarefa')){if(performance.now()-ready>5000)throw Error('Horta did not open');await qa.frame();}const s=superficie.scene.get('HortaTarefa');s.vencer();const done=performance.now();while(!sessao.estacoesHoje.has('nave_plantas')){if(performance.now()-done>5000)throw Error('Horta result not applied');await qa.frame();}sessao.salvar();const raw=JSON.parse(localStorage.getItem('lunar-odyssey-save-v1'));return {doneBefore:[...sessao.estacoesHoje],persistedField:raw.estacoesHoje??null,availableAfterRestoreSimulation:!new Set(raw.estacoesHoje??[]).has('nave_plantas')};})()`);
  }
  if(mundo==='marte') {
   await probe('marte:zoom-return',`(async()=>{const ui=superficie.scene.get('Interface');ui.zoomMarte();const start=performance.now();while(!ui.scene.isActive('MarteVista')){if(performance.now()-start>15000)throw Error('Mars view not ready');await qa.frame();}const opened=true;ui.scene.get('MarteVista').input.keyboard.emit('keydown-ESC');while(sessao.emTarefa){if(performance.now()-start>20000)throw Error('Mars view did not return');await qa.frame();}return {opened,closed:!ui.scene.isActive('MarteVista'),locked:sessao.emTarefa};})()`);
  }
  const played=await js(`(async()=>{
   const {entregar,pronto,custo,bateriasDoDia,nenhuma,resultado}=await import('/src/regras.ts');
   const {origemBaterias}=await import('/src/engine/estacaoSolar.ts');
   const log=[];let skips=0;
   const ui=()=>superficie.scene.get('Interface');
   for(let i=0;i<9;i++){
    if(sessao.fase==='fim')break;
    for(let p=0;p<30&&sessao.fase!=='dia';p++){ui().acaoPrincipal?.();await qa.frame();}
    if(sessao.fase!=='dia')throw Error('Day did not open: '+sessao.fase);
    let free=bateriasDoDia(sessao.estado,sessao.C),s=sessao.estado,a=nenhuma();const plan=[];
    const use=(ef,n)=>{const missing=pronto(s,ef,sessao.C)?0:custo(ef,sessao.C)-(s.obras[ef]??0);const k=Math.min(free,missing+n);for(let j=0;j<k;j++){[s,a]=entregar(s,a,ef,sessao.C);plan.push(ef);}free-=k;};
    use('aquecimento',sessao.dia.frio??0);use('blindagem',Math.ceil((sessao.dia.previsao[0]+sessao.dia.previsao[1])/2));
    const oxygen=sessao.estado.oxigenio-sessao.C.oxigenioPorNoite-Math.max(0,(sessao.dia.frio??0)-a.aquecimento)*10;
    use('oxigenio',oxygen<=5?Math.ceil((5-oxygen)/sessao.C.oxigenioPorBateria):0);
    while(free-->0)plan.push('meta');
    const before={...sessao.estado};
    superficie.usar(sessao.grade.lista.find(c=>c.tipo.id===origemBaterias(sessao.mundo)));await qa.finish();skips++;
    for(const ef of plan){const c=sessao.grade.lista.find(c=>c.tipo.sala===ef);if(!c)throw Error('Missing room '+ef+' day '+sessao.estado.dia);superficie.usar(c);await qa.finish();}
    ui().terminarDia();await qa.frame();
    if(sessao.fase==='dia')throw Error('End day blocked; storm='+sessao.tempestade.status);
    log.push({day:before.dia,before,plan,after:{...sessao.estado},result:resultado(sessao.estado,sessao.C)});
    for(let p=0;p<30&&sessao.fase==='noite';p++){ui().acaoPrincipal?.();await qa.frame();}
   }
   await qa.panel(sessao.mundo==='lua'?'Board the ship':sessao.mundo==='nave'?'Land on Mars':'PLAY AGAIN FROM THE MOON');
   return {mundo:sessao.mundo,log,skips,result:resultado(sessao.estado,sessao.C),endTexts:qa.texts('Interface'),state:{...sessao.estado},pontos:sessao.pontos};
  })()`);
  report.campaign.push(played);console.log('Campaign '+mundo+': '+played.result);await persist();await shot(mundo+'-result');
  if(played.result!=='vitoria')throw Error('Campaign lost: '+mundo);
  if(mundo!=='marte') {
   await js("superficie.scene.get('Interface').acaoPrincipal?.()");
   await until(`sessao.mundo==='${mundo==='lua'?'nave':'marte'}'&&sessao.fase==='manha'`,45000);
  }
 }
 await probe('marte:final-save',`(()=>{const saved=sessao.salvar();const value=JSON.parse(localStorage.getItem('lunar-odyssey-save-v1'));return {saved,mundo:value.mundo,fase:value.fase,day:value.estado.dia,goal:value.estado.meta};})()`);
 // Use the actual result button: it currently reloads the page.
 await js("superficie.scene.get('Interface').acaoPrincipal?.()").catch(()=>{});
 await sleep(2000);await until('!!window.superficie?.corpo&&!superficie.scene.isActive("Carregar")',45000);
 await probe('marte:play-again-after-reload',`({mundo:sessao.mundo,fase:sessao.fase,day:sessao.estado.dia,goal:sessao.estado.meta,radar:superficie.scene.isActive('Radar')})`);
 report.afterReplay=await state();await shot('after-replay');
 report.completed=true;
}catch(e){report.completed=false;report.failure=String(e);console.error(e);process.exitCode=1;}
finally{
 await writeFile(output,JSON.stringify(report,null,2));console.log('Saved '+output);
 ws?.close();chrome.kill();await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));
 await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200}).catch(e=>console.error(e.message));
}
