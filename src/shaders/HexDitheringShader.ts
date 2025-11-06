import * as THREE from "three";
import { Shader } from "../PostProcess";

/**
 * Screen-space hexagonal grid shader that overlays crisp hex outlines
 * while keeping the underlying scene visible.
 */
export const HexDitheringShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    hexScale: { value: 4.0 },          // hex radius in pixels
    outlineWidth: { value: 1.25 },       // outline width in pixels
    edgeSoftness: { value: 0.5 },       // soft falloff for outlines
    tintStrength: { value: 0.01 },      // how much to blend in the paper tint
    paperTint: { value: new THREE.Vector3(0.58, 0.57, 0.54) },
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
    uniform float hexScale;
    uniform float outlineWidth;
    uniform float edgeSoftness;
    uniform float tintStrength;
    uniform vec3 paperTint;
    varying vec2 vUv;

    const float SQRT3 = 1.73205080757;

    vec2 pixelToAxial(vec2 p, float size) {
      float q = (0.57735026919 * p.x - 0.33333333333 * p.y) / size;
      float r = (0.66666666666 * p.y) / size;
      return vec2(q, r);
    }

    vec3 axialToCube(vec2 axial) {
      float x = axial.x;
      float z = axial.y;
      float y = -x - z;
      return vec3(x, y, z);
    }

    vec3 cubeRound(vec3 cube) {
      vec3 rc = floor(cube + 0.5);
      vec3 diff = abs(rc - cube);
      if (diff.x > diff.y && diff.x > diff.z) {
        rc.x = -rc.y - rc.z;
      } else if (diff.y > diff.z) {
        rc.y = -rc.x - rc.z;
      } else {
        rc.z = -rc.x - rc.y;
      }
      return rc;
    }

    vec2 axialToPixel(vec2 axial, float size) {
      float x = size * (SQRT3 * axial.x + 0.5 * SQRT3 * axial.y);
      float y = size * (1.5 * axial.y);
      return vec2(x, y);
    }

    float sdHexagon(vec2 p, float radius) {
      p = abs(p);
      return max((p.x * 0.86602540378 + p.y * 0.5), p.y) - radius;
    }

    void main() {
      vec2 res = max(resolution, vec2(1.0));
      float size = max(hexScale, 1.0);

      vec2 pixelPos = vUv * res;
      vec2 axial = pixelToAxial(pixelPos, size);
      vec3 cube = axialToCube(axial);
      vec3 rounded = cubeRound(cube);
      vec2 roundedAxial = vec2(rounded.x, rounded.z);
      vec2 center = axialToPixel(roundedAxial, size);

      vec2 local = pixelPos - center;
      float dist = sdHexagon(local, size);

      vec3 sceneColor = texture2D(tDiffuse, vUv).rgb;

      float edge = 1.0 - smoothstep(outlineWidth, outlineWidth + edgeSoftness, abs(dist));
      vec3 outlineColor = vec3(0.08);

      float cellNoise = fract(sin(dot(roundedAxial, vec2(12.9898, 78.233))) * 43758.5453);
      vec3 tintedScene = mix(sceneColor, paperTint - cellNoise * 0.05, tintStrength);

      vec3 finalColor = mix(tintedScene, outlineColor, edge);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};
