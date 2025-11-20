import * as THREE from "three";
import { Shader } from "../PostProcess";

/** A Material shader for smoke effect */
export const SmokeShader: Shader = {
  uniforms: {
    time: { value: 0.0 },
    fade: { value: 1.0 },
    color: { value: new THREE.Color(0xffffff) },
  },
  vertexShader: `
    uniform float time;
    uniform float fade;
    uniform vec3 color;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.x += sin(uv.y * 10.0 + time * 5.0) * 0.25;
      pos.y += sin(uv.x * 10.0 + time * 5.0) * 0.25;
      pos.z += sin((uv.x + uv.y) * 10.0 + time * 5.0) * 0.25;
      pos *= fade;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    void main() {
      // Simple smoke effect with fading alpha
      float alpha = 1.0 - length(vUv - 0.5) * 2.0;
      alpha *= 1.0 - (time / 3.0);
      gl_FragColor = vec4(color, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
};
