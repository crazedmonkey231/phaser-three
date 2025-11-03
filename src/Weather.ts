import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { renderer, Level } from './Level';
import { premGenerator } from './Level';
import { IService } from './Types';

export class Weather implements IService {
  name: string = "WeatherService";
  private level: Level;
  private timeofDay: number = 10; // 0-24
  private sky: Sky | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private hemisphericLight: THREE.HemisphereLight | null = null;
  private fog: THREE.FogExp2 | null = null;
  private sunPosition: THREE.Vector3 = new THREE.Vector3();
  private enabled: boolean = false;
  private lastUpdate: number = 0;
  private readonly premUpdateSpeed = 10000;
  private readonly dayUpdateSpeed = 300000; // 5 minutes per day cycle
  private readonly dayTime = 18;
  private readonly nightTime = 6;
  constructor(level: Level) {
    this.level = level;
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(3, 25, 4);
    this.directionalLight.castShadow = true;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.hemisphericLight = new THREE.HemisphereLight(0xffffff, 0.5);
    this.hemisphericLight.position.set(0, 25, 0);
    this.fog = new THREE.FogExp2(0xcce0ff, 0.0003);
    
    level.add(this.sky);
    level.add(this.directionalLight);
    level.add(this.ambientLight);
    level.add(this.hemisphericLight);
    level.fog = this.fog;

    // configure sky shader
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 2;
    skyUniforms['rayleigh'].value = 1;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    this.calculateSunPosition();
    this.level.environment = premGenerator.fromScene(this.level).texture;
  }

  toggle() {
    this.enabled = !this.enabled;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  getEnabled(): boolean { 
    return this.enabled;
  }

  setTimeOfDay(hour: number) {
    this.timeofDay = hour % 24;
    this.calculateSunPosition();
  }

  getTimeOfDay(): number {
    return this.timeofDay;
  }

  private calculateSunPosition() {
    const dayLength = this.dayTime - this.nightTime;
    const totalNightLength = 24 - dayLength;
    const offsetTime = (this.timeofDay - this.nightTime + 24) % 24;
    const inDay = offsetTime < dayLength;
    const cycleSpan = inDay ? dayLength : totalNightLength;
    const cycleTime = offsetTime - (inDay ? 0 : dayLength);
    const progress = cycleTime / cycleSpan;

    let theta: number;
    if (inDay) {
      theta = Math.PI * progress - Math.PI / 2;
    } else {
      theta = Math.PI * progress + Math.PI / 2;
    }

    const phi = 2 * Math.PI * 0.25;
    this.sunPosition.set(
      Math.cos(phi) * Math.sin(theta),
      Math.cos(theta),
      Math.sin(phi) * Math.sin(theta)
    );

    this.sky?.material.uniforms['sunPosition'].value.copy(this.sunPosition);
    renderer.toneMappingExposure = Math.max(0.1, this.sunPosition.y * 0.5);
    if (this.sky) this.sky.material.needsUpdate = true;
  }

  update(time: number, delta: number, args: any) {
    if (!this.enabled) return;
    // update time of day
    this.timeofDay += delta / this.dayUpdateSpeed * 24;
    this.timeofDay %= 24;
    this.calculateSunPosition();
    this.lastUpdate += delta;
    // update environment every five seconds
    if (this.lastUpdate > this.premUpdateSpeed) {
      this.lastUpdate = 0;
      this.level.environment = premGenerator.fromScene(this.level).texture;
    }
  }

  private removeResources() {
    const resources = [];
    if (this.sky) resources.push(this.sky);
    if (this.directionalLight) resources.push(this.directionalLight);
    if (this.ambientLight) resources.push(this.ambientLight);
    if (this.hemisphericLight) resources.push(this.hemisphericLight);
    for (const res of resources) {
      this.level.remove(res);
    }
  }

  private disposeResources() {
    this.sky!.material.dispose();
    this.sky!.geometry.dispose();
    this.directionalLight?.dispose();
    this.ambientLight?.dispose();
    this.hemisphericLight?.dispose();
  }

  dispose() {
    this.enabled = false;
    this.removeResources();
    this.disposeResources();
    this.sky = null as any;
    this.directionalLight = null as any;
    this.ambientLight = null as any;
    this.hemisphericLight = null as any;
    this.fog = null;
    this.level.fog = null;
    this.level = null as any;
  }

  getJsonObject(): any {
    return {
      timeOfDay: this.timeofDay,
      enabled: this.enabled,
    };
  }
}
