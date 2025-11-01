import * as THREE from "three";
import { Level } from "../Level";
import { Thing } from "../Thing";
import { IThing } from "../Types";

// Simple SmokeEffect thing
export class SmokeEffect extends Thing {
  private material: THREE.ShaderMaterial | null = null;
  private elapsed = 0;
  private readonly duration = 250; // milliseconds
  constructor(level: Level, name: string = 'smokeEffect') {
    super(level, name, 'SmokeEffect');
    this.timeAlive = this.duration;
  }

  create(): void {
    const geometry = new THREE.SphereGeometry(1.0, 8, 8);
    this.material = new THREE.ShaderMaterial({ 
      uniforms: {
        time: { value: 0.0 },
        fade: { value: 1.0 }
      },
      vertexShader: `
        uniform float time;
        uniform float fade;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.x += sin(uv.y * 10.0 + time * 5.0) * 0.25;
          pos.y += sin(uv.x * 10.0 + time * 5.0) * 0.25;
          pos.z += sin((uv.x + uv.y) * 10.0 + time * 5.0) * 0.25;
          pos *= fade;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        void main() {
          // Simple white smoke effect with fading alpha
          float alpha = 1.0 - length(vUv - 0.5) * 2.0;
          alpha *= 1.0 - (time / 3.0);
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const instanceCount = 8;
    for (let i = 0; i < instanceCount; i++) {
      const mesh = new THREE.Mesh(geometry, this.material);
      const angle = (i / instanceCount) * Math.PI * 2;
      const radius = 0.15 + Math.random() * 0.35;
      mesh.position.set(Math.cos(angle) * radius, Math.random() * 0.5, Math.sin(angle) * radius);
      mesh.scale.setScalar(0.25 + Math.random() * 0.45);
      mesh.rotation.x = Math.random() * Math.PI * 2;
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.z = Math.random() * Math.PI * 2;
      this.group.add(mesh);
      this.level.gameScene.tweens.add({
        targets: mesh.position,
        x: mesh.position.x + 1.0 * (Math.random() - 0.5),
        y: mesh.position.y,
        z: mesh.position.z + 1.0 * (Math.random() - 0.5),
        duration: this.timeAlive,
        ease: "Sine.easeOut",
      });
      this.level.gameScene.tweens.add({
        targets: mesh.scale,
        x: mesh.scale.x * 3.0,
        y: mesh.scale.y * 3.0,
        z: mesh.scale.z * 3.0,
        duration: this.timeAlive,
        ease: "Sine.easeOut",
      });
      this.level.gameScene.tweens.add({
        targets: mesh.rotation,
        x: mesh.rotation.x + Math.random() * Math.PI * 4,
        y: mesh.rotation.y + Math.random() * Math.PI * 4,
        z: mesh.rotation.z + Math.random() * Math.PI * 4,
        duration: this.timeAlive,
        ease: "Sine.easeOut",
        yoyo: true,
      });
      this.level.gameScene.tweens.add({
        targets: this.material.uniforms.fade,
        value: 0.0,
        duration: this.timeAlive,
        ease: "Sine.easeOut",
      });
    }
  }

  update(time: number, delta: number, args: any): void {
    if (this.alive && this.material) {
      this.elapsed += delta; 
      const elapsedSeconds = this.elapsed * 0.001;
      this.material.uniforms.time.value = elapsedSeconds;
      const fade = THREE.MathUtils.clamp(1.0 - this.elapsed / this.duration, 0.0, 1.0);
      this.material.uniforms.fade.value = fade;
      this.group.position.y += delta * 0.005; // slowly rise
    }
    super.update(time, delta, args);
  }

  dispose(): void {
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    super.dispose();
  }
}