// Smoke-test the actual Vite bundle with a recording Canvas. No browser dependency.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let frame, commands=[],path=[];
const context2d={fillStyle:'#000000',strokeStyle:'#000000',globalAlpha:1,lineWidth:1,setTransform(){},clearRect(){commands=[];},beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},closePath(){},ellipse(x,y,rx,ry){for(let i=0;i<=32;i++)path.push([x+Math.cos(i/32*Math.PI*2)*rx,y+Math.sin(i/32*Math.PI*2)*ry]);},fill(){commands.push({path:[...path],color:this.fillStyle,alpha:this.globalAlpha});},stroke(){}};
class E {value='1';dataset={};hidden=false;relList={supports:()=>true};onclick;oninput;addEventListener(){}append(){}setAttribute(){}matches(){return false;}getContext(){return context2d;}getBoundingClientRect(){return {width:900,height:800};}}
const els=new Map();const get=id=>{if(!els.has(id))els.set(id,new E());return els.get(id);};
const document={hidden:false,getElementById:get,createElement:()=>new E(),querySelectorAll:()=>[],addEventListener(){}};
const ctx={document,window:{addEventListener(){}},matchMedia:()=>({matches:false}),devicePixelRatio:1,ResizeObserver:class{constructor(cb){this.cb=cb;}observe(){this.cb();}},requestAnimationFrame:f=>{frame=f;},fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('public/lab/astronauta-modelo.json','utf8'))}),console,Math,URL};
const js=fs.readdirSync('dist-lab/assets').find(x=>x.endsWith('.js'));
vm.runInNewContext(fs.readFileSync('dist-lab/assets/'+js,'utf8'),ctx);
(async()=>{
  for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
  assert.ok(frame,'render loop started');
  frame(1000);assert.ok(commands.length>100,'actual mesh faces rendered');
  for(let count=0;count<6;count++){
    while(Number(get('contagem').innerHTML.match(/^\d+/)[0])<count)get('pegar').onclick();
    while(Number(get('contagem').innerHTML.match(/^\d+/)[0])>count)get('retirar').onclick();
    for(let i=0;i<30;i++)frame(1000+(count*30+i+1)*1000/60);
    assert.ok(commands.every(c=>c.path.every(p=>p.every(Number.isFinite))));
    if(process.env.LAB_CAPTURE)fs.writeFileSync('/tmp/nasa-lab-render-'+count+'.json',JSON.stringify(commands));
  }
  get('andar').onclick();
  let clock=8000;for(let i=0;i<30;i++){clock+=1000/30;frame(clock);}
  if(process.env.LAB_CAPTURE)for(let i=0;i<20;i++){clock+=1000/30;frame(clock);fs.writeFileSync('/tmp/nasa-lab-walk-'+i+'.json',JSON.stringify(commands));}
  get('pular').onclick();
  for(let i=0;i<125;i++){clock+=1000/30;frame(clock);if(process.env.LAB_CAPTURE&&i%2===0)fs.writeFileSync('/tmp/nasa-lab-jump-'+Math.floor(i/2)+'.json',JSON.stringify(commands));}
  assert.ok(!get('erro').textContent,'no runtime error');
  console.log('PASS: built scene loads meshes, renders all 0..5 stacks, walks and jumps; every projected vertex is finite.');
})();
