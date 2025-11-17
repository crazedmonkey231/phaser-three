import * as THREE from "three";
import { Level } from "../Level";
import { Thing } from "../Thing";
import { PointShader } from "../shaders/PointShader";

export interface OrbitParticleData {
  particlePositions: Float32Array;
  particleVelocities: Float32Array;
  particleSpeeds: Float32Array;
  particleRadius: Float32Array;
}

// A class to manage particles that orbit around a central point in the game level
export class OrbitParticles extends Thing {
  particleCount: number = 300;
  particles: THREE.BufferGeometry | null = null;
  shaderMaterial: THREE.ShaderMaterial | null = null;
  points: THREE.Points | null = null;
  particleData: OrbitParticleData;
  orbitRadius: number;
  spatialPartition: Map<string, Set<number>> = new Map();
  partitionSize: number = 7;
  constructor(level: Level, name: string = "orbitParticles", type: string = "Particle", orbitRadius: number = 21) {
    super(level, name, type);
    this.orbitRadius = orbitRadius;
    this.particleData = {
      particlePositions: new Float32Array(this.particleCount * 3),
      particleVelocities: new Float32Array(this.particleCount * 3),
      particleSpeeds: new Float32Array(this.particleCount),
      particleRadius: new Float32Array(this.particleCount) // radius for each particle
    };
  }

  create(): void {
    this.particles = new THREE.BufferGeometry();

    const r = this.orbitRadius;
    for (let i = 0; i < this.particleCount; i++) {
      const x = Math.random() * r - r / 2;
      const y = Math.random() * r - r / 2;
      const z = Math.random() * r - r / 2;
      
      this.particleData.particlePositions[ i * 3 ] = x;
      this.particleData.particlePositions[ i * 3 + 1 ] = y;
      this.particleData.particlePositions[ i * 3 + 2 ] = z;

      const speed = 0.05 + Math.random() * 0.1;

      this.particleData.particleSpeeds[ i ] = speed;

      this.particleData.particleVelocities[ i * 3 ] = (Math.random() - 0.5) * speed;
      this.particleData.particleVelocities[ i * 3 + 1 ] = (Math.random() - 0.5) * speed;
      this.particleData.particleVelocities[ i * 3 + 2 ] = (Math.random() - 0.5) * speed;

      this.particleData.particleRadius[ i ] = 15.0; // radius
    }

    this.particles.setAttribute("position", new THREE.BufferAttribute(this.particleData.particlePositions, 3));
    this.particles.setAttribute("velocity", new THREE.BufferAttribute(this.particleData.particleVelocities, 3));
    this.particles.setAttribute("speed", new THREE.BufferAttribute(this.particleData.particleSpeeds, 1));
    this.particles.setAttribute("radius", new THREE.BufferAttribute(this.particleData.particleRadius, 1));

    this.shaderMaterial = new THREE.ShaderMaterial(PointShader);
    this.points = new THREE.Points(this.particles, this.shaderMaterial);
    this.group.add(this.points);
  }

  update(time: number, dt: number, args: any): void {
    if (!this.points) return;
    this.spatialPartition.clear();
    for (let i = 0; i < this.particleCount; i++) {
      const vx = this.particleData.particleVelocities[ i * 3 ];
      const vy = this.particleData.particleVelocities[ i * 3 + 1 ];
      const vz = this.particleData.particleVelocities[ i * 3 + 2 ];

      const position = new THREE.Vector3(
        this.particleData.particlePositions[ i * 3 ],
        this.particleData.particlePositions[ i * 3 + 1 ],
        this.particleData.particlePositions[ i * 3 + 2 ]
      );

      if (position.length() > this.orbitRadius) {
        //reverse direction 
        this.particleData.particleVelocities[ i * 3 ] = -vx;
        this.particleData.particleVelocities[ i * 3 + 1 ] = -vy;
        this.particleData.particleVelocities[ i * 3 + 2 ] = -vz;
      }

      this.particleData.particlePositions[ i * 3 ] += this.particleData.particleVelocities[ i * 3 ];
      this.particleData.particlePositions[ i * 3 + 1 ] += this.particleData.particleVelocities[ i * 3 + 1 ];
      this.particleData.particlePositions[ i * 3 + 2 ] += this.particleData.particleVelocities[ i * 3 + 2 ];
      
      let speed = this.particleData.particleSpeeds[ i ];
      if (speed > 0.1) {
        speed *= 0.01; // slow down over time
      } else if (speed < 0.01){
        speed = 0.01; // minimum speed
      }
      this.particleData.particleSpeeds[ i ] = speed;
      this.particleData.particleVelocities[ i * 3 ] = (this.particleData.particleVelocities[ i * 3 ] / speed) * this.particleData.particleSpeeds[ i ];
      this.particleData.particleVelocities[ i * 3 + 1 ] = (this.particleData.particleVelocities[ i * 3 + 1 ] / speed) * this.particleData.particleSpeeds[ i ];
      this.particleData.particleVelocities[ i * 3 + 2 ] = (this.particleData.particleVelocities[ i * 3 + 2 ] / speed) * this.particleData.particleSpeeds[ i ];

      const partitionKey = `${Math.floor(this.particleData.particlePositions[i * 3] / this.partitionSize)}_${Math.floor(this.particleData.particlePositions[i * 3 + 1] / this.partitionSize)}_${Math.floor(this.particleData.particlePositions[i * 3 + 2] / this.partitionSize)}`;
      if (!this.spatialPartition.has(partitionKey)) {
        this.spatialPartition.set(partitionKey, new Set());
      }
      this.spatialPartition.get(partitionKey)!.add(i);
    }

    this.spatialPartition.forEach((indices, key) => {
      if (indices.size > 1) {
        const indexArray = Array.from(indices);
        for (let i = 0; i < indexArray.length; i++) {
          for (let j = i + 1; j < indexArray.length; j++) {
            const idx1 = indexArray[i];
            const idx2 = indexArray[j];
            const dx = this.particleData.particlePositions[idx1 * 3] - this.particleData.particlePositions[idx2 * 3];
            const dy = this.particleData.particlePositions[idx1 * 3 + 1] - this.particleData.particlePositions[idx2 * 3 + 1];
            const dz = this.particleData.particlePositions[idx1 * 3 + 2] - this.particleData.particlePositions[idx2 * 3 + 2];
            const radiusSum = this.particleData.particleRadius[idx1] + this.particleData.particleRadius[idx2];
            const distanceSq = dx * dx + dy * dy + dz * dz;
            if (distanceSq < radiusSum * radiusSum && distanceSq > 2.5) {
              const distance = Math.sqrt(distanceSq);
              const overlap = radiusSum - distance;
              const nx = dx / distance;
              const ny = dy / distance;
              const nz = dz / distance;
              // Simple attraction force
              const force = 0.00004 * overlap;

              this.particleData.particlePositions[idx1 * 3] -= force * nx;
              this.particleData.particlePositions[idx1 * 3 + 1] -= force * ny;
              this.particleData.particlePositions[idx1 * 3 + 2] -= force * nz;
              this.particleData.particlePositions[idx2 * 3] += force * nx;
              this.particleData.particlePositions[idx2 * 3 + 1] += force * ny;
              this.particleData.particlePositions[idx2 * 3 + 2] += force * nz;
            }
          }
        }
      }
    });

    this.particles!.attributes.position.needsUpdate = true;
    this.shaderMaterial!.uniforms.time.value += dt * 0.001;
  }

  dispose(): void {
    super.dispose();
  }
}