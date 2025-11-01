import * as THREE from "three";
import { ICollisionHandler, IService, IThing } from "./Types";

/** Simple collision manager that uses bounding boxes for collision detection, use this with colliders to check for more specific collisions. */
export class CollisionManager implements IService {
  name: string = "CollisionManager";
  private colliders = new Map<string, ICollisionHandler>();
  constructor() { }

  /** Add a collider or an array of colliders */
  add(collider: ICollisionHandler | ICollisionHandler[]): void {
    if (Array.isArray(collider)) {
      collider.forEach((col) => this.colliders.set(col.name, col));
    } else {
      this.colliders.set(collider.name, collider);
    }
  }

  /** Remove a collider by name or an array of names */
  remove(collider: string | string[]): void {
    if (Array.isArray(collider)) {
      collider.forEach((col: string) => this.colliders.delete(col));
    } else {
      this.colliders.delete(collider);
    }
  }

  /** Get a collider by name */
  get(name: string): ICollisionHandler | undefined {
    return this.colliders.get(name);
  }

  /** Create and add a new collider */
  make(name: string, thingsA: Set<IThing>, thingsB: Set<IThing>, onCollision: (thingA: IThing, thingB: IThing) => void): ICollisionHandler {
    const collider: ICollisionHandler = {
      name,
      thingsA,
      thingsB,
      onCollision
    };
    this.add(collider);
    return collider;
  }

  /** Update collision detection and handling */
  update(time: number, delta: number, args: any): void {
    this.colliders.forEach((collider) => {
      collider.thingsA.forEach((thingA) => {
        collider.thingsB.forEach((thingB) => {
          // check collision between thingA and thingB
          if (thingA !== thingB && thingA.alive && thingB.alive) {
            if (CollisionManager.checkCollision(thingA, thingB)) {
              collider.onCollision(thingA, thingB);
            }
          }
          // remove dead things from collider sets
          if (!thingA.alive) collider.thingsA.delete(thingA);
          if (!thingB.alive) collider.thingsB.delete(thingB);
        });
      });
    });
  }

  /** Dispose of all colliders */
  dispose(): void {
    this.colliders.clear();
  }

  /** Simple AABB collision detection */
  static checkCollision(thingA: IThing, thingB: IThing): boolean {
    const boxA = new THREE.Box3().setFromObject(thingA.group);
    const boxB = new THREE.Box3().setFromObject(thingB.group);
    return boxA.intersectsBox(boxB);
  }
}