import * as THREE from 'three';
import { Level, renderer } from './Level';
import { PosterizeShader } from './shaders/PosterizeShader'
import { EffectComposer, 
  Pass,
  RenderPass, 
  OutputPass,
  ShaderPass, 
  UnrealBloomPass,
  FilmPass, 
  RenderPixelatedPass, 
  OutlinePass,
  BokehPass,
  SAOPass,
  SSRPass,
  SMAAPass,
  SSAARenderPass,
  TAARenderPass,
  FXAAShader,
  DotScreenPass,
  LUTPass,
  HalftonePass,
  GlitchPass,
  AfterimagePass
} from 'three/examples/jsm/Addons.js'
import { RenderTransitionPass } from 'three/addons/postprocessing/RenderTransitionPass.js';
import { IUniform } from 'three';
import { IService } from './Types';

/** Shader data structure */
export interface Shader {
  uniforms: { [uniform: string]: IUniform<any> };
  vertexShader: string;
  fragmentShader: string;
}

/** Data structure for a postprocessing pass */
export interface PassData {
  pass: Pass;
  onUpdate?: (delta: number) => void;
  onResize?: (width: number, height: number) => void;
}

/**
 * Postprocess service to manage EffectComposer and passes
 */
export class Postprocess implements IService {
  name: string = "PostprocessService";
  private composer: EffectComposer;
  private level: Level;
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private passes: Map<string, PassData>;
  private order: string[];

  constructor(scene: Level, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
    this.composer = new EffectComposer(renderer);
    this.level = scene;
    this.camera = camera;
    this.passes = new Map() // name -> { pass, onUpdate?, onResize? }
    this.order = []         // names after RenderPass in order
  }

  /** Insert a pass into composer after RenderPass, with optional relative position */
  public insertPass(name: string, pass: Pass, after: string | null = null): void {
    if (this.passes.has(name)) {
      console.warn(`Postprocess already has a pass named ${name}`);
      return;
    }
    const passData: PassData = { pass };
    this.passes.set(name, passData);

    // If an 'after' pass is specified, insert this pass after it
    if (after) {
      const afterIndex = this.order.indexOf(after);
      if (afterIndex !== -1) {
        this.order.splice(afterIndex + 1, 0, name);
        this.composer.insertPass(pass, afterIndex + 1);
      }
    } else {
      // Otherwise, add to the end
      this.order.push(name);
      this.composer.addPass(pass);
    }
  }

  /** Add a pass to the end of the chain */
  public addPass(name: string, pass: Pass): void {
    this.passes.set(name, { pass });
    this.order.push(name);
    this.composer.addPass(pass);
  }

  /** Remove and dispose a pass */
  public removePass(name: string): void {
    const passData = this.passes.get(name);
    if (passData) {
      this.composer.removePass(passData.pass);
      this.passes.delete(name);
      this.order = this.order.filter(n => n !== name);
    }
  }

  public render(): void {
    this.composer.render();
  }

  public dispose(): void {
    this.composer.dispose();
    this.passes.clear();
    this.order = [];
    this.level = null as any;
    this.camera = null as any;
    this.composer = null as any;
  }

  /** Enable/disable a pass */
  public setPassEnabled(name: string, enabled: boolean): void {
    const passData = this.passes.get(name);
    if (passData) {
      passData.pass.enabled = enabled;
    }
  }

  /** Update all passes that registered an updater */
  public update(time: number, delta: number, args: any): void {
    this.passes.forEach(passData => {
      if (passData.onUpdate) {
        passData.onUpdate(delta);
      }
    });
  }

  public getPass(name: string): Pass | null {
    const passData = this.passes.get(name);
    return passData ? passData.pass : null;
  }

  // ---------- Convenience builders ----------

  public addShaderPass(name: string, shader: Shader): void {
    const shaderPass = new ShaderPass(shader);
    this.addPass(name, shaderPass);
  }

  public addRender(name: string): void {
    const renderPass = new RenderPass(this.level, this.camera);
    this.addPass(name, renderPass);
  }
  
  public addPosterize(name: string, levels: number = 4): void {
    const posterizePass = new ShaderPass(PosterizeShader);
    posterizePass.uniforms['levels'].value = levels;
    this.addPass(name, posterizePass);
  }

