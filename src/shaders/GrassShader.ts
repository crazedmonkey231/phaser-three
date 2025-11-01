// Grass material shader
import * as THREE from "three";
import { Shader } from "../PostProcess";

/** Grass Material Shader with wind sway and subtle fire effect */
export const GrassShader: Shader = {
  uniforms: {
    tDiffuse: { value: new THREE.TextureLoader().load('textures/sprites/meat.png') },
    time:    { value: 0.0 },
    windStrength: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    uniform float time;
    uniform float windStrength;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.x += sin(position.z * 25.0 + time) * 0.25 * windStrength;
      // pos.y += cos(position.x * 15.0 + time) * 0.1 * windStrength;
      pos.z += cos(position.x * 25.0 + time) * 0.25 * windStrength;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // fire effect
      float flicker = 0.1 + 0.1 * sin(time * 10.0 + vUv.y * 20.0);
      color.rgb += flicker;

      gl_FragColor = color;
    }
  `,
};