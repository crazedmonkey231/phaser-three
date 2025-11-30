import * as THREE from "three";
import { Octree } from "three/examples/jsm/Addons.js";
import { Level } from "../Level";
import { Thing } from "../Thing";

/** Example subclass of Thing using a cube mesh */
export class BasicBoxThing extends Thing {
  constructor(level: Level, name: string = "boxThing", position: THREE.Vector3) {
    super(level, name, 'BasicBoxThing');
    this.group.position.copy(position)
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
  }

  resolveCollision(octree: Octree): void { }

  update(time: number, dt: number): void { }
}
