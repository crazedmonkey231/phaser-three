import * as THREE from "three";
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

export interface VoxelWorldOptions {
  size?: THREE.Vector3; // size of the voxel world in world units
  resolution?: number; // number of voxels along one edge of the cube
  isolation?: number;  // threshold for surface extraction
  material?: THREE.Material; // material for the voxel mesh
}

function traverseSphere(world: VoxelWorldMC, center: THREE.Vector3, radius: number, callback: (x: number, y: number, z: number) => number): void {
  center = world.worldToField(center);
  const field = world.marchingCubes.field;
  const res = world.resolution;
  for (let z = 0; z < res; z++) {
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const dx = x - center.x;
        const dy = y - center.y;
        const dz = z - center.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const index = x + y * res + z * res * res;
        if (dist < radius) 
          field[index] = callback(x, y, z);
      }
    }
  }
  world.updateField();
}

export class VoxelWorldMC {
  marchingCubes: MarchingCubes;
  resolution: number;
  isolation: number;
  center: THREE.Vector3;
  raycaster: THREE.Raycaster; 
  constructor(options: VoxelWorldOptions = {}) {
    this.resolution = options.resolution || 32; // default resolution
    this.isolation = options.isolation || 32; // default isolation level
    this.marchingCubes = new MarchingCubes(this.resolution, options.material || new THREE.MeshStandardMaterial({ color: 0x00ff00 }), true, false);
    this.marchingCubes.isolation = this.isolation;
    this.marchingCubes.position.set(0, 0, 0);
    this.marchingCubes.scale.set(options.size?.x || 100, options.size?.y || 100, options.size?.z || 100); // scale the marching cubes to fit the scene
    this.marchingCubes.enableUvs = false;
    this.marchingCubes.enableColors = false;
    this.marchingCubes.castShadow = true;
    this.marchingCubes.receiveShadow = true;
    const resolutionHalf = Math.floor(this.resolution / 2);
    this.center = new THREE.Vector3(resolutionHalf, resolutionHalf, resolutionHalf);
    this.raycaster = new THREE.Raycaster(); 
    this.createWorld();
  }

  onPointerDown(scene: any, camera: any, event: any): void {
    const mouse = new THREE.Vector2();
    mouse.x = (event.x / scene.scale.width) * 2 - 1;
    mouse.y = -(event.y / scene.scale.height) * 2 + 1;
    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObject(this.marchingCubes);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      // Toggle voxel at this position
      // this.addSphere(point, 3);
      this.removeSphere(point, 3);
    }
  }

  worldToField(point: THREE.Vector3): THREE.Vector3 {
    // Convert point to local space of marching cubes
    const localPoint = this.marchingCubes.worldToLocal(point.clone());

    // Convert localPoint to field coordinates
    const toFieldIndex = (value: number) => {
      const normalized = THREE.MathUtils.clamp((value + 1) * 0.5, 0, 1);
      return Math.round(normalized * (this.resolution - 1));
    };

    const fieldX = toFieldIndex(localPoint.x);
    const fieldY = toFieldIndex(localPoint.y);
    const fieldZ = toFieldIndex(localPoint.z);

    return new THREE.Vector3(fieldX, fieldY, fieldZ);
  }

  createWorld(): void {
    // Similar to createTerrain but creates a flat world with rolling hills
    const field = this.marchingCubes.field;
    const res = this.resolution;
    const noise = new ImprovedNoise();
    const scale = 0.1;
    for (let z = 0; z < res; z++) {
      for (let y = 0; y < res; y++) {
        for (let x = 0; x < res; x++) {
          const index = x + y * res + z * res * res;
          const height = Math.floor((noise.noise(x * scale, z * scale, 0) + 1) * (res / 4)); // Height based on noise
          if (y < height) field[index] = this.isolation; // Solid voxel
          else field[index] = 0; // Empty voxel
        }
      }
    }
    this.marchingCubes.update();
  }

  updateField(): void {
    this.marchingCubes.update();
  } 

  addSphere(center: THREE.Vector3, radius: number): void {
    traverseSphere(this, center, radius, () => this.isolation);
  }

  removeSphere(position: THREE.Vector3, radius: number): void {
    traverseSphere(this, position, radius, () => 0);
  }

  updateFieldWithNoise(scale: number = 0.1, height: number = 5): void {
    const size = this.resolution;
    const noise = new ImprovedNoise();
    const data = this.marchingCubes.field;
    let i = 0;
    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const nx = x / size - 0.5, ny = y / size - 0.5, nz = z / size - 0.5;
          const e = noise.noise(nx / scale, ny / scale, nz / scale);
          data[i] = e * height;
          i++;
        }
      }
    }
    this.updateField();
  }

  dispose(): void {
    this.marchingCubes.geometry.dispose();
    if (Array.isArray(this.marchingCubes.material)) {
      this.marchingCubes.material.forEach(mat => mat.dispose());
    } else {
      this.marchingCubes.material.dispose();
    }
  }
}