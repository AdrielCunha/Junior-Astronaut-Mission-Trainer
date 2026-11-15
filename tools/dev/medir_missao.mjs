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
 const until=async(expression,timeout=45000)=>{const start=Date.now();while(Date.now()-start<timeout){try{if(await js(expression))return;}catch(e){if(!/context|target navigated/i.test(String(e)))throw e;}await sleep(100);}throw Error(`Timed out: ${expression}`);};
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
 const walk=`(()=>{const k=superficie.corpo;const start={gx:k.x,gy:k.y};const end={gx:k.x,gy:k.y+6};superficie.rota=[end,start,end,start];return true;})()`;
 const flightFrames="Object.keys(superficie.textures.list).filter(k=>/^voo\\d+$/.test(k)).length";
 const sample=async(name,ms,action)=>{
  if(action)await js(action);
  const initial=await js('({vista:sessao.vista,flight:!!sessao.voo,transition:!!sessao.transicao})');
  await js('__perf.frames=[];__perf.distance=0;__perf.lastPosition=null;__perf.start=performance.now();__perf.record=true;');
  await sleep(ms);
  const raw=await js(`(()=>{__perf.record=false;return {frames:__perf.frames,distance:__perf.distance,elapsed:performance.now()-__perf.start,longTasks:__perf.longTasks.filter(e=>e.start>=__perf.start),heap:performance.memory?.usedJSHeapSize??null,vista:sessao.vista,footprints:superficie.ambiente?.marcas.length??0};})()`);
  const windows=[];
  if(ms>=60000){let elapsed=0;const groups=[];for(const f of raw.frames){const i=Math.floor(elapsed/30000);(groups[i]??=[]).push(f);elapsed+=f;}for(let i=0;i<groups.length;i++){const g=groups[i].sort((a,b)=>a-b);const mean=g.reduce((a,b)=>a+b,0)/g.length;windows.push({fromMs:i*30000,frames:g.length,fps:1000/mean,p95Ms:g[Math.floor(g.length*0.95)],over50msPercent:100*g.filter(f=>f>50).length/g.length});}}
  const frames=raw.frames.sort((a,b)=>a-b);if(!frames.length)throw Error(`No animation frames: ${name}`);
  const mean=frames.reduce((a,b)=>a+b,0)/frames.length;
  const result={name,initial,finalView:raw.vista,frames:frames.length,meanMs:mean,p95Ms:frames[Math.min(frames.length-1,Math.floor(frames.length*0.95))],fps:1000/mean,over50msPercent:100*frames.filter(f=>f>50).length/frames.length,longTasks:raw.longTasks.length,longTaskMs:raw.longTasks.reduce((a,b)=>a+b.duration,0),heapBytes:raw.heap,distanceTiles:raw.distance,footprints:raw.footprints,elapsedMs:raw.elapsed};
  if(windows.length)result.windows=windows;
  report.stages.push(result);console.log(JSON.stringify(result));
 };
 if(process.argv.includes('--somente-nave')) {
  await js("(async()=>{const {iniciarNave3D}=await import('/src/cenas/irParaMarte.ts');iniciarNave3D(superficie.scene.get('Interface'),0,[200]);})()");
  await until("sessao.mundo==='nave'&&!!superficie.corpo&&superficie.scene.isActive('Superficie')&&sessao.fase==='manha'");
  await js("(()=>{const ui=superficie.scene.get('Interface');ui.fecharPainel();sessao.fase='dia';superficie.scene.stop('Radar');return true;})()");
  await sleep(3000);
  await sample('ship idle',5000);
  await sample('ship walking',5000,walk);
  await js('superficie.rota=[];superficie.corpo.vx=superficie.corpo.vy=0;');
  await sample('ship without streaming sky',5000,"(()=>{const e=superficie.scene.get('Espaco');window.__viajar=e.viajar;e.viajar=()=>{};e.viagem?.setVisible(false);return true;})()");
  await js("(()=>{const e=superficie.scene.get('Espaco');e.viajar=window.__viajar;e.viagem?.setVisible(true);window.__plumas=superficie.desenharPlumas;superficie.desenharPlumas=()=>{};superficie.plumas?.setVisible(false);return true;})()");
  await sample('ship without thruster graphics',5000);
  await js('(()=>{superficie.desenharPlumas=window.__plumas;superficie.plumas?.setVisible(true);return true;})()');
  if(process.argv.includes('--capturar')) {
   const shot=await cdp('Page.captureScreenshot',{format:'png'});
   await writeFile(output.replace(/\.json$/,'.png'),Buffer.from(shot.data,'base64'));
  }
 }
 if(!process.argv.includes('--somente-tarefas')&&!process.argv.includes('--somente-nave')) {
 if(motion!=='reduced'){
  report.early={filmReadyAtStart:await js('sessao.filmePronto'),flightTexturesAtStart:await js(flightFrames)};
  await sample('early surface idle',3000);
  await sample('early surface walking',4000,walk);
  await js('superficie.rota=[];superficie.corpo.vx=superficie.corpo.vy=0;');
  report.early.flightTexturesAtEnd=await js(flightFrames);
 }
 if(motion!=='reduced')await until('sessao.filmePronto',45000);
 await sleep(3000);
 report.warmup='all flight downloads completed, then 3 seconds idle';
 await sample('surface idle',3000);
 await sample('surface walking',4000,walk);
 if(report.stages.at(-1).distanceTiles<1)throw Error('Walking scenario did not actually move');
 if(await js('!!sessao.rover')) {
  await sample('surface driving',process.argv.includes('--rover-longo')?90000:15000,`(()=>{window.__astronauta=superficie.corpo;const r=sessao.rover;r.dirigindo=true;sessao.diaCargaRover=sessao.estado.dia;superficie.corpo=r.corpo;superficie.rota=[];window.__entrada=superficie.entrada;const inicio=performance.now();superficie.entrada=()=>{const a=Math.floor((performance.now()-inicio)/1500)%4;return {dx:[1,0,-1,0][a],dy:[0,1,0,-1][a],pular:false};};return true;})()`);
  if(report.stages.at(-1).distanceTiles<1)throw Error('Driving scenario did not actually move');
  if(process.argv.includes('--capturar')) {
   const shot=await cdp('Page.captureScreenshot',{format:'png'});
   await writeFile(output.replace(/\.json$/,'.png'),Buffer.from(shot.data,'base64'));
  }
  await js('superficie.entrada=window.__entrada;sessao.rover.dirigindo=false;sessao.rover.corpo.vx=sessao.rover.corpo.vy=0;superficie.corpo=window.__astronauta;');
 }
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
 }
 if(process.argv.includes('--tarefas')) {
  // UI lifecycle checks run without artificial slowdown; frame pacing above keeps
  // the requested CPU rate. Record the real close time separately from the timer.
  await cdp('Emulation.setCPUThrottlingRate',{rate:1});
  report.taskCpuSlowdown=1;
  report.taskPanels=await js(`(async()=>{
   const {concluirTarefa}=await import('/src/cenas/conclusaoTarefa.ts');
   const {vitoria}=await import('/src/cenas/moldura.ts');
   const sm=superficie.game.scene;
   const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const aguardar=async(pred)=>{const t=performance.now();while(!pred()){if(performance.now()-t>2000)throw Error('Task timed out');await frame();}};
   const resultados=[];
   const keys=Object.keys(sm.keys).filter(k=>k.endsWith('Tarefa'));
   for(const key of keys) {
    for(const modo of ['automatico','esc-sucesso','cancelar']) {
     let entregas=0,feito;
     const aoConcluir=()=>entregas++;
     const dados=key==='Tarefa'?{aoTerminar:aoConcluir,tarefa:{titulo:'Check',instrucao:'Check',fato:'Check',montar:(c,a,f)=>{feito=f;}}}:{aoConcluir};
     sm.run(key,dados);await aguardar(()=>sm.isActive(key));await frame();
     const cena=sm.getScene(key),inicio=performance.now();
     if(modo!=='cancelar') {
      if(key==='Tarefa')feito();
      else {vitoria(cena,cena.add.container(0,0),600,300,'Complete','Check',aoConcluir);concluirTarefa(cena,aoConcluir);}
     }
     if(modo!=='automatico')cena.input.keyboard.emit('keydown-ESC');
     await aguardar(()=>!sm.isActive(key));
     const ms=performance.now()-inicio;
     const esperado=modo==='cancelar'&&key!=='Tarefa'?0:1;
     if(entregas!==esperado)throw Error(key+' '+modo+': callbacks='+entregas);
     if(cena.events.listenerCount('update')!==0)throw Error(key+': update listener leaked');
     if(modo==='automatico'&&ms>700)throw Error(key+': slow close '+ms);
     resultados.push({key,modo,ms,entregas});
    }
   }
   return resultados;
  })()`);
  report.taskIntegration=await js(`(async()=>{
   const {concluirTarefa,fecharTarefa}=await import('/src/cenas/conclusaoTarefa.ts');
   const {lerPartida}=await import('/src/salvamento.ts');
   const {EVENTOS}=await import('/src/engine/eventos.ts');
   const sm=superficie.game.scene,checks=[];
   const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const aguardar=async(pred)=>{const t=performance.now();while(!pred()){if(performance.now()-t>3000)throw Error('Integration timed out');await frame();}};
   const verificar=(ok,msg)=>{if(!ok)throw Error(msg);checks.push(msg);};
   sessao.vista='chao';sessao.fase='dia';sessao.emTarefa=false;sessao.transicao=null;sessao.carregando=2;
   superficie.aplicarZoom();
   const sala=sessao.grade.lista.find(c=>c.tipo.sala==='oxigenio');
   sessao.tarefasHoje.delete('oxigenio');
   const antes=sessao.entregas.oxigenio;
   const sorte=Math.random;Math.random=()=>0.999;
   try{superficie.usar(sala);}finally{Math.random=sorte;}
   await aguardar(()=>sm.isActive('OxigenioFaixaTarefa'));
   const tarefa=sm.getScene('OxigenioFaixaTarefa');
   concluirTarefa(tarefa,tarefa.aoConcluir);fecharTarefa(tarefa);await frame();
   verificar(sessao.carregando===1&&sessao.entregas.oxigenio===antes+1,'room: one battery delivered');
   verificar(!sessao.emTarefa&&superficie.input.enabled,'room: controls restored');
   concluirTarefa(tarefa,tarefa.aoConcluir);fecharTarefa(tarefa);await frame();
   verificar(sessao.carregando===1&&sessao.entregas.oxigenio===antes+1,'room: no duplicate delivery');
   verificar(sessao.salvar()&&lerPartida()?.entregas.oxigenio===antes+1,'room: completion saved');
   sessao.carregando=2;sessao.diaCargaRover=null;
   superficie.abastecerRover();await aguardar(()=>sm.isActive('BateriaRoverTarefa'));
   fecharTarefa(sm.getScene('BateriaRoverTarefa'));await frame();
   verificar(sessao.carregando===2&&!sessao.emTarefa&&!sessao.abastecendoRover,'rover: cancellation keeps battery and restores controls');
   superficie.abastecerRover();await aguardar(()=>sm.isActive('BateriaRoverTarefa'));
   const bateria=sm.getScene('BateriaRoverTarefa');
   concluirTarefa(bateria,bateria.aoConcluir);fecharTarefa(bateria);await frame();
   verificar(sessao.carregando===1&&sessao.diaCargaRover===sessao.estado.dia,'rover: success consumes one battery');
   verificar(!sessao.emTarefa&&!sessao.abastecendoRover&&lerPartida()?.diaCargaRover===sessao.estado.dia,'rover: completion saved and controls restored');
   const def=EVENTOS.find(e=>e.efeito!=='radiacao'&&sessao.grade.lista.some(c=>c.tipo.id===e.modulo));
   verificar(!!def,'repair: fixture available');
   sessao.evento={def,construcaoId:sessao.grade.lista.find(c=>c.tipo.id===def.modulo).id};
   const carga=sessao.carregando;
   superficie.consertar();await aguardar(()=>sm.isActive(def.cena));
   const reparo=sm.getScene(def.cena);
   concluirTarefa(reparo,reparo.aoConcluir);fecharTarefa(reparo);await frame();
   verificar(sessao.carregando===carga+1&&sessao.evento===null&&!sessao.emTarefa,'repair: one reward, event cleared and controls restored');
   verificar(sessao.salvar()&&lerPartida()?.carregando===carga+1,'repair: reward saved');
   return checks;
  })()`);
 }
 if(report.errors.length)throw Error('Browser runtime errors: '+report.errors.join('; '));
 report.completed=true;
} catch(e) {report.completed=false;report.failure=String(e);console.error(e);process.exitCode=1;}
finally {
 await writeFile(output,JSON.stringify(report,null,2));console.log(`Saved ${output}`);
 ws?.close();chrome.kill();
 await new Promise(r=>chrome.exitCode!==null?r():chrome.once('exit',r));
 await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200}).catch(e=>console.error('Temporary profile cleanup:',e.message));
}
