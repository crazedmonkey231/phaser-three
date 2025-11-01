import * as THREE from "three";
import { GameScene } from "../GameScene";
import { Level } from "../Level";
import { FpsWidget } from "../widgets/FpsWidget";

/** A template level class to be copied and customized */
export class TemplateLevel extends Level {
  constructor(baseScene: GameScene) {
    super(baseScene);
  }

  /** Create the level */
  create(): void {
    super.create(); 

    // Set up input controllers here
    this.getOrbitControls();
    this.getTransformController({translationSnap: 1, rotationSnap: Math.PI / 8, scaleSnap: 0.1});

    // Set up post-processing effects here, Example:
    this.postprocess.addRender("render");
    this.postprocess.addFXAA("fxaa");
    this.postprocess.addPosterize("toon", 100);
    this.postprocess.addOutput("output");

    // Set up weather effects here
    // weather.toggle();
    this.weather.setTimeOfDay(17);

    // Create and add generic 3D objects here
    const gridHelper = new THREE.GridHelper(10, 10);
    this.add(gridHelper);
    const axisHelper = new THREE.AxesHelper(5);
    this.add(axisHelper);
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    // Load level from JSON or other Things here
    // Level.importJsonFile(this, "levels/level.json");

    // Set up collisions here

    // Set up widgets here
    new FpsWidget(this, {
      name: "fpsText",
      text: "FPS: 60",
      x: 10,
      y: 10,
      style: { font: "24px Arial", color: "#ffffff" },
    });
  }

  update(time: number, dt: number, args: any) {
    super.update(time, dt, args);
    this.widgets.get("fpsText")?.setText(`FPS: ${this.gameScene.game.loop.actualFps} `);
    // Additional update logic here
  }

  dispose(): void {
    super.dispose();
    // Additional cleanup if needed
  }
}