import * as THREE from "three";
import { Octree } from "three/examples/jsm/Addons.js";
import { Level } from "../Level";
import { Thing } from "../Thing";
import { HologramShader } from "../shaders/HologramShader";

/** Example subclass of Thing using a sphere mesh */
export class HologramSphere extends Thing {
  private material: THREE.ShaderMaterial | null = null;
  constructor(level: Level, name: string = "hologramSphere") {
    super(level, name, 'HologramSphere');
  }

  create(): void {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    this.material = new THREE.ShaderMaterial(HologramShader);
    const sphere = new THREE.Mesh(geometry, this.material);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    this.group.add(sphere);
  }

  resolveCollision(octree: Octree): void { }

  update(time: number, dt: number): void {
    // Update shader uniform 'time' for animation
    if (this.material) {
      this.material.uniforms.time.value = time / 1000;
    }
  }

  dispose(): void {
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    super.dispose();
  }
}