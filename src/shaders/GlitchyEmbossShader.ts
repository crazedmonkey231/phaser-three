import * as THREE from "three";
import { Shader } from "../PostProcess";

/** 
 * A Scene shader that applies an glitchy emboss effect
*/
export const GlitchyEmbossShader: Shader = {
 uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2(800, 600) }, // screen size
    pixelSize: { value: 2.0 },
    glitchStrength: { value: 0.2 }
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
    uniform vec2 resolution;
    uniform float pixelSize;
    uniform float glitchStrength;
    varying vec2 vUv;

    float luma(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    vec2 pixelate(vec2 uv, vec2 resolution, float size) {
      vec2 grid = resolution / max(size, 1.0);
      return floor(uv * grid) / grid;
    }

    void main() {
      vec2 texel = 1.0 / resolution;
      vec2 uv = pixelate(vUv, resolution, pixelSize);

      vec3 baseColor = texture2D(tDiffuse, uv).rgb;
      float center = luma(baseColor);

      float emboss =
        -luma(texture2D(tDiffuse, uv + vec2(-texel.x, -texel.y)).rgb) +
         luma(texture2D(tDiffuse, uv + vec2( texel.x,  texel.y)).rgb) +
        -luma(texture2D(tDiffuse, uv + vec2(-texel.x,  texel.y)).rgb) * 0.5 +
         luma(texture2D(tDiffuse, uv + vec2( texel.x, -texel.y)).rgb) * 0.5;

      float edge = clamp(center + emboss * 1.1, 0.0, 1.0);

      float lineHash = hash(vec2(floor(uv.y * resolution.y * 0.5), floor(time * 1.5)));
      float isGlitchLine = step(0.82, lineHash);
      float glitchOffset = (hash(vec2(floor(uv.y * resolution.y), floor(time))) - 0.5) * glitchStrength * 2.0;
      float ripple = sin((uv.y + time * 0.3) * 40.0) * glitchStrength * 0.5;

      vec2 warpedUV = uv;
      warpedUV.x += (glitchOffset + ripple) * isGlitchLine;
      warpedUV = clamp(warpedUV, texel * 2.0, 1.0 - texel * 2.0);

      vec3 warpedSample = texture2D(tDiffuse, warpedUV).rgb;
      float warpedEdge = luma(warpedSample);

      float glitchMask = isGlitchLine * smoothstep(0.0, 1.0, hash(uv * 200.0 + time));
      float finalEdge = mix(edge, warpedEdge, glitchMask * glitchStrength * 8.0);

      vec3 col = vec3(finalEdge);
      col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));

      gl_FragColor = vec4(col, 0.1);
    }
  `,
};
