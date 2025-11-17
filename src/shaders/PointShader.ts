import * as THREE from "three";
import { Shader } from "../PostProcess";

/** Material Shader for points */
export const PointShader: Shader = {
  uniforms: {
    pointTexture: { value: null },
    color: { value: new THREE.Color(0xffffff) },
    size: { value: 1.0 },
    opacity: { value: 0.5 },
    time: { value: 0.0 },
  },
  vertexShader: `
    uniform float size;
    uniform float opacity;  
    uniform float time;
    
    varying vec2 vUv;
    varying vec4 vColor;

    vec3 palette( float t ) {
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.263,0.416,0.557);

      return a + b*cos( 6.28318*(c*t+d) );
    }

    void main() {
      float t = time * 0.1;
      vec3 color = palette(t);
      vColor = vec4(color, opacity);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D pointTexture;
    uniform float opacity;  
    uniform float time;

    varying vec2 vUv;
    varying vec4 vColor;

    void main() {
      vec4 c = vec4(vColor.xyz, opacity);
      gl_FragColor = c * 5.0;
    }
  `,
  depthWrite: false,
  transparent: true,
};