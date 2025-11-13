import * as THREE from "three";
import { Level } from "../Level";
import { Thing } from "../Thing";

// A class to manage snow particles in the game level
export class ParticleSnow extends Thing {
  private boardSize: number;
  constructor(level: Level, name: string = "particleSnow", boardSize: number = 100) {
    super(level, name, "Particle");
    this.boardSize = boardSize;
  }

  create(): void {
    // Create snow particle effect here
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const boardSize = this.boardSize;
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * boardSize - boardSize / 2;
      const y = Math.random() * boardSize - boardSize / 2;
      const z = Math.random() * boardSize - boardSize / 2;
      vertices.push(x, y, z);
    }
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    const material = new THREE.PointsMaterial({ 
      color: 0xaaaaaa, 
      size: 0.15,
      transparent: true,
      opacity: 0.75,
      depthWrite: true,
      sizeAttenuation: true,
      alphaTest: 0.1
     });
    const points = new THREE.Points(geometry, material);
    this.group.add(points);
    this.group.position.set(0, this.boardSize / 2, 0);
  }

  update(time: number, dt: number, args: any): void {
    // Snow particle update logic can be implemented here
    this.group.rotation.x += dt * 0.0001;
    this.group.rotation.y += dt * 0.0001; // Slow rotation for effect
  }

  dispose(): void {
    // Clean up resources
    this.group.traverse((child) => {
      if (child instanceof THREE.Points) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
    super.dispose();
  }
}