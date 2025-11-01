import * as THREE from "three";
import { Shader } from "../PostProcess";

/** Neon Grid Material Shader with pulsating grid effect */
export const NeonGridShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    time:     { value: 0.0 },
    gridSize: { value: 10.0 },
    lineWidth:{ value: 1 },
    color:    { value: new THREE.Color(0x00ffff) },
    waveFrequency: { value: 60.0 },
    waveSpeed: { value: 2.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { 
      vUv = uv; 
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float gridSize;
    uniform float lineWidth;
    uniform vec3 color;
    uniform float waveFrequency;
    uniform float waveSpeed;
    varying vec2 vUv;
    void main() {
      vec4 original = texture2D(tDiffuse, vUv);
      float scale = gridSize;

      float radius = length(vUv - 0.5);
      float phase = radius * waveFrequency - time * waveSpeed;
      float pulsate = 0.5 + 0.5 * sin(phase);
      
      float adjustedLineWidth = lineWidth * pulsate;
      vec2 grid = abs(fract(vUv * scale - 0.5) - 0.5) / fwidth(vUv * scale);
      float line = min(grid.x, grid.y);
      float gridFactor = 1.0 - smoothstep(adjustedLineWidth, adjustedLineWidth + 0.01, line);
      vec3 gridColor = color * gridFactor * 1.5 * pulsate;
      gl_FragColor = vec4(original.rgb + gridColor, original.a);
    }
  `
}
