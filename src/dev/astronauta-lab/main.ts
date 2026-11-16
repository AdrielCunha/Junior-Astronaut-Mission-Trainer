import './style.css';
import { LocomocaoMagnetica } from '../../astronauta/magnetica';
import { LocomocaoLunar, type PoseLocomocao } from '../../astronauta/locomocao';
import { criarPose } from '../../astronauta/pose';
import { RenderizadorAstronauta, type ModeloAstronauta } from '../../astronauta/renderizador';
import { MovimentoLab, direcaoEntrada, cotovelo, somar, escalar, normalizar, cruzar, produto, girar, type V3, type MundoLab } from '../../astronauta/movimento';
type Mesh = { name: string; color: string; vertices: V3[]; faces: number[][] };
type Model = ModeloAstronauta;
type Face = { points: [number,number][]; depth: number; color: string; light: number };
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('cena'), ctx=canvas.getContext('2d')!;
const movimento=new MovimentoLab();
const lunar=new LocomocaoLunar();
const magnetica=new LocomocaoMagnetica();
let poseLunar:PoseLocomocao|null=null,virtualX=0,virtualZ=0;
let gpu: RenderizadorAstronauta|null=null;
let model: Model, width=800,height=700, zoom=1, azimuth=Math.PI/4,elevation=Math.PI/6, yaw=0, alvoYaw=0, auto=false, ritmo=1;
let x=0,z=0, last=0, dragging=false, frames=0, statsTime=0, fps=60;
let cameraAltura=0,cameraEscala=1;
const keys=new Set<string>(), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const numbers: HTMLButtonElement[]=[];
for(let i=0;i<=5;i++){
  const b=document.createElement('button');b.textContent=String(i);b.setAttribute('aria-label',`${i} baterias`);
  b.onclick=()=>carga(i);$('carga').append(b);numbers.push(b);
}
function carga(n:number){movimento.definirCarga(n);$('contagem').innerHTML=`${movimento.quantidade} <small>/ 5</small>`;
  numbers.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===movimento.quantidade)));
  $<HTMLButtonElement>('pegar').disabled=movimento.quantidade===5;$<HTMLButtonElement>('retirar').disabled=movimento.quantidade===0;}
