import * as THREE from "three";
import { GameScene } from "./GameScene";
import { Postprocess } from "./PostProcess";
import { Weather } from "./Weather";
import { CollisionManager } from "./Collision";
import { AudioManager } from "./Audio";
import { Octree } from 'three/examples/jsm/math/Octree.js';
import { TransformController } from "./TransformController";
import { OrbitControls } from "./OrbitControls";
import { WaterPlane } from "./things/WaterPlane";
import { WaterPBR } from "./things/WaterPBR";
import { GrassPlane } from "./things/GrassPlane";
import { Thing } from "./Thing";
import { IService, IThing, WidgetType } from "./Types";

// set up three.js renderer in a canvas behind Phaser's canvas
const app: any = document.getElementById("app");
const threeCanvas = document.createElement("canvas");
threeCanvas.className = "three";
app.prepend(threeCanvas); // behind Phaser

// three.js renderer
export const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setClearColor(0x000000, 0);
renderer.setSize(app.clientWidth, app.clientHeight, false);

export const premGenerator = new THREE.PMREMGenerator(renderer);
premGenerator.compileEquirectangularShader();

// handle resizing
function resizeThree(camera: any) {
  const rect = app.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

/** Base Level class, extended to create specific levels */
export class Level extends THREE.Scene implements IService {
  name: string = "Level";
  gameScene: GameScene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  things: Set<IThing> = new Set();
  postprocess: Postprocess;
  weather: Weather;
  collisionMgr: CollisionManager;
  widgets: Map<string, WidgetType> = new Map();
  audioMgr: AudioManager;
  octree: Octree | null = null;
  private orbitControls: OrbitControls | null = null;
  private transformController: TransformController | null = null;
  private resizeObserver: ResizeObserver;
  constructor(gameScene: GameScene) {
    super();
    this.gameScene = gameScene;
    this.background = new THREE.Color(0x0f141b);

    this.camera = new THREE.PerspectiveCamera(80, 1, 0.1, 2000);
    this.camera.rotation.order = "YXZ";

    this.postprocess = new Postprocess(this, this.camera);
    this.weather = new Weather(this);
    this.collisionMgr = new CollisionManager();
    this.audioMgr = new AudioManager();

    this.resizeObserver = new ResizeObserver(() => {
      resizeThree(this.camera)
    });
    this.resizeObserver.observe(app);
    resizeThree(this.camera);
  }

  preload() { }

  create() {
    // Create scene
  }

  update(time: number, dt: number, args: any) {
    this.postprocess.update(time, dt, args);
    this.orbitControls?.update(time, dt, args);
    this.weather.update(time, dt, args);
    for (const thing of this.things) {
      if (thing.alive) {
        thing.update(time, dt, { level: this, ...args });
      }
    }
    this.collisionMgr.update();
    for (const widget of this.widgets.values()) {
      widget.update(time, dt, args);
    }
  }

  render() {
    this.postprocess.render();
  }

  dispose() {
    this.resizeObserver.disconnect();
    if (this.transformController) {
      this.transformController.dispose();
      this.transformController = null;
    }
    this.things.forEach(thing => thing.dispose());
    this.things.clear();
    this.resizeObserver = null as any;
    this.gameScene = null as any;
    this.camera = null as any;
    this.postprocess.dispose();
    this.postprocess = null as any;
    this.weather = null as any;
    this.collisionMgr = null as any;
    this.widgets.forEach(widget => widget.dispose());
    this.widgets.clear();
    this.clear();
  }

  getGameScene() {
    return this.gameScene;
  }

  addThing(thing: IThing | IThing[]) {
    if (Array.isArray(thing)) {
      thing.forEach(t => this.addThing(t));
    } else if (thing.group) {
      this.add(thing.group);
      this.things.add(thing);
    }
  }

  removeThing(thing: IThing, dispose: boolean = false) {
    if (thing.group) {
      this.remove(thing.group);
      this.things.delete(thing);
    }
    if (dispose) {
      thing.dispose();
    }
  }

  removeAllThings(dispose: boolean = true) {
    this.things.forEach(thing => {
      this.removeThing(thing, dispose);
    });
  }
  
  // Create and return a TransformController
  getTransformController(params: any = {}) {
    if (!this.transformController) {
      this.transformController = new TransformController(this, params);
    }
    return this.transformController;
  }

  // Create and return OrbitControls
  getOrbitControls() {
    if (this.orbitControls === null) {
      this.orbitControls = new OrbitControls(this.camera, this.gameScene.game.canvas);
    }
    return this.orbitControls;
  }

  getThingsJsonObject(): any[] {
    return Array.from(this.things).map(thing => thing.toJsonObject());
  }

  getThingsJsonString(): string {
    return JSON.stringify(this.getThingsJsonObject());
  }

  getJsonString(): string {
    return JSON.stringify({
      camera: {
        transform: {
          position: this.camera.position,
          rotation: this.camera.rotation,
          scale: this.camera.scale,
        }
      },
      things: this.getThingsJsonObject()
    });
  }

  exportJson(): any {
    // save to file
    const jsonString = this.getJsonString();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'level.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  static importJson(level: Level, json: any): void {
    if (json.camera) {
      const transform = json.camera.transform;
      const { x, y, z } = transform.position;
      const { _x: rx, _y: ry, _z: rz, _order: rorder } = transform.rotation;
      const { x: sx, y: sy, z: sz } = transform.scale;
      level.camera.position.set(x, y, z);
      level.camera.rotation.set(rx, ry, rz, rorder);
      level.camera.scale.set(sx, sy, sz);
    }
    if (json.things) {
      for (const thingJson of json.things) {
        const thing = Thing.fromJsonObject(level, thingJson);
        level.addThing(thing);
      }
    }
  }

  static async importJsonFile(level: Level, path: string): Promise<void> {
    const response = await fetch(path);
    const json = await response.json();
    const jsonObj = typeof json === 'string' ? JSON.parse(json) : json;
    return this.importJson(level, jsonObj);
  }
}

// Expose things globally
(globalThis as any)[WaterPlane.name] = WaterPlane;
(globalThis as any)[WaterPBR.name] = WaterPBR;
(globalThis as any)[GrassPlane.name] = GrassPlane;