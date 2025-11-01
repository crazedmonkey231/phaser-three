// OrbitControls
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/addons/controls/OrbitControls.js';
import { IService } from './Types';

/** Orbit controls service to allow camera orbiting around a target */
export class OrbitControls implements IService {
  name: string = 'OrbitControls';
  private controls: ThreeOrbitControls | undefined;
  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.controls = new ThreeOrbitControls(camera, domElement);
    camera.position.set(50, 20, 50);
    camera.lookAt(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI;
  }

  setEnabled(enabled: boolean): void {
    if (this.controls) {
      this.controls.enabled = enabled;
    }
  }

  update(time: number, delta: number, args: any): void {
    this.controls?.update();
  }

  dispose(): void {
    this.controls?.dispose();
    this.controls = undefined;
  }
}