export type ContatoPegada = { x:number; y:number; z:number; ux:number; uy:number; lado:0|1; comprimento:number; largura:number };
export type PontoPegada = {x:number;y:number};
export function formaPegada(c:ContatoPegada){
  const q=(f:number,s:number):PontoPegada=>({x:c.x+c.ux*f-c.uy*s,y:c.y+c.uy*f+c.ux*s});
  const L=c.comprimento,W=c.largura;
  return {contorno:[q(-L/2,-W/2),q(L*.35,-W/2),q(L/2,-W*.28),q(L/2,W*.28),q(L*.35,W/2),q(-L/2,W/2)],
    riscos:[-.26,0,.26].map(f=>[q(f*L,-W*.34),q(f*L,W*.34)] as [PontoPegada,PontoPegada])};
}
export function pegadaNoSolo(c:ContatoPegada,altura:(x:number,y:number)=>number,construcoes:readonly {gx:number;gy:number;tipo:{w:number;h:number}}[]){
  return Math.abs(c.z-altura(c.x,c.y))<.08&&!construcoes.some(b=>c.x>=b.gx&&c.x<=b.gx+b.tipo.w&&c.y>=b.gy&&c.y<=b.gy+b.tipo.h);
}
