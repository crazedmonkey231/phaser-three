import * as THREE from "three";
import { Shader } from "../PostProcess";

/**
 * Kuwahara Scene shader for creating a stylized, painterly effect
 *
 * https://www.shadertoy.com/view/wX2fzR
 */
export const KuwaharaShader: Shader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(800, 600) }, // screen size
    radius: { value: 1.0 },
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
    uniform float radius;

    #define RADIUS 5                        // Cell Radius
    #define PRADIUS 8                       // Cell Radius (Peperi)
    #define N 8                             // Sector Number
    #define BETA   1.2                      // Variance Sensitivity (0.5..2)
    #define EPS    1e-6
    #define LUMA vec3(0.299, 0.587, 0.114)  // LUMA Factor

    vec2 texel; 
    vec2 uvMin;
    vec2 uvMax;
    int mode = 1;

    struct MeanVar {
      vec3 mean; 
      float var;
    };

    vec2 rot(vec2 v, float a) {
        float c = cos(a), s = sin(a);
        return vec2(c*v.x - s*v.y, s*v.x + c*v.y);
    }

    // ------------------------------------
    // Basic Kuwahara
    // ------------------------------------
    MeanVar quarterCellMean(vec2 centerUV, vec2 maxOffset, vec2 minOffset) {
      int count = 0;
      vec3 sum = vec3(0);
      float sumLum = 0.0;
      float sumLumSquare = 0.0;
      
      for (int i = int(minOffset.x); i <= int(maxOffset.x); i++)
      {
        for (int j = int(minOffset.y); j <= int(maxOffset.y); j++)
        {
          vec2 offset = vec2(i,j);
          vec2 uv = clamp(centerUV + offset * texel, uvMin, uvMax);  
          vec3 color = texture(tDiffuse, uv).rgb;
          float y = dot(color, LUMA);    // Calculate perceptual brightness with LUMA component, 
                                        // derived from gamma-encoded (nonlinear) RGB
          
          // Calculate sum for mean and luma
          sum += color;
          sumLum += y;               
          sumLumSquare += y*y;
          count++;
        }
      }
      
      // Calculate mean color and luma 
      float fcount = float(count);
      vec3 meanColor = sum/fcount;
      float muY = sumLum/fcount;
      float varY = (sumLumSquare/fcount - muY*muY);
      
      // Construct the return value
      MeanVar retVal;
      retVal.mean = meanColor;
      retVal.var  = varY;
    
      return retVal;
    }

    vec3 basicKuwahara(vec2 centerUV, int R) {
      // NW | NE
      // -------
      // SW | SE
      // In order to calculate the range, 
      // we pass the max/min offset for each cell
      
      MeanVar NW = quarterCellMean(centerUV, vec2(0, R), vec2(-R, 0));
      MeanVar NE = quarterCellMean(centerUV, vec2(R, R), vec2(0, 0));
      MeanVar SW = quarterCellMean(centerUV, vec2(0, 0), vec2(-R, -R));
      MeanVar SE = quarterCellMean(centerUV, vec2(R, 0), vec2(0, -R));
      
      vec3 bestColor = NW.mean; float bestVar = NW.var;
      if (NE.var < bestVar) {bestColor = NE.mean; bestVar = NE.var;}
      if (SW.var < bestVar) {bestColor = SW.mean; bestVar = SW.var;}
      if (SE.var < bestVar) {bestColor = SE.mean; bestVar = SE.var;}
      
      return bestColor;
    }

    void main() {
      // Initialize global variables
      texel = 1.0 / resolution.xy;
      uvMin = texel * 0.5;
      uvMax = 1.0 - texel * 0.5;
      
      // Normalized pixel coordinates (from 0 to 1)
      vec2 uv = (gl_FragCoord.xy + 0.25) * texel;
      gl_FragColor = vec4(basicKuwahara(uv, RADIUS), 1.0);
    }
  `,
};
