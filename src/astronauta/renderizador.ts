import { girar, somar, type V3 } from './movimento.ts';
import { matrizDe, type PartePose } from './pose.ts';
export type Malha = { name: string; color: string; outline?: boolean; role?: string; vertices: V3[]; normals?: V3[]; faces: number[][] };
export type ModeloAstronauta = { version?: number; batteryPitch: number; maxBatteries: number; groups: Record<string, Malha[]> };
export type PaletaAstronauta = { suit: string; accent: string; boot: string; pack: string; glint: string };
export type CameraAstronauta = { largura: number; altura: number; pixelsPorMetro: number; origemX: number; origemY: number; azimuth: number; elevation: number; alvoY: number; yaw: number; posicao?: V3 };
type BufferMalha = { vbo: WebGLBuffer; quantidade: number; cor: string; papel?: string; contorno: boolean };
const VERTEX=`attribute vec3 aPos; attribute vec3 aNormal;
uniform mat4 uModel; uniform mat4 uRoot; uniform mat4 uView;
varying vec3 normal; varying vec3 position;
void main(){vec4 p=uRoot*uModel*vec4(aPos,1.0);position=p.xyz;
normal=mat3(uRoot*uModel)*aNormal;gl_Position=uView*p;}`;
const FRAGMENT=`precision mediump float;varying vec3 normal;varying vec3 position;
uniform vec3 uColor;uniform float uOutline;
void main(){if(uOutline>0.5){gl_FragColor=vec4(uColor,1.0);return;}
vec3 n=normalize(normal);vec3 key=normalize(vec3(-0.6,1.0,0.8));
float soft=max(0.0,dot(n,key));float fill=max(0.0,dot(n,normalize(vec3(0.8,0.5,-0.5))));
vec3 linearColor=pow(uColor,vec3(2.2));
vec3 light=vec3(0.35,0.40,0.49)+vec3(0.95,0.90,0.82)*soft+vec3(0.22,0.30,0.40)*fill;
vec3 lit=linearColor*light;
float spec=pow(max(0.0,dot(reflect(-key,n),normalize(vec3(0.0,0.35,1.0)))),32.0)*0.12;
// Soft clay shading and a restrained highlight, matching the source Blender materials.
gl_FragColor=vec4(pow(max(lit+vec3(spec),vec3(0.0)),vec3(1.0/2.2)),1.0);}`;
const cor=(hex:string)=>new Float32Array([1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));

/** One actor / WebGL context, static GPU meshes, skeletal transforms as uniforms. */
export class RenderizadorAstronauta {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private grupos=new Map<string,BufferMalha[]>();
  private uniforms: Record<string,WebGLUniformLocation|null>={};
  private pos: number;
  private normal: number;
  private perdido=false;
  private perder=(e:Event)=>{e.preventDefault();this.perdido=true;};
  static criar(modelo:ModeloAstronauta): RenderizadorAstronauta|null {
    if(typeof WebGLRenderingContext==='undefined')return null;
    const canvas=document.createElement('canvas');
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
    if(!gl)return null;
    try{return new RenderizadorAstronauta(canvas,gl,modelo);}catch{gl.getExtension('WEBGL_lose_context')?.loseContext();return null;}
  }
  private constructor(canvas:HTMLCanvasElement,gl:WebGLRenderingContext,modelo:ModeloAstronauta){
    this.canvas=canvas;this.gl=gl;
    const compile=(type:number,source:string)=>{const shader=gl.createShader(type);if(!shader)throw Error('Shader unavailable');
      gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const info=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(info??'Shader failed');}return shader;};
    const vs=compile(gl.VERTEX_SHADER,VERTEX),fs=compile(gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram();
    if(!program)throw Error('Program unavailable');gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Link failed');this.program=program;
    this.pos=gl.getAttribLocation(program,'aPos');this.normal=gl.getAttribLocation(program,'aNormal');
    for(const name of ['uModel','uRoot','uView','uColor','uOutline'])this.uniforms[name]=gl.getUniformLocation(program,name);
    for(const [grupo,meshes] of Object.entries(modelo.groups)){
      const buffers:BufferMalha[]=[];
      for(const mesh of meshes){
        const data:number[]=[];
        for(const face of mesh.faces)for(let i=1;i<face.length-1;i++){
          // Runtime Y-up swaps Blender Y/Z, reversing winding. Keep front faces outward.
          for(const index of [face[0],face[i+1],face[i]])data.push(...mesh.vertices[index],...(mesh.normals?.[index]??[0,1,0]));
        }
        const vbo=gl.createBuffer();if(!vbo)throw Error('Buffer unavailable');gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
        buffers.push({vbo,quantidade:data.length/6,cor:mesh.color,papel:mesh.role??undefined,contorno:!!mesh.outline});
      }
      this.grupos.set(grupo,buffers);
    }
    canvas.addEventListener('webglcontextlost',this.perder);
  }
  desenhar(pose:PartePose[],camera:CameraAstronauta,paleta?:PaletaAstronauta):boolean {
    const gl=this.gl;if(this.perdido||gl.isContextLost())return false;
    if(this.canvas.width!==camera.largura||this.canvas.height!==camera.altura){this.canvas.width=camera.largura;this.canvas.height=camera.altura;}
    gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.disable(gl.BLEND);gl.useProgram(this.program);
    const root=matrizDe(p=>somar(girar(p,camera.yaw),camera.posicao??[0,0,0]));
    // Project isometrically into exactly the same pixel space as the Phaser / lab camera.
    const project=(v:V3):V3=>{const p=girar(somar(v,[0,-camera.alvoY,0]),-camera.azimuth),ce=Math.cos(camera.elevation),se=Math.sin(camera.elevation);
      return [(camera.origemX+p[0]*camera.pixelsPorMetro)/camera.largura*2-1,1-(camera.origemY-(p[1]*ce-p[2]*se)*camera.pixelsPorMetro)/camera.altura*2,-(p[1]*se+p[2]*ce)/16];};
    gl.uniformMatrix4fv(this.uniforms.uRoot,false,root);gl.uniformMatrix4fv(this.uniforms.uView,false,matrizDe(project));
    gl.enableVertexAttribArray(this.pos);gl.enableVertexAttribArray(this.normal);
    for(const item of pose){const meshes=this.grupos.get(item.grupo);if(!meshes)continue;gl.uniformMatrix4fv(this.uniforms.uModel,false,matrizDe(item.transformar));
      for(const mesh of meshes){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vbo);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(this.normal,3,gl.FLOAT,false,24,12);
        const hex=mesh.papel==='magnet'?(item.imaAtivo===false?'#334155':'#67e8f9'):paleta&&mesh.papel?paleta[mesh.papel as keyof PaletaAstronauta]??mesh.cor:mesh.cor;
        gl.uniform3fv(this.uniforms.uColor,cor(hex));gl.uniform1f(this.uniforms.uOutline,Number(mesh.contorno||mesh.papel==='magnet'));gl.drawArrays(gl.TRIANGLES,0,mesh.quantidade);}
    }
    return gl.getError()===gl.NO_ERROR;
  }
  destruir(){const gl=this.gl;for(const meshes of this.grupos.values())for(const mesh of meshes)gl.deleteBuffer(mesh.vbo);this.grupos.clear();gl.deleteProgram(this.program);this.canvas.removeEventListener('webglcontextlost',this.perder);gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
