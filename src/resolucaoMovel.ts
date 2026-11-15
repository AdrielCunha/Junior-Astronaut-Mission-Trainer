import Phaser from 'phaser';
import { dispositivoMovel } from './mobile';

// Phaser RESIZE uses CSS pixels for its cameras and input. Keep those coordinates,
// but rasterize the final scene at a higher density on touch screens.
export function instalarResolucaoMovel(jogo: Phaser.Game) {
  if (!dispositivoMovel()) return;
  const densidade = Math.min(window.devicePixelRatio || 1, 2);
  if (densidade <= 1) return;

  jogo.events.once(Phaser.Core.Events.READY, () => {
    const renderizador = jogo.renderer;
    const original = renderizador.resize.bind(renderizador);
    const ajustar = (largura: number, altura: number) => {
      const canvas = jogo.canvas;
      const w = Math.round(largura * densidade), h = Math.round(altura * densidade);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      canvas.style.width = `${largura}px`;
      canvas.style.height = `${altura}px`;
      original(w, h);
      if (jogo.renderer.type === Phaser.WEBGL) {
        // Phaser's camera projection stays logical, while viewport and scissor
        // cover the entire physical buffer.
        const webgl = renderizador as Phaser.Renderer.WebGL.WebGLRenderer;
        webgl.setProjectionMatrix(largura, altura);
        webgl.gl.scissor(0, 0, w, h);
      }
    };
    renderizador.resize = ajustar;
    ajustar(jogo.scale.width, jogo.scale.height);
    if (jogo.renderer.type === Phaser.WEBGL) {
      // Pipelines cache their own projection when resized; keep it in CSS pixels too.
      const webgl = renderizador as Phaser.Renderer.WebGL.WebGLRenderer;
      const originalSetScissor = webgl.setScissor.bind(webgl);
      const alturaTela = () => Math.round(jogo.scale.height * densidade);
      // Shader GameObjects use renderer.width/height (physical) to rebuild their
      // own projection each frame. Correct it immediately before they draw.
      const carregarShader = Phaser.GameObjects.Shader.prototype.load;
      Phaser.GameObjects.Shader.prototype.load = function (...args) {
        if (this.scene.game === jogo && !this.renderToTexture &&
            Math.abs(this.projectionMatrix[0] - 2 / jogo.scale.width) > 0.000001) {
          this.projOrtho(0, jogo.scale.width, jogo.scale.height, 0);
        }
        return carregarShader.apply(this, args);
      };
      webgl.setScissor = (x, y, larguraRecorte, alturaRecorte, alturaBuffer) => {
        if (webgl.drawingBufferHeight !== alturaTela()) {
          // Off-screen framebuffers already use physical texture coordinates.
          originalSetScissor(x, y, larguraRecorte, alturaRecorte, alturaBuffer);
        } else {
          originalSetScissor(Math.round(x * densidade), Math.round(y * densidade),
            Math.round(larguraRecorte * densidade), Math.round(alturaRecorte * densidade), alturaBuffer);
        }
      };
      const originalResetScissor = webgl.resetScissor.bind(webgl);
      webgl.resetScissor = () => {
        const scissor = webgl.currentScissor;
        if (scissor && webgl.drawingBufferHeight === alturaTela()) {
          webgl.gl.scissor(Math.round(scissor[0] * densidade),
            webgl.drawingBufferHeight - Math.round((scissor[1] + scissor[3]) * densidade),
            Math.round(scissor[2] * densidade), Math.round(scissor[3] * densidade));
        } else {
          originalResetScissor();
        }
      };
      const corrigirProjecao = () => {
        webgl.pipelines.pipelines.each((_nome, pipeline) => {
          pipeline.setProjectionMatrix(jogo.scale.width, jogo.scale.height);
          return null;
        });
      };
      // Renderer resize emits after updating its viewport and pipeline dimensions.
      webgl.on(Phaser.Renderer.Events.RESIZE, corrigirProjecao);
      corrigirProjecao();
    }
    // ScaleManager writes the logical canvas size before firing resize (including
    // when Safari changes the visible height). Restore the backing buffer afterwards.
    jogo.scale.on(Phaser.Scale.Events.RESIZE, () => {
      if (jogo.canvas.width !== Math.round(jogo.scale.width * densidade) ||
          jogo.canvas.height !== Math.round(jogo.scale.height * densidade)) {
        ajustar(jogo.scale.width, jogo.scale.height);
      }
    });
    if (jogo.renderer.type === Phaser.CANVAS) {
      // CanvasRenderer replaces the transform with each camera matrix. Apply
      // density at the drawing-context boundary without changing camera math.
      const canvasRenderer = renderizador as Phaser.Renderer.Canvas.CanvasRenderer;
      const contexto = canvasRenderer.gameContext;
      const setTransform = contexto.setTransform.bind(contexto);
      contexto.setTransform = ((...args: [number, number, number, number, number, number] | [DOMMatrix2DInit?]) => {
        if (args.length === 6) {
          const [a, b, c, d, e, f] = args;
          setTransform(a * densidade, b * densidade, c * densidade, d * densidade, e * densidade, f * densidade);
        } else {
          setTransform(args[0]);
        }
      }) as CanvasRenderingContext2D['setTransform'];
    }
  });
}