$('pegar').onclick=()=>carga(movimento.quantidade+1);$('retirar').onclick=()=>carga(movimento.quantidade-1);
$('pular').onclick=()=>movimento.pular();
$('andar').onclick=()=>{auto=!auto;$('andar').setAttribute('aria-pressed',String(auto));$('andar').textContent=auto?'Ⅱ Parar caminhada':'▶ Caminhar';};
$('girar').onclick=()=>{alvoYaw+=Math.PI/2;};
$('camera').onclick=()=>{azimuth=Math.PI/4;elevation=Math.PI/6;zoom=1;x=z=0;virtualX=virtualZ=0;lunar.reiniciar();magnetica.reiniciar();poseLunar=null;};
$<HTMLInputElement>('ritmo').oninput=e=>{ritmo=Number((e.target as HTMLInputElement).value);$('ritmo-label').textContent=`${ritmo.toFixed(1)}×`;};
const labels:Record<MundoLab,string>={lua:'01 / SUPERFÍCIE LUNAR',marte:'02 / SOLO DE MARTE',nave:'03 / CONVÉS DA NAVE'};
document.querySelectorAll<HTMLButtonElement>('[data-mundo]').forEach(b=>b.onclick=()=>{
  movimento.mundo=b.dataset.mundo as MundoLab;$('mundo-label').textContent=labels[movimento.mundo];
  document.querySelectorAll<HTMLButtonElement>('[data-mundo]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));
});
window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select,textarea'))return;
  if(['Space','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  keys.add(e.code);if(!e.repeat&&e.code==='Space')movimento.pular();if(/^Digit[0-5]$/.test(e.code))carga(Number(e.code.slice(-1)));});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{keys.clear();last=0;});
canvas.addEventListener('pointerdown',e=>{dragging=true;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;azimuth-=e.movementX*.007;elevation=Math.max(.06,Math.min(.65,elevation+e.movementY*.005));});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.min(1.55,Math.max(.65,zoom*Math.exp(-e.deltaY*.001)));},{passive:false});
function resize(){const b=canvas.getBoundingClientRect();width=b.width;height=b.height;const dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
new ResizeObserver(resize).observe(canvas);
function camera(v:V3):V3 {const p=girar(somar(v,[0,-1.05-cameraAltura,0]),-azimuth);return [p[0],p[1]*Math.cos(elevation)-p[2]*Math.sin(elevation),p[1]*Math.sin(elevation)+p[2]*Math.cos(elevation)];}
function project(v:V3):[number,number]{const p=camera(v),scale=Math.min(width*.28,height*.31)*zoom*cameraEscala;return [width*.5+p[0]*scale,height*.52-p[1]*scale];}
function shade(hex:string,light:number){const a=[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*light)));return `rgb(${a.join(',')})`;}
function draw(){
  ctx.clearRect(0,0,width,height);
  const ground=movimento.mundo==='marte'?'#684331':movimento.mundo==='nave'?'#314359':'#334458';
  const corners:V3[]=[[-6,-.045,-6],[6,-.045,-6],[6,-.045,6],[-6,-.045,6]];
  ctx.fillStyle=ground;ctx.globalAlpha=.28;ctx.beginPath();corners.forEach((p,i)=>{const q=project(p);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  ctx.strokeStyle=movimento.mundo==='marte'?'#bd8b6430':'#9cbad21c';ctx.lineWidth=1;
  for(let i=-6;i<=6;i++){for(const line of [[[-6,0,i],[6,0,i]],[[i,0,-6],[i,0,6]]] as V3[][]){ctx.beginPath();ctx.moveTo(...project(line[0]));ctx.lineTo(...project(line[1]));ctx.stroke();}}
  const shadow=project([x,.01,z]);const ss=Math.min(width*.28,height*.31)*zoom*cameraEscala;
  ctx.fillStyle=`rgba(0,0,0,${.32/(1+movimento.altura)})`;ctx.beginPath();ctx.ellipse(shadow[0],shadow[1],ss*(.38+movimento.altura*.07),ss*.09,0,0,Math.PI*2);ctx.fill();
  const faces:Face[]=[];
  const world=(p:V3):V3=>somar(girar(p,yaw),[x,movimento.altura,z]);
  function meshes(group:string,transform:(p:V3)=>V3){for(const mesh of model.groups[group]??[]){const vs=mesh.vertices.map(v=>world(transform(v)));
    for(const face of mesh.faces){const pts=face.map(i=>vs[i]);const raw=cruzar(somar(pts[1],escalar(pts[0],-1)),somar(pts[2],escalar(pts[0],-1)));
      // Swapping Blender Z-up to runtime Y-up reverses winding: outward normals are -raw.
      const facing=raw[0]*Math.sin(azimuth)*Math.cos(elevation)+raw[1]*Math.sin(elevation)+raw[2]*Math.cos(azimuth)*Math.cos(elevation);
      if(facing>=0)continue;
      const n=escalar(normalizar(raw),-1);
      const light=.58+.40*Math.max(0,produto(n,normalizar([-.5,1,1])));
      faces.push({points:pts.map(project),depth:pts.reduce((a,p)=>a+camera(p)[2],0)/pts.length,color:mesh.color,light});}}
  }
  const pose=criarPose(movimento,reduced,poseLunar);
  if(gpu){
    const dpr=canvas.width/width;
    const ok=gpu.desenhar(pose,{largura:canvas.width,altura:canvas.height,pixelsPorMetro:Math.min(width*.28,height*.31)*zoom*cameraEscala*dpr,
      origemX:width*.5*dpr,origemY:height*.52*dpr,azimuth,elevation,alvoY:1.05+cameraAltura,yaw,posicao:[x,movimento.altura,z]});
    if(ok)return;
    gpu.canvas.remove();gpu.destruir();gpu=null;
  }
  for(const item of pose)meshes(item.grupo,item.transformar);
  faces.sort((a,b)=>a.depth-b.depth);
  ctx.lineJoin='round';ctx.lineWidth=.45;
  for(const face of faces){ctx.beginPath();face.points.forEach((p,i)=>{if(i)ctx.lineTo(...p);else ctx.moveTo(...p);});ctx.closePath();ctx.fillStyle=shade(face.color,face.light);ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.stroke();}
}
function tick(time:number){const dt=last?Math.min(.05,(time-last)/1000):0;last=time;
  if(!document.hidden){
    const direita=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const frente=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    const moving=!!(direita||frente), direction=direcaoEntrada(direita,frente,azimuth);
    const elapsed=dt*ritmo;
    if(moving)alvoYaw=Math.atan2(direction[0],direction[2]);
    // The suit turns deliberately before stepping forward; translation follows its facing.
    const angle=Math.atan2(Math.sin(alvoYaw-yaw),Math.cos(alvoYaw-yaw));
    const turn=(2.8-movimento.quantidade*.12)*elapsed;
    if(movimento.estadoSalto==='solo')yaw+=Math.max(-turn,Math.min(turn,angle));
    // Small fixed substeps keep the springs and gravity stable even at low frame rates.
    const steps=Math.max(1,Math.ceil(elapsed/(1/120)));
    for(let i=0;i<steps;i++)movimento.atualizar(elapsed/steps,moving||auto);
    if(moving&&movimento.estadoSalto==='solo'){
      const heading=girar([0,0,1],yaw), alignment=Math.max(0,produto(heading,direction));
      const distance=movimento.velocidadeCaminhada*elapsed*alignment*alignment;
      x=Math.max(-1.5,Math.min(1.5,x+heading[0]*distance));z=Math.max(-1.5,Math.min(1.5,z+heading[2]*distance));
    }
    if(auto&&!moving){const advance=girar([0,0,movimento.velocidadeCaminhada*elapsed],yaw);virtualX+=advance[0];virtualZ+=advance[2];}
    poseLunar=movimento.mundo==='lua'?lunar.atualizar(elapsed,[x+virtualX,movimento.altura,z+virtualZ],yaw,moving||auto,movimento.noChao,movimento.velocidadeCaminhada):movimento.mundo==='nave'?magnetica.atualizar(elapsed,[x+virtualX,movimento.altura,z+virtualZ],yaw,moving||auto,movimento.noChao):null;
    if(movimento.mundo!=='lua')lunar.reiniciar();
    if(movimento.mundo!=='nave')magnetica.reiniciar();
    // Keep both the landing ground and the top of five batteries visible throughout a Moon jump.
    const cameraBlend=1-Math.exp(-dt*10);
    cameraAltura+=(movimento.altura*.5-cameraAltura)*cameraBlend;
    cameraEscala+=(1/(1+movimento.altura*.38)-cameraEscala)*cameraBlend;
    draw();frames++;statsTime+=dt;
    if(statsTime>.5){fps=Math.round(frames/statsTime);frames=0;statsTime=0;$('estado').textContent=`${movimento.quantidade} BATERIAS · ${({solo:'NO SOLO',preparacao:'PREPARANDO',impulso:'IMPULSO',voo:movimento.velocidadeVertical>0?'SUBINDO':'DESCENDO',pouso:'ABSORVENDO IMPACTO',recuperacao:'RECUPERANDO APOIO'})[movimento.estadoSalto]} · ${fps} FPS`;}
  }
  requestAnimationFrame(tick);
}
async function init(){try{const response=await fetch(`${import.meta.env.BASE_URL}lab/astronauta-modelo.json`);
  if(!response.ok)throw Error(`Modelo indisponível (${response.status})`);model=await response.json() as Model;
  if(!model.groups.battery?.length||model.maxBatteries!==5)throw Error('Modelo de baterias inválido');
  gpu=RenderizadorAstronauta.criar(model);
  if(gpu){gpu.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';canvas.parentElement?.append(gpu.canvas);}
  carga(3);resize();requestAnimationFrame(tick);
}catch(e){$('erro').hidden=false;$('erro').textContent=`Não foi possível carregar o laboratório: ${String(e)}`;}}
void init();
