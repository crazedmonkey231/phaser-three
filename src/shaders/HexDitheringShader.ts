import * as THREE from "three";
import { Shader } from "../PostProcess";

/** Hexagonal dithering Scene shader */
export const HexDitheringShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2() },
    time: { value: 0.0 }
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
    uniform vec2 resolution;
    uniform float time;
    varying vec2 vUv;

    float hash12(vec2 p)
    {
      vec3 p3  = fract(vec3(p.xyx) * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    vec4 hexagon(vec2 p)
    {
      vec2 q = vec2(p.x * 2.0 * 0.5773503, p.y + p.x * 0.5773503);
      
      vec2 pi = floor(q);
      vec2 pf = fract(q);

      float v = mod(pi.x + pi.y, 3.0);
      float ca = step(1.0, v);
      float cb = step(2.0, v);
      vec2 ma = step(pf.xy, pf.yx);

      float e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));

      vec2 cell = pi + ca - cb * ma;
      vec2 center;
      center.x = cell.x / 1.15470053838;
      center.y = cell.y - center.x * 0.5773503;
      float f = length((p - center) * vec2(1.0, 0.85));

      return vec4(center, e, f);
    }

    float map(vec2 p) {
      vec4 hex = hexagon(150.0 * p) / 150.0;
      vec4 tex = texture(tDiffuse, hex.xy + 0.5);
      return -hex.z + 0.02 * (1.0 - (tex.x + tex.y + tex.z) / 3.0);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 p = (vUv - 0.5 * resolution) / resolution.y;
      float d = map(p);
      vec3 col;
      float t = 1.0 - smoothstep(0.0, 2.0 / resolution.y, d);
      col = t * vec3(1.0, 1.0, 1.0) + (1.0 - t) * vec3(0.0, 0.0, 0.1);
      gl_FragColor = vec4(col, 1.0);
    }
  `
};