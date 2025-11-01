// Basic water wrapper class
import * as THREE from "three";
import { Water } from 'three/addons/objects/Water.js';
import { Thing } from "../Thing";
import { Level } from "../Level";

export class WaterPlane extends Thing {
  private water: Water | null = null;
  constructor(level: Level, size: number = 100, textureWidth: number = 512, textureHeight: number = 512) {
    super(level, "waterPlane", "water");
    this.data.size = size;
    this.data.textureWidth = textureWidth;
    this.data.textureHeight = textureHeight;
  }

  create(): void {
    const {size, textureWidth, textureHeight } = this.data;
    this.water = new Water(
      new THREE.PlaneGeometry(size, size),
      {
        textureWidth: textureWidth,
        textureHeight: textureHeight,
        waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function (texture) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        alpha: 1.0,
        sunDirection: new THREE.Vector3(0, 1, 0),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: this.level.fog !== undefined
      }
    );
    this.group.add(this.water);
    this.water.rotation.x = - Math.PI / 2;
  }

  update(time: number, delta: number, args: any): void {
    if (!this.water) return;
    this.water.material.uniforms['time'].value = time / 10000;
  }

  dispose(): void {
    if (this.water) {
      this.group.remove(this.water);
      this.water.geometry.dispose();
      this.water.material.dispose();
    }
    super.dispose();
  }
}