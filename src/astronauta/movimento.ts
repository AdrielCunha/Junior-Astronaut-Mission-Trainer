export type V3 = [number, number, number];
export type MundoLab = 'lua' | 'marte' | 'nave';
export const GRAVIDADE: Record<MundoLab, number> = { lua: 1.62, marte: 3.71, nave: 9.81 };
export const somar = (a: V3, b: V3): V3 => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const escalar = (a: V3, s: number): V3 => [a[0]*s,a[1]*s,a[2]*s];
export const produto = (a: V3,b: V3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cruzar = (a: V3,b: V3): V3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const normalizar = (v: V3): V3 => escalar(v,1/(Math.hypot(...v)||1));
export function girar(v: V3, yaw: number, pitch = 0, roll = 0): V3 {
  const x=v[0]*Math.cos(roll)-v[1]*Math.sin(roll), y=v[0]*Math.sin(roll)+v[1]*Math.cos(roll);
  const py=y*Math.cos(pitch)-v[2]*Math.sin(pitch), z=y*Math.sin(pitch)+v[2]*Math.cos(pitch);
  return [x*Math.cos(yaw)+z*Math.sin(yaw),py,-x*Math.sin(yaw)+z*Math.cos(yaw)];
}
// Analytic two-link IK. Both arm lengths remain constant and the wrist ends exactly at the grip.
export function cotovelo(ombro: V3, mao: V3, superior: number, inferior: number, dobra: V3): V3 {
  const delta=somar(mao,escalar(ombro,-1)), d=Math.max(.00001,Math.hypot(...delta));
  const eixo=normalizar(delta), alcance=Math.min(d,superior+inferior-.00001);
  const a=(superior*superior-inferior*inferior+alcance*alcance)/(2*alcance);
  const h=Math.sqrt(Math.max(0,superior*superior-a*a));
  const normal=normalizar(somar(dobra,escalar(eixo,-produto(dobra,eixo))));
  return somar(ombro,somar(escalar(eixo,a),escalar(normal,h)));
}
export type EstadoSalto = 'solo' | 'preparacao' | 'impulso' | 'voo' | 'pouso' | 'recuperacao';
const suave = (t: number) => { const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v); };
const interpolar = (a: V3,b: V3,t: number): V3 => somar(escalar(a,1-t),escalar(b,t));
export const ALTURA_TORNOZELO = .043; // Bottom of the boot sole is at ground level.

// Screen-relative input. W points away from the camera; yaw 0 faces +Z in the model.
export function direcaoEntrada(direita: number, frente: number, camera: number): V3 {
  return girar(normalizar([direita,0,-frente]),camera);
}

// Swing: the raised boot travels BACK -> FRONT. Stance: the planted sole travels
// FRONT -> BACK relative to the pelvis, opposing the character's forward displacement.
export function passoTraje(fase: number, amplitude: number, elevacao: number): { z: number; y: number; pitch: number; apoio: boolean } {
  const t=((fase/(Math.PI*2))%1+1)%1;
  if(t<.45){const a=t/.45,arco=Math.sin(Math.PI*a);
    return {z:amplitude*(2*suave(a)-1),y:elevacao*arco*arco,pitch:-.12*arco,apoio:false};}
  return {z:amplitude*(1-2*(t-.45)/.55),y:0,pitch:0,apoio:true};
}

export class MovimentoLab {
  mundo: MundoLab = 'lua';
  quantidade = 0;
  fase = 0;
  mistura = 0;
  altura = 0;
  velocidadeVertical = 0;
  noChao = true;
  estadoSalto: EstadoSalto = 'solo';
  compressao = 0;
  recolhimento = 0;
  bracosSalto = 0;
  inclinacaoCarga = 0;
  private tempoEstado = 0;
  private fisicaExterna = false;
  private intensidadePouso = 1;
  private pesPreparacao: V3[] = [[-.155,ALTURA_TORNOZELO,0],[.155,ALTURA_TORNOZELO,0]];
  private velocidadeCarga = 0;
  private andandoAntes = false;
  private progressoCarga = [1,1,1,1,1];

  get ritmoPassada() { return (this.mundo==='lua'?1.15:this.mundo==='marte'?1.55:1.7)/(1+this.quantidade*.045); }
  get amplitudePassada() { return .13/(1+this.quantidade*.025); }
  // A stance covers 2*amplitude in 55% of a gait cycle. Match root speed to that distance.
  get velocidadeCaminhada() { return 2*this.amplitudePassada*this.ritmoPassada/.55*this.mistura; }
  get duracaoPreparacao() { return .28+this.quantidade*.016; }
  get tempoNaEtapa() { return this.tempoEstado; }

  definirCarga(n: number, animar=true) {
    const novo=Math.max(0,Math.min(5,Math.floor(Number.isFinite(n)?n:0)));
    for(let i=this.quantidade;i<novo;i++)this.progressoCarga[i]=animar?0:1;
    this.quantidade=novo;
  }
  pular() {
    if(this.estadoSalto!=='solo' || !this.noChao)return;
    this.pesPreparacao=[this.pe(-1),this.pe(1)];
    this.etapa('preparacao');
  }
  // In the mission, physics remains authoritative. This only updates the visual pose.
  sincronizarFisica(noChao: boolean, velocidadeVertical: number, altura: number) {
    this.fisicaExterna=true;
    if(!noChao&&this.noChao){this.etapa('voo');this.velocidadeCarga+=.10;}
    if(noChao&&!this.noChao){this.intensidadePouso=Math.min(1.15,Math.max(.4,Math.abs(this.velocidadeVertical)/2.2));this.etapa('pouso');this.velocidadeCarga-=.18*this.intensidadePouso;}
    this.noChao=noChao;this.velocidadeVertical=velocidadeVertical;this.altura=Math.max(0,altura);
  }
  private etapa(estado: EstadoSalto) { this.estadoSalto=estado;this.tempoEstado=0; }

  atualizar(dt: number, andando: boolean) {
    dt=Math.max(0,Math.min(.05,dt));
    this.tempoEstado+=dt;
    const caminhar=andando&&this.estadoSalto==='solo';
    this.mistura+=(Number(caminhar)-this.mistura)*(1-Math.exp(-dt*8));
    if(this.estadoSalto==='solo')this.fase+=dt*this.ritmoPassada*Math.PI*2*this.mistura;
    this.compressao=0;this.recolhimento=0;this.bracosSalto=0;
    switch(this.estadoSalto){
      case 'preparacao':
        this.compressao=suave(this.tempoEstado/this.duracaoPreparacao);
        this.bracosSalto=this.compressao*.35;
        if(this.tempoEstado>=this.duracaoPreparacao)this.etapa('impulso');
        break;
      case 'impulso': {
        const t=suave(this.tempoEstado/.12);
        this.compressao=1-t;this.bracosSalto=.35+.45*t;
        if(this.tempoEstado>=.12){this.noChao=false;this.velocidadeVertical=2.2;
          this.velocidadeCarga+=.10;this.etapa('voo');}
        break;
      }
      case 'voo': {
        if(!this.fisicaExterna){this.velocidadeVertical-=GRAVIDADE[this.mundo]*dt;this.altura+=this.velocidadeVertical*dt;}
        const g=GRAVIDADE[this.mundo];
        const restante=(this.velocidadeVertical+Math.sqrt(this.velocidadeVertical**2+2*g*Math.max(0,this.altura)))/g;
        this.recolhimento=suave(this.tempoEstado/.18)*suave(restante/.24);
        this.bracosSalto=.35+.45*this.recolhimento;
        if(!this.fisicaExterna&&this.altura<=0){
          this.intensidadePouso=Math.min(1.15,Math.abs(this.velocidadeVertical)/2.2);
          this.altura=0;this.velocidadeVertical=0;this.noChao=true;
          this.velocidadeCarga-=.18*this.intensidadePouso;this.etapa('pouso');
          this.bracosSalto=.35;this.recolhimento=0;
        }
        break;
      }
      case 'pouso':
        this.compressao=suave(this.tempoEstado/.14)*this.intensidadePouso;
        this.bracosSalto=.35;
        if(this.tempoEstado>=.14)this.etapa('recuperacao');
        break;
      case 'recuperacao':
        // A short braced hold before the suit slowly straightens, without a rubbery rebound.
        this.compressao=(1-suave((this.tempoEstado-.06)/.32))*this.intensidadePouso;
        this.bracosSalto=this.compressao*.35;
        if(this.tempoEstado>=.38){this.compressao=0;this.bracosSalto=0;this.mistura=0;this.fase=0;this.etapa('solo');}
        break;
    }
    if(caminhar!==this.andandoAntes)this.velocidadeCarga+=caminhar?-.10:.10;
    this.andandoAntes=caminhar;
    const alvo=Math.sin(this.fase)*.005*this.mistura;
    this.velocidadeCarga+=((alvo-this.inclinacaoCarga)*70-this.velocidadeCarga*13)*dt;
    this.inclinacaoCarga=Math.max(-.055,Math.min(.055,this.inclinacaoCarga+this.velocidadeCarga*dt));
    this.progressoCarga=this.progressoCarga.map(p=>Math.min(1,p+dt/.38));
  }
  pe(lado: number): V3 {
    const neutro: V3=[lado*.155,ALTURA_TORNOZELO,0];
    if(this.estadoSalto==='preparacao')return interpolar(this.pesPreparacao[lado<0?0:1],neutro,suave(this.tempoEstado/.16));
    if(this.estadoSalto==='voo')return somar(neutro,[0,.13*this.recolhimento,.055*this.recolhimento]);
    if(this.estadoSalto!=='solo')return neutro;
    const pose=passoTraje(this.fase+(lado<0?0:Math.PI),this.amplitudePassada,.085);
    return somar(neutro,[0,pose.y*this.mistura,pose.z*this.mistura]);
  }
  pitchPe(lado: number) {
    if(this.estadoSalto!=='solo')return -.04*this.recolhimento;
    return passoTraje(this.fase+(lado<0?0:Math.PI),this.amplitudePassada,.085).pitch*this.mistura;
  }
  progresso(i: number) {const t=this.progressoCarga[i]??1;return t*t*(3-2*t);}
  // Exact same transformation is used for the bottom battery and both wrist targets.
  pontoCarga(p: V3): V3 {return somar([0,1.05,.62],girar(p,0,this.inclinacaoCarga,Math.sin(this.fase)*.008*this.mistura));}
}
