import * as THREE from "three";
import { Level } from "../Level";
import { Thing } from "../Thing";

// A cyclindar spawn effect thing
export class SpawnEffect extends Thing {
  constructor(level: Level, name: string = 'spawnEffect') {
    super(level, name, 'SpawnEffect');
    this.timeAlive = 1000.0;
  }

  create(): void {
    const geometry = new THREE.CylinderGeometry(0.65, 0.65, 2.0, 16, 1, false);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.y += sin(uv.x * 10.0 + time * 5.0) * 0.1;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
          float alpha = 1.0 - length(vUv - 0.5) * 2.0;
          alpha *= 1.0 - (time / 1.0);
          vec3 color = vec3(1.0, 1.0, 0.0);
          gl_FragColor = vec4(color * 2.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.group.add(mesh);
  }

  update(time: number, delta: number, args: any): void {
    super.update(time, delta, args);
    if (!this.alive) return;
    const material = (this.group.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    material.uniforms.time.value += delta * 0.001;
  }
}