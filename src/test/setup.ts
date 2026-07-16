import '@testing-library/jest-dom/vitest';

// ResizeObserver polyfill for @react-three/fiber in jsdom
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverPolyfill;

// Mock WebGL context to prevent Three.js from crashing in jsdom
const mockGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (contextId: string, options?: any) {
  if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
    return {
      canvas: this,
      getExtension: () => null,
      getParameter: () => 0,
      createShader: () => 0,
      createProgram: () => 0,
      attachShader: () => {},
      linkProgram: () => {},
      useProgram: () => {},
      createBuffer: () => 0,
      bindBuffer: () => {},
      bufferData: () => {},
      getAttribLocation: () => 0,
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      drawArrays: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      enable: () => {},
      disable: () => {},
      blendFunc: () => {},
      createTexture: () => 0,
      bindTexture: () => {},
      texParameteri: () => {},
      texImage2D: () => {},
      activeTexture: () => {},
      uniform1i: () => {},
      uniformMatrix4fv: () => {},
      getUniformLocation: () => 0,
      uniform4f: () => {},
      uniform1f: () => {},
      depthFunc: () => {},
      cullFace: () => {},
      frontFace: () => {},
      scissor: () => {},
      disableVertexAttribArray: () => {},
      deleteBuffer: () => {},
      deleteProgram: () => {},
      deleteShader: () => {},
      deleteTexture: () => {},
      pixelStorei: () => {},
      readPixels: () => {},
      renderbufferStorage: () => {},
      bindRenderbuffer: () => {},
      createRenderbuffer: () => 0,
      framebufferRenderbuffer: () => {},
      bindFramebuffer: () => {},
      createFramebuffer: () => 0,
      checkFramebufferStatus: () => 36053,
      deleteFramebuffer: () => {},
      deleteRenderbuffer: () => {},
      flush: () => {},
      finish: () => {},
      getError: () => 0,
      isBuffer: () => false,
      isProgram: () => false,
      isShader: () => false,
      isTexture: () => false,
      isFramebuffer: () => false,
      isRenderbuffer: () => false,
      lineWidth: () => {},
      polygonOffset: () => {},
      stencilFunc: () => {},
      stencilOp: () => {},
      stencilMask: () => {},
      colorMask: () => {},
      depthMask: () => {},
      clearDepth: () => {},
      clearStencil: () => {},
      generateMipmap: () => {},
      drawElements: () => {},
      compileShader: () => {},
      shaderSource: () => {},
      bindAttribLocation: () => {},
      getProgramParameter: () => true,
      getShaderParameter: () => true,
      getProgramInfoLog: () => '',
      getShaderInfoLog: () => '',
      getSupportedExtensions: () => [],
      getContextAttributes: () => ({}),
    } as any;
  }
  return mockGetContext.call(this, contextId as any, options);
};

