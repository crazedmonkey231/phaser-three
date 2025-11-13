// Water Plane with PBR (Physically Based Rendering) materials
import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/Addons.js";
import { Level, renderer } from "../Level";
import { HEIGHT_FS, NORMAL_FS } from "../shaders/WaterPbrShader";
import { Thing } from "../Thing";

const MIN_OMEGA = 0.5; // rad/s (~12.6s period); tune to taste

export interface IRadialWaveProps {
  center: THREE.Vector2;  // in local XY coords (plane is in XZ)
  wavelength?: number;     // in world units
  amplitude?: number;      // height multiplier
  decay?: number;          // 1/decay ~ sigma of Gaussian envelope
  phase?: number;          // radians
  speed?: number;          // world units/sec (derives omega)
  omega?: number;          // rad/s (overrides speed if both given)
  periodSec?: number;      // alternative to speed/omega
}

let _tmp = new THREE.Vector3()
const _heightSampleLocal = new THREE.Vector3()
const _heightBaseWorld = new THREE.Vector3()
const _heightNormalScratch = new THREE.Vector3()

export interface ICompWaterPBRProps {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  sizeX: number;
  sizeY: number;
  simW: number;
  simH: number;
  rotationX?: number;
  displacementScale: number;
  mouseSize?: number;
  viscosity?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  foamTint?: string | number | THREE.Color;
  foamGlow?: number;
  foamThreshold?: number;
  foamSharpness?: number;
  foamIntensity?: number;
  splashAtMouseDemo?: boolean;
  waveAtMouseDemo?: boolean;
}

export const defaultWaterPBRProps: ICompWaterPBRProps = {
  mesh: null as any,
  position: new THREE.Vector3(0, 0, 0),
  sizeX: 128,
  sizeY: 128,
  simW: 512,
  simH: 512,
  rotationX: -Math.PI / 2,
  displacementScale: 1,
  mouseSize: 20,
  viscosity: 1,
  color: 'skyblue',
  roughness: 0.3,
  metalness: 0.1,
  transparent: true,
  opacity: 0.9,
  foamTint: new THREE.Color('white'),
  foamGlow: 15,
  foamThreshold: 0.01,
  foamSharpness: 0.1,
  foamIntensity: .5,
  splashAtMouseDemo: true,
  waveAtMouseDemo: true,
};

