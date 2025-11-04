import { Shader } from "../PostProcess";

/** A Scene shader that applies an emboss effect */
export const EmbossShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 5.0 },
    edgeStrength: { value: 3.8 },
    offsetStrength: { value: 300.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float edgeStrength;
    uniform float offsetStrength;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float offset = 1.0 / offsetStrength;
      vec4 north = texture2D(tDiffuse, vUv + vec2(0.0, offset));
      vec4 south = texture2D(tDiffuse, vUv - vec2(0.0, offset));
      vec4 east = texture2D(tDiffuse, vUv + vec2(offset, 0.0));
      vec4 west = texture2D(tDiffuse, vUv - vec2(offset, 0.0));
      vec4 edge = north + south + east + west - edgeStrength * c;
      gl_FragColor = vec4(edge.rgb * strength, c.a);
    }
  `
}