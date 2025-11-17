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

    // Set up controllers here
    this.getEditor(); // Enable transform tool, remove if not needed

    // Set up post-processing effects here, Example:
    this.postprocess.addRender("render");
    this.postprocess.addFXAA("fxaa");
    this.postprocess.addPosterize("toon", 100);
    this.postprocess.addOutput("output");

    // Set up weather here or use transform tool to adjust in editor

    // Create and add optional generic 3D objects here
    const gridHelper = new THREE.GridHelper(10, 10);
    this.add(gridHelper);
    const axisHelper = new THREE.AxesHelper(5);
    this.add(axisHelper);

    // Load level from JSON or other Things here
    Level.importJsonFile(this, "level");

    // Set up collisions here or when you load Things

    // Set up widgets here
  }

  update(time: number, dt: number, args: any) {
    super.update(time, dt, args);
    // Additional update logic here
  }

  dispose(): void {
    super.dispose();
    // Additional cleanup if needed
  }
}