// A Water Plane with PBR shading
export class WaterPBR extends Thing {
  props: ICompWaterPBRProps;
  gpu: GPUComputationRenderer;
  varHeight: any;
  simTime: number;
  private _MAX_PW: number;
  private _pwWrite: number;
  private _MAX_RW: number;
  private _rwWrite: number;
  private _planeWaves: any[];
  private _radialWaves: any[];
  varNormal: any;
  material: THREE.MeshStandardMaterial;
  private _renderer: THREE.WebGLRenderer;
  private _heightSampleBuffer: Float32Array;
  private _invSizeX: number;
  private _invSizeY: number;
  private _simWidth: number;
  private _simHeight: number;
  private _normalY: number;
  raycaster: THREE.Raycaster;
  pointerNDC: THREE.Vector2;
  hitPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>;
  constructor(level: Level, props?: ICompWaterPBRProps) {
    super(level, "waterPBR", "water");
    this.props = { ...defaultWaterPBRProps, ...props };
    props = this.props;
    const rotationX = props.rotationX ?? -Math.PI / 2;
    const mouseSize = props.mouseSize ?? 10;
    const viscosity = props.viscosity ?? 0.01;
    const color = new THREE.Color(props.color ?? '#1fa6d7');
    const roughness = props.roughness ?? 0.25;
    const metalness = props.metalness ?? 0.0;
    const foamThreshold = props.foamThreshold ?? 0.010;
    const foamSharpness = props.foamSharpness ?? 0.040;
    const foamIntensity = props.foamIntensity ?? 1.3;
    const foamTint = (props.foamTint instanceof THREE.Color ? props.foamTint.clone() : new THREE.Color(props.foamTint ?? 0xffffff));
    foamTint.convertSRGBToLinear();
    const foamGlow = props.foamGlow ?? 0.2;
    const splashAtMouseDemo = props.splashAtMouseDemo ?? true;

    const sizeX = props.sizeX;
    const sizeY = props.sizeY;
    const simW = props.simW;
    const simH = props.simH;
    this._renderer = renderer as THREE.WebGLRenderer;
    this._simWidth = simW;
    this._simHeight = simH;
    this._invSizeX = sizeX !== 0 ? 1 / sizeX : 0;
    this._invSizeY = sizeY !== 0 ? 1 / sizeY : 0;
    this._heightSampleBuffer = new Float32Array(16);
    this.gpu = new GPUComputationRenderer(simW, simH, renderer)
    this.gpu.setDataType(THREE.FloatType)

    const heightInit = this.gpu.createTexture()
    this.#seed(heightInit)

    this.varHeight = this.gpu.addVariable('heightmap', HEIGHT_FS, heightInit)
    this.gpu.setVariableDependencies(this.varHeight, [this.varHeight])
    const hmU = this.varHeight.material.uniforms
    hmU.mousePos       = { value: new THREE.Vector2(9999, 9999) }
    hmU.mouseSize      = { value: mouseSize }
    hmU.viscosity      = { value: viscosity }
    hmU.delta          = { value: 1 / 60 }
    hmU.bounds         = { value: new THREE.Vector2(sizeX * 0.5, sizeY * 0.5) }
    hmU.splashStrength = { value: 0.0 }
    hmU.baselineReturn = { value: 0.08 }  // return to zero height at this rate

    // time
    this.simTime = 0
    hmU.simTime = { value: 0 }

    // plane waves (typed arrays for numeric uniforms)
    const MAX_PW = 4
    hmU.numPW    = { value: 0 }
    hmU.pw_dir   = { value: Array.from({ length: MAX_PW }, () => new THREE.Vector2(1, 0)) }
    hmU.pw_k     = { value: new Float32Array(MAX_PW) }
    hmU.pw_omega = { value: new Float32Array(MAX_PW) }
    hmU.pw_amp   = { value: new Float32Array(MAX_PW) }
    hmU.pw_phase = { value: new Float32Array(MAX_PW) }

    this._MAX_PW = MAX_PW
    this._pwWrite = 0

    // radial waves
    // Radial waves (MAX = 4); keep these arrays the same object forever
    const MAX_RW = 4
    hmU.numRW      = { value: 0 }
    hmU.rw_center = { value: Array.from({ length: MAX_RW }, () => new THREE.Vector2()) }
    hmU.rw_k      = { value: new Float32Array(MAX_RW) }
    hmU.rw_omega  = { value: new Float32Array(MAX_RW) }
    hmU.rw_amp    = { value: new Float32Array(MAX_RW) }   // gate
    hmU.rw_decay  = { value: new Float32Array(MAX_RW) }
    hmU.rw_phase  = { value: new Float32Array(MAX_RW) }

    // book-keeping
    this._MAX_RW = MAX_RW
    this._rwWrite = 0

    // Make GLSL loop bounds explicit
    this.varHeight.material.defines = {
      ...(this.varHeight.material.defines || {}),
    }

    this._planeWaves = []  // {dir:THREE.Vector2, k, omega, amp, phase}
    this._radialWaves = [] // {center:THREE.Vector2, k, omega, amp, decay, phase}

    this.varNormal = this.gpu.addVariable('normalmap', NORMAL_FS, this.gpu.createTexture())
    this.gpu.setVariableDependencies(this.varNormal, [this.varHeight])
    const nmU = this.varNormal.material.uniforms
    nmU.cell         = { value: new THREE.Vector2(1 / simW, 1 / simH) }
    nmU.displacement = { value: this.props.displacementScale }
    nmU.foamParams   = { value: new THREE.Vector2(foamThreshold, foamSharpness) }

    const err = this.gpu.init()
    if (err) console.error(err)

    const geo = new THREE.PlaneGeometry(sizeX, sizeY, simW - 1, simH - 1)
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness,
      roughness,
      transparent: props.transparent ?? true,
      opacity: props.opacity ?? 0.9,
      side: THREE.DoubleSide
    })
    mat.userData.foamIntensity = foamIntensity
    mat.userData.foamTint = foamTint
    mat.userData.foamGlow = foamGlow
    mat.userData.shaderRef = null

    mat.onBeforeCompile = (shader) => {
      // make sure we have our own UV varying
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'varying vec2 vMyUv;\nvoid main() {')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\n  vMyUv = uv;')

      const samplerFn = shader.fragmentShader.includes('#version 300 es') ? 'texture' : 'texture2D'

      shader.fragmentShader = shader.fragmentShader
        // declare our sampler + varying at top of fragment
        .replace('void main() {', 'uniform sampler2D foamMap;\nuniform vec3 foamTint;\nuniform float foamGlow;\nvarying vec2 vMyUv;\nvoid main() {')
        // sample foam alpha from our map
        .replace('#include <normal_fragment_maps>',
    `#include <normal_fragment_maps>
    vec4 foamSample = ${samplerFn}(foamMap, vMyUv);
    float foam = foamSample.a;`)
        // whiten + roughen where foam is present
        .replace('#include <output_fragment>',
    `  float foamMask = clamp(foam * foamIntensity, 0.0, 1.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, foamTint, foamMask);
      roughnessFactor  = mix(roughnessFactor, 1.0, foamMask);
      // totalEmissiveRadiance += foamTint * foamMask * foamGlow;
    #include <output_fragment>`)

      // expose uniforms we set from JS
      shader.uniforms.foamIntensity = { value: mat.userData.foamIntensity ?? 1.2 }
      shader.uniforms.foamMap       = { value: null }
      shader.uniforms.foamTint      = { value: mat.userData.foamTint.clone() }
      shader.uniforms.foamGlow      = { value: mat.userData.foamGlow ?? 0.0 }
      mat.userData.shaderRef = shader
    }


    this.props.mesh = new THREE.Mesh(geo, mat)
    this.props.mesh.rotation.x = rotationX
    const pos = props.position || new THREE.Vector3(0,0,0)
    this.props.mesh.position.set(pos.x, pos.y, pos.z)

    const normal = _heightNormalScratch.set(0, 0, 1).applyQuaternion(this.props.mesh.quaternion).normalize()
    this._normalY = normal.y

    this.material = mat
    
    this.raycaster = new THREE.Raycaster()
    this.pointerNDC = new THREE.Vector2()
    this.hitPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(sizeX, sizeY),
      new THREE.MeshBasicMaterial({ visible: false })
    )
    this.hitPlane.rotation.x = rotationX
    this.hitPlane.position.copy(this.props.mesh.position)

    if (splashAtMouseDemo) {
      window.addEventListener('pointermove', (ev) => {
        const rect = (renderer.domElement as HTMLElement).getBoundingClientRect()
        const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
        this.pointerNDC.set(x, y)
        this.raycaster.setFromCamera(this.pointerNDC, this.level.camera)
        const hits = this.raycaster.intersectObject(this.hitPlane)
        if (hits.length) {
          const p = hits[0].point
          _tmp.copy(p).sub(this.props.mesh!.position)
          const local = _tmp
          this.splash(local.x, -local.z, 5, 30)
          hmU.mousePos.value.set(local.x, -local.z)
        }
      })
      window.addEventListener('pointerout', (ev) => {
        hmU.mousePos.value.set(9999, 9999)
      })
    }
    if (this.props.waveAtMouseDemo) { 
      window.addEventListener('pointerdown', (ev) => {
        const rect = (renderer.domElement as HTMLElement).getBoundingClientRect()
        const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
        this.pointerNDC.set(x, y)
        this.raycaster.setFromCamera(this.pointerNDC, this.level.camera)
        const hits = this.raycaster.intersectObject(this.hitPlane)
        if (hits.length) {
          const p = hits[0].point
          _tmp.copy(p).sub(this.props.mesh!.position)
          const local = _tmp
          hmU.mousePos.value.set(local.x, -local.z)
          this.addRadialWave({
            center: new THREE.Vector2(local.x, -local.z),
            wavelength: 15 + Math.random() * 15,
            amplitude: 5 + Math.random() * 3,
            decay: 0.01 + Math.random() * 0.02,
            phase: 0,
            speed: 1,
            periodSec: 2,
          })
        }
      });
    }
  }

  #seed(tex: THREE.DataTexture) {
    const data: any = tex.image.data
    for (let i = 0; i < data.length; i += 4) {
      data[i + 0] = 0 // height
      data[i + 1] = 0 // velocity
      data[i + 2] = 0
      data[i + 3] = 1
    }
  }

  _worldToLocalXY(worldPoint: THREE.Vector3) {
    const p = worldPoint.clone()
    this.props.mesh!.worldToLocal(p)
    // PlaneGeometry is XY; local z≈0. Use (x,y) directly as our local coords.
    return new THREE.Vector2(p.x, p.y)
  }

  _addPWToUniforms() {
    const u = this.varHeight.material.uniforms
    const n = Math.min(this._planeWaves.length, 4)
    u.numPW.value = n
    for (let i = 0; i < n; i++) {
      const w: any = this._planeWaves[i]
      u.pw_dir.value[i].copy(w.dir)
      u.pw_k.value[i]     = w.k
      u.pw_omega.value[i] = w.omega
      u.pw_amp.value[i]   = w.amp
      u.pw_phase.value[i] = w.phase
    }
    // zero the rest
    for (let i = n; i < 4; i++) u.pw_amp.value[i] = 0
  }

  _addRWToUniforms() {
    const u = this.varHeight.material.uniforms
    const n = Math.min(this._radialWaves.length, 4)
    
    console.log('RW num=', u)
    u.numRW.value = n
    for (let i = 0; i < n; i++) {
      const w: any = this._radialWaves[i]
      u.rw_center.value[i].copy(w.center)
      u.rw_k.value[i]      = w.k
      u.rw_omega.value[i]  = w.omega
      u.rw_amp.value[i]    = w.amp
      u.rw_decay.value[i]  = w.decay
      u.rw_phase.value[i]  = w.phase
    }
    for (let i = n; i < 4; i++) u.rw_amp.value[i] = 0
  }

  _calcOmega(k: number, speed: any, omega: any, periodSec: any) {
    if (Number.isFinite(omega) && omega > 0) return omega
    if (Number.isFinite(periodSec) && periodSec > 0) return 2*Math.PI / periodSec
    if (Number.isFinite(speed) && speed !== 0) return Math.abs(k * speed)
    // fallback: deep-water-ish or just a constant
    const gpu: any = this.gpu
    const g_sim = gpu.width * 3.0
    const om = (k > 0) ? Math.sqrt(Math.max(0, g_sim * k)) : 0
    return Math.max(om, MIN_OMEGA)
  }

    /** Utility: compute k & omega */
  _calcDispersion({ wavelength, speed, omega } : { wavelength?: number, speed?: number, omega?: number }) {
    const k = (wavelength && wavelength > 0) ? (2 * Math.PI / wavelength) : 0
    // Use your compute shader's "gravity" scale (GRAVITY = res.x * 3.0)
    const om = this._calcOmega(k, speed, omega, undefined) // periodSec
    return { k, omega: om }
  }

  getHeightAtPoint(point: THREE.Vector3): number {
    const mesh = this.props.mesh;
    if (!mesh) return 0;

    const renderer = this._renderer;
    const target = this.gpu.getCurrentRenderTarget(this.varHeight);
    if (!renderer || !target) return mesh.position.y;

    const width = this._simWidth;
    const height = this._simHeight;
    if (!width || !height) return mesh.position.y;

    _heightSampleLocal.copy(point);
    mesh.worldToLocal(_heightSampleLocal);

    const lx = _heightSampleLocal.x;
    const ly = _heightSampleLocal.y;

    const u = Math.min(Math.max(lx * this._invSizeX + 0.5, 0), 1);
    const v = Math.min(Math.max(ly * this._invSizeY + 0.5, 0), 1);

    const fx = u * (width - 1);
    const fy = v * (height - 1);

    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);

    const readW = x1 > x0 ? 2 : 1;
    const readH = y1 > y0 ? 2 : 1;

    renderer.readRenderTargetPixels(target, x0, y0, readW, readH, this._heightSampleBuffer);

    const buffer = this._heightSampleBuffer;
    const stride = readW * 4;

    const h00 = buffer[0];
    const h10 = buffer[readW > 1 ? 4 : 0];
    const h01 = buffer[readH > 1 ? stride : 0];
    const h11 = buffer[(readW > 1 && readH > 1) ? stride + 4 : (readH > 1 ? stride : (readW > 1 ? 4 : 0))];

    const tx = readW > 1 ? fx - x0 : 0;
    const ty = readH > 1 ? fy - y0 : 0;

    const hx0 = h00 + (h10 - h00) * tx;
    const hx1 = h01 + (h11 - h01) * tx;
    const heightValue = hx0 + (hx1 - hx0) * ty;

    _heightBaseWorld.set(lx, ly, 0);
    mesh.localToWorld(_heightBaseWorld);
    const baseY = _heightBaseWorld.y;
    if (!Number.isFinite(heightValue)) return baseY;

    const displacement = heightValue * this.props.displacementScale;

    return baseY + displacement * this._normalY;
  }

  /** Public: add a directional plane wave */
  addPlaneWave({ dir, wavelength, amplitude, speed, phase, omega}: {
    dir: THREE.Vector2;       // direction in local XY of plane (not normalized)
    wavelength: number;      // in world units
    amplitude: number;       // height multiplier
    speed: number;          // world units/sec (derives omega)
    phase?: number;          // radians
    omega?: number;          // rad/s (overrides speed if both given)
  }) {
    if (this._planeWaves.length < this._MAX_PW) {
      const d = dir.clone().normalize()
      const { k, omega: om } = this._calcDispersion({ wavelength, speed, omega })
      this._planeWaves.push({ dir: d, k, omega: om, amp: amplitude, phase: phase || 0 })
      this._addPWToUniforms()
    }
  }

  /** Public: add a radial wave source */
  addRadialWave(props: IRadialWaveProps): void {
    const u = this.varHeight.material.uniforms

    // derive k/omega
    const k = (props.wavelength && props.wavelength > 0) ? (2*Math.PI / props.wavelength) : 0
    const om = this._calcOmega(k, props.speed, props.omega, props.periodSec)

    // pick slot (ring)
    const i = this._rwWrite % this._MAX_RW
    this._rwWrite++

    // write in-place
    if (k === 0 || !Number.isFinite(om) || om <= 0) props.amplitude = 0 // gate off bad waves
    u.rw_center.value[i].copy(props.center)
    u.rw_k.value[i]      = k
    u.rw_omega.value[i]  = om
    u.rw_amp.value[i]    = props.amplitude   // <-- gate: nonzero = active
    u.rw_decay.value[i]  = props.decay
    u.rw_phase.value[i]  = props.phase || 0
  }

  disableRadialWave(i: number) {
    const u = this.varHeight.material.uniforms
    if (i >= 0 && i < this._MAX_RW) u.rw_amp.value[i] = 0
  }

  clearWaves() {
    this._planeWaves.length = 0
    this._radialWaves.length = 0
    this._addPWToUniforms()
    this._addRWToUniforms()
  }

  splash(x: number, z: number, size = 20, strength = 1.0, coords: 'local' | 'world' = 'world') {
    const u = this.varHeight.material.uniforms
    if (coords === 'local') u.mousePos.value.set(x, z)
    else {
      const p = new THREE.Vector3(x, this.props.mesh!.position.y, z)
      const v = this._worldToLocalXY(p)
      u.mousePos.value.copy(v)
    }
    if (size != null) u.mouseSize.value = size
    u.splashStrength.value = strength
  }

  splashAtMouse(strength = 1) {
    this.raycaster.setFromCamera(this.pointerNDC, this.level.camera)
    const hit = this.raycaster.intersectObject(this.hitPlane, false)[0]
    if (hit) {
      const local = this._worldToLocalXY(hit.point)
      const u = this.varHeight.material.uniforms
      u.mousePos.value.copy(local)
      u.splashStrength.value = strength
    }
  }

  create(): void {
    this.level.add(this.props.mesh!)
    this.level.add(this.hitPlane)
  }

  update(time: number, delta: number, args: any) {
    // Pointer raycast → local splash, change as you like
    // if (this.props.splashAtMouseDemo) this.splashAtMouse(5.0)

    // Step sim
    this.varHeight.material.uniforms.delta.value = delta / 1000
    this.simTime += delta / 1000
    this.varHeight.material.uniforms.simTime.value = this.simTime
    this.gpu.compute()

    // Bind sim outputs to PBR material
    const heightTex = this.gpu.getCurrentRenderTarget(this.varHeight).texture
    const normalTex = this.gpu.getCurrentRenderTarget(this.varNormal).texture

    const m = this.material
    m.displacementMap   = heightTex
    m.displacementScale = this.props.displacementScale
    m.normalMap         = normalTex
    m.normalScale.set(5, 5) // tweak to taste

    if (m.userData.shaderRef) {
      const uniforms = m.userData.shaderRef.uniforms
      uniforms.foamMap.value = normalTex
      uniforms.foamTint.value.copy(m.userData.foamTint)
      uniforms.foamGlow.value = m.userData.foamGlow ?? 1.0
      uniforms.foamIntensity.value = m.userData.foamIntensity ?? 1.2
    }

    // One-frame impulse reset
    const u = this.varHeight.material.uniforms
    u.mousePos.value.set(9999, 9999)
    u.splashStrength.value = 0.0
  }

  dispose(): void {
    this.gpu.dispose()
    const m: any = this.props.mesh!
    this.level.remove(m)
    this.level.remove(this.hitPlane)
    m.geometry.dispose()
    this.material.dispose()
    this.hitPlane.geometry.dispose()
    this.hitPlane.material.dispose()
    super.dispose();
  }
}
