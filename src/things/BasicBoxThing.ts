import * as THREE from "three";
import { Octree } from "three/examples/jsm/Addons.js";
import { Level } from "../Level";
import { Thing } from "../Thing";
import { IThing } from "../Types";

/** Example subclass of Thing using a cube mesh */
export class BasicBoxThing extends Thing {
  onGround: boolean = false;
  constructor(level: Level, name: string = "boxThing") {
    super(level, name, 'BasicBox');
  }

  create(): void {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ 
        color: 0x00aa00,
       })
    );
    box.castShadow = true;
    box.receiveShadow = true;
    this.group.add(box);
    this.group.position.set(0, 1, 0);
  }

  resolveCollision(octree: Octree): void { }

  update(time: number, dt: number): void { }
}