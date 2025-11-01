import { Shader } from "../PostProcess";

/** Retro Scanline Scene Shader with vignette and color curve */
export const RetroScanlineShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    time:    { value: 0.0 },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float opacity;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec4 color = texture2D(tDiffuse, uv);
      float scanline = sin(uv.y * 800.0 + time * 50.0) * 0.04;
      color.rgb -= scanline;
      float vignette = smoothstep(0.8, 0.3, distance(uv, vec2(0.5)));
      color.rgb *= vignette;
      //curve
      color.rgb = pow(color.rgb, vec3(1.2));
      gl_FragColor = vec4(color.rgb, opacity);
    }
  `,
};
