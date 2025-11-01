import { Shader } from "../PostProcess";


/** 
 * Wave Lights Scene Shader with flowing light waves effect.
 * https://www.shadertoy.com/view/WfSyWy
 */
export const WaveLightsShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    time:    { value: 0.0 },
    opacity: { value: 0.5 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    #define R(a) mat2(cos(a+vec4(0,33,11,0)))

    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float opacity;
    varying vec2 vUv;
    vec3 iResolution = vec3(1.0, 1.0, 1.0);

    void main() {
      float i,s, d=3.5, t=time;
      vec3 p = iResolution;
      vec2 u = (vUv * 2.0 - 1.0) * iResolution.xy / iResolution.y;
      vec4 o;
      vec3 finalColor = vec3(0.0);

      for (o = vec4(0); i++ < 1e2; ) {
          // position
          p = vec3(u * d, d);
          // rots
          p.xy *= R(-t*.11);
          p.xz *= R(t*.11);
          // ripples
          p += cos(2.*t+dot(cos(t+p), p) *  p),
          // accumulate distance
          d += s = dot(abs(p-floor(p)-.5), vec3(.02));
          // accumulate color
          o += 6.*d*vec4(1,2,7,0)+(1.+cos(p.z+vec4(6,4,2,0)))/s;
      }
      
      // tonemap, brightness
      o = tanh(o/2e4);
      vec4 sceneColor = texture2D(tDiffuse, vUv);
      finalColor = mix(sceneColor.rgb, o.rgb, opacity);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};
