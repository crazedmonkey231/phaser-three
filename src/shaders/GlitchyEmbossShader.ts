import { Shader } from "../PostProcess";

/** A Scene shader that applies a glitchy emboss effect */
export const GlitchyEmbossShader: Shader = {
  uniforms: {
    tDiffuse: { value: null }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float offset = 1.0 / 300.0;
      vec4 north = texture2D(tDiffuse, vUv + vec2(0.0, offset));
      vec4 south = texture2D(tDiffuse, vUv - vec2(0.0, offset));
      vec4 east = texture2D(tDiffuse, vUv + vec2(offset, 0.0));
      vec4 west = texture2D(tDiffuse, vUv - vec2(offset, 0.0));
      vec4 edge = north + south + east + west - 3.8 * c;
      gl_FragColor = vec4(edge.rgb * 5.0, c.a);
    }
  `
}