import { Shader } from "../PostProcess";

export const TestShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 1 },
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
    varying vec2 vUv;

    vec3 pallette(float t) {
      // cyan to magenta to yellow
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.0, 0.33, 0.67);
      return a + b * cos(6.28318 * (c * t + d));
    }

    vec2 rotate(vec2 uv, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        mat2 rotationMatrix = mat2(c, -s, s, c);
        return rotationMatrix * uv;
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      //swirl effect
      vec2 uv = vUv - 0.5;
      float angle = 15.0 * length(uv) - time * 2.5;
      uv = rotate(uv, angle);
      uv += 0.75;
      color.rgb = texture2D(tDiffuse, uv).rgb;

      gl_FragColor = color;
    }
  `,
};
