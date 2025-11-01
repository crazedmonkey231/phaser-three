import * as THREE from "three";
import { Level } from "../Level";
import { GrassShader } from "../shaders/GrassShader";
import { Thing } from "../Thing";

export class GrassPlane extends Thing {
  private instanceMesh: THREE.InstancedMesh | null = null;
  constructor(level: Level) {
    super(level, "grassPlane", "grass");
  }

  create(): void {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.ShaderMaterial(GrassShader);

    this.instanceMesh = new THREE.InstancedMesh(geometry, material, 1);
    this.group.add(this.instanceMesh);
    this.instanceMesh.instanceMatrix.needsUpdate = true;
  }

  update(time: number, delta: number, args: any): void {
    // Update logic for grass animation can be added here
    if (this.instanceMesh) {
      (this.instanceMesh.material as THREE.ShaderMaterial).uniforms.time.value = time / 1000;
    }
  }

  dispose(): void {
    super.dispose();
  }
}