  public addBloom(name: string, strength: number = 1.5, radius: number = 0.4, threshold: number = 0.85): void {
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), strength, radius, threshold);
    this.addPass(name, bloomPass);
  }

  public addFilm(name: string, noiseIntensity: number = 0.5, grayscale: boolean = false): void {
    const filmPass = new FilmPass(noiseIntensity, grayscale);
    this.addPass(name, filmPass);
  }

  public addPixelate(name: string, pixelSize: number = 4): void {
    const pixelPass = new RenderPixelatedPass(pixelSize, this.level, this.camera);
    this.addPass(name, pixelPass);
  }

  public addOutline(name: string, scene: THREE.Scene, camera: THREE.Camera, { edgeStrength = 5, edgeThickness = 1, visibleEdgeColor = '#ffff00', hiddenEdgeColor = '#ffff00', pulsePeriod=0, selectedObjects = [] } = {}): void {
    const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    outlinePass.selectedObjects = selectedObjects;
    outlinePass.edgeStrength = edgeStrength;
    outlinePass.edgeThickness = edgeThickness;
    outlinePass.visibleEdgeColor.set(visibleEdgeColor);
    outlinePass.hiddenEdgeColor.set(hiddenEdgeColor);
    outlinePass.pulsePeriod = pulsePeriod;
    this.addPass(name, outlinePass);
  }

  public addOutlineLevel(name: string, level: Level, { edgeStrength = 5, edgeThickness = 1, visibleEdgeColor = '#ffff00', hiddenEdgeColor = '#ffff00', pulsePeriod=0, selectedObjects = [] } = {}): void {
    this.addOutline(name, level, level.camera, { edgeStrength, edgeThickness, visibleEdgeColor, hiddenEdgeColor, pulsePeriod, selectedObjects });
  }

  public addBokeh(name: string, params: any = {}): void {
    const bokehPass = new BokehPass(this.level, this.camera, {
      focus: 1.0,
      aperture: 0.025,
      maxblur: 0.01,
      width: window.innerWidth,
      height: window.innerHeight,
      ...params
    });
    this.addPass(name, bokehPass);
  }

  public addSMAA(name: string, params: any = {}): void {
    const smaaPass = new SMAAPass();
    this.addPass(name, smaaPass);
  }

  public addSSR(name: string, params: any = {}): void {
    const ssrPass = new SSRPass({
      renderer: renderer,
      scene: this.level,
      camera: this.camera,
      width: window.innerWidth,
      height: window.innerHeight,
      ...params
    });
    this.addPass(name, ssrPass);
  }

  public addSAO(name: string, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, params: any = {}): void {
    const saoPass = new SAOPass(this.level, camera);
    saoPass.params = {
      ...params
    };
    this.addPass(name, saoPass);
  }

  public addDotScreen(name: string, params: any = {}): void {
    const dotScreenPass = new DotScreenPass();
    this.addPass(name, dotScreenPass);
  }

  public addLUT(name: string, params: any = {}): void {
    const lutPass = new LUTPass();
    this.addPass(name, lutPass);
  }

  public addHalftone(name: string, params: any = {}): void {
    const halftonePass = new HalftonePass({
      width: window.innerWidth,
      height: window.innerHeight,
      ...params
    });
    this.addPass(name, halftonePass);
  }

  public addGlitch(name: string, params: any = {}): void {
    const glitchPass = new GlitchPass();
    this.addPass(name, glitchPass);
  } 

  public addAfterimage(name: string, damp: number): void {
    const afterimagePass = new AfterimagePass(damp);
    this.addPass(name, afterimagePass);
  } 

  public addFXAA(name: string): void {
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    this.addPass(name, fxaaPass);
  }

  public addSSAARender(name: string, scene: THREE.Scene, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, samples: number = 4): void {
    const ssaaPass = new SSAARenderPass(scene, camera, samples);
    this.addPass(name, ssaaPass);
  }

  public addTAARender(name: string, scene: THREE.Scene, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera): void {
    const taaPass = new TAARenderPass(scene, camera);
    this.addPass(name, taaPass);
  }
  
  public addOutput(name: string): void {
    const outputPass = new OutputPass();
    this.addPass(name, outputPass);
  }

  public addTransition(name: string, sceneB: THREE.Scene, cameraB: THREE.PerspectiveCamera | THREE.OrthographicCamera): void {
    const transitionPass = new RenderTransitionPass(this.level, this.camera, sceneB, cameraB);
    this.addPass(name, transitionPass);
  }

  // ---------- End convenience builders ----------
  // ---------- Helpers ----------

  setOutlineSelectedObjects(selectedObjects: THREE.Object3D[], passName: string = "outline"): void {
    const passData = this.passes.get(passName);
    if (passData && passData.pass instanceof OutlinePass) {
      passData.pass.selectedObjects = selectedObjects;
    }
  }
}