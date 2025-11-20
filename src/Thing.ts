import * as THREE from "three";
import { Level } from "./Level";
import { Octree } from "three/examples/jsm/Addons.js";
import { ColliderShape, GameplayTag, IDamage, IThing } from "./Types";

/** 
 * Base class for all things in the game.
 * 
 * A Thing is any object that exists in the 3D world and has a position, can be updated, and can interact with other things.
 * 
 * It provides basic functionality such as tagging, health management, and serialization to/from JSON.
 * 
 * To create a new Thing, extend this class and implement the create() method to set up its 3D representation.
 * 
 * The Thing group userData is set to reference the Thing instance for easy access during collision detection and interaction.
 * 
 * Be sure to expose your Thing subclass globally for deserialization (saving/loading) by adding it to the Defs config.
 */
export abstract class Thing implements IThing {
  level: Level = null as any;
  name: string;
  type: string;
  group: THREE.Group;
  alive: boolean = true;
  gameplayTags: Set<GameplayTag> = new Set();
  tags: Set<string> = new Set();
  timeAlive: number = -1;
  collider: ColliderShape | undefined = undefined;
  velocity: THREE.Vector3 | undefined = undefined;
  speed: number | undefined = undefined;
  health: number | undefined = undefined;
  data: any = {};
  constructor(level: Level, name: string, type: string) {
    this.level = level;
    this.name = name;
    this.type = type;
    this.group = new THREE.Group();
    this.group.userData.thing = this;
    setTimeout(() => {
      this.create();
      level.addThing(this);
    }, 0);
  }

  onUpdate?(time: number, dt: number, args: any): void;
  syncCollider?(): void;
  resolveCollision?(octree: Octree): void;
  damage?(damage: IDamage): void;
  interact?(thing: IThing): void;

  create(): void { }
  
  update(time: number, dt: number, args: any): void {
    this.onUpdate?.(time, dt, args);
    if (this.collider) {
      this.syncCollider?.();
      this.resolveCollision?.(args.octree);
    }
    if (this.health !== undefined && this.health <= 0) {
      this.kill(true);
    }
    if (this.alive) {
      if (this.timeAlive >= 0) {
        this.timeAlive -= dt;
        if (this.timeAlive < 0) {
          this.kill(true);
        }
      }
    }
  }

  addTag(tag: string): void {
    this.tags.add(tag);
  }

  addGameplayTag(tag: GameplayTag): void {
    this.gameplayTags.add(tag);
  }

  removeTag(tag: string): void {
    this.tags.delete(tag);
  }

  removeGameplayTag(tag: GameplayTag): void {
    this.gameplayTags.delete(tag);
  }

  respawn(position: THREE.Vector3): void {
    this.alive = true;
    this.group.position.copy(position);
    this.group.visible = true;
  }

  /** Marks the thing as dead, sets to not visible, can be respawned or optionally fully disposes of it */
  kill(dispose: boolean): void {
    this.alive = false;
    this.group.visible = false;
    if (dispose) {
      this.dispose();
    }
  }

  /** Fully disposes of the thing and its resources */
  dispose(): void {
    this.alive = false;
    this.collider = undefined;
    this.tags.clear();
    if (this.level && this.group) {
      const threeScene = this.level.getGameScene()?.getThreeScene();
      threeScene?.removeThing(this);
      this.group.traverse((child) => {
        const geom = (child as THREE.Mesh).geometry;
        const mat = (child as THREE.Mesh).material;
        if (geom) {
          geom.dispose();
        }
        if (mat) {
          if (Array.isArray(mat)) {
            mat.forEach((mat) => mat.dispose());
          } else {
            mat.dispose();
          }
        }
      });
      this.group.clear();
      this.group = null as any;
      this.level = null as any;
    }
  }

  /** Exports the thing to a JSON object. */
  toJsonObject(): any {
    return {
      name: this.name,
      type: this.type,
      alive: this.alive,
      timeAlive: this.timeAlive,
      tags: Array.from(this.tags),
      velocity: this.velocity,
      speed: this.speed,
      health: this.health,
      transform: {
        position: this.group.position,
        rotation: this.group.rotation,
        scale: this.group.scale,
      },
      data: this.data,
    };
  }

  /** Creates an instance of a Thing from a JSON object. 
   * 
   * @param level The level instance to load into.
   * @param json The JSON object representing the thing.
  */
  static fromJsonObject(level: Level, json: any): IThing {
    const classType = level.defs[json.type];
    const thing: IThing = new classType(level, json.name, json.type);
    thing.alive = json.alive;
    thing.timeAlive = json.timeAlive;
    thing.tags = new Set(json.tags);
    thing.velocity = json.velocity;
    thing.speed = json.speed;
    thing.health = json.health;
    thing.data = json.data;
    const transform = json.transform;
    const { x, y, z } = transform.position;
    const { _x: rx, _y: ry, _z: rz, _order: rorder } = transform.rotation;
    const { x: sx, y: sy, z: sz } = transform.scale;
    thing.group.position.set(x, y, z);
    thing.group.rotation.set(rx, ry, rz, rorder);
    thing.group.scale.set(sx, sy, sz);
    return thing;
  }

  /** Exports the thing to a JSON string. */
  static exportJson(thing: IThing): string {
    return JSON.stringify(thing.toJsonObject()); 
  }

  /** Creates a copy of the given thing. */
  static copy(thing: IThing): IThing {
    const jsonString = Thing.exportJson(thing);
    return Thing.fromJsonObject(thing.level, JSON.parse(jsonString));
  }
}