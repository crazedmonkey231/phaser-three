import * as THREE from "three";
import { Shader } from "../PostProcess";

/** 
 * A Scene shader that applies a pencil edge effect to the rendered scene creating a paper-like sketch effect.
 */
export const PencilEdgeShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2(800, 600) },
    edgeStrength: { value: 1.0 },
    edgeThickness: { value: 2.0 },
    noiseScale: { value: 300.0 },
    paperTint: { value: new THREE.Vector3(1.0, 0.97, 0.9) },
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
    uniform vec2 resolution;
    uniform float edgeStrength;
    uniform float edgeThickness;
    uniform float noiseScale;
    uniform vec3 paperTint;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    float noise(vec2 uv) {
      vec2 i = floor(uv);
      vec2 f = fract(uv);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float sobel(in sampler2D tex, in vec2 uv, in vec2 texel) {
      float tl = dot(texture2D(tex, uv + texel * vec2(-1.0,  1.0)).rgb, vec3(0.299, 0.587, 0.114));
      float  l = dot(texture2D(tex, uv + texel * vec2(-1.0,  0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float bl = dot(texture2D(tex, uv + texel * vec2(-1.0, -1.0)).rgb, vec3(0.299, 0.587, 0.114));
      float  t = dot(texture2D(tex, uv + texel * vec2( 0.0,  1.0)).rgb, vec3(0.299, 0.587, 0.114));
      float  b = dot(texture2D(tex, uv + texel * vec2( 0.0, -1.0)).rgb, vec3(0.299, 0.587, 0.114));
      float tr = dot(texture2D(tex, uv + texel * vec2( 1.0,  1.0)).rgb, vec3(0.299, 0.587, 0.114));
      float  r = dot(texture2D(tex, uv + texel * vec2( 1.0,  0.0)).rgb, vec3(0.299, 0.587, 0.114));
      float br = dot(texture2D(tex, uv + texel * vec2( 1.0, -1.0)).rgb, vec3(0.299, 0.587, 0.114));

      float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
      float gy =  tl + 2.0 * t + tr - bl - 2.0 * b - br;
      return length(vec2(gx, gy));
    }

    void main() {
      vec2 texel = 1.0 / resolution;
      vec2 uv = vUv;

      float edge = sobel(tDiffuse, uv, texel * edgeThickness);
      edge = clamp(edge * edgeStrength, 0.0, 1.0);
      float ink = smoothstep(0.2, 0.6, edge);

      vec3 colour = texture2D(tDiffuse, uv).rgb;
      float luminance = dot(colour, vec3(0.299, 0.587, 0.114));

      float quantised = floor(luminance * 4.0) / 4.0;
      float hatchA = sin((uv.x + uv.y) * resolution.x * 0.6) * 0.1 + 0.5;
      float hatchB = sin((uv.x - uv.y) * resolution.y * 0.5 + time * 0.5) * 0.1 + 0.5;
      float hatch = mix(hatchA, hatchB, 0.5);
      float sketch = mix(quantised, quantised * hatch, 0.45);

      float grain = noise(uv * resolution / noiseScale + time * 0.05);
      vec3 paper = paperTint - grain * 0.07;

      vec3 finalColour = mix(vec3(0.1), paper * sketch, 1.0 - ink);
      gl_FragColor = vec4(finalColour, 1.0);
    }
  `
};
