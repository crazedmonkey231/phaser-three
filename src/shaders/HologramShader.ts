import { Shader } from "../PostProcess";

/** Hologram Material shader for creating a glowing, animated sphere effect */
export const HologramShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 1 },
    alpha: { value: 0.5 }
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
    uniform float alpha;
    varying vec2 vUv;

    vec3 palette( float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.263,0.416,0.557);

        return a + b*cos(6.28318*(c*t+d));
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float t = time;

      // Normalize and center coordinates
      vec2 uv = (vUv - 0.5);
      float r = length(uv); // distance from center
      float a = atan(uv.y, uv.x);
      // rotate coordinates
      uv = vec2(cos(a + t), sin(a + t)) * r;

      // wave effect
      float wave = sin(uv.x * 6.0 - time * 5.0) * 0.5 + 0.25;
      float glow = smoothstep(0.5, 0.2, r) * wave * 3.0;
      vec3 newColor = palette(t) * glow;

      gl_FragColor = vec4(newColor, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
};
