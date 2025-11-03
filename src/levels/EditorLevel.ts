import * as THREE from "three";
import { GameScene } from "../GameScene";
import { Level } from "../Level";
import { FpsWidget } from "../widgets/FpsWidget";

/** A level class for the level editor */
export class EditorLevel extends Level {
  constructor(baseScene: GameScene) {
    super(baseScene);
  }

  create(): void {
    super.create();

    // Set up input controllers
    this.getOrbitControls();
    this.getTransformTool();

    // Set up post-processing effects
    this.postprocess.addRender("render");
    this.postprocess.addOutlineLevel("outline", this, {
      edgeStrength: 2,
      edgeThickness: 0.5,
      pulsePeriod: 1,
    });
    this.postprocess.addFXAA("fxaa");
    this.postprocess.addOutput("output");
    // this.postprocess.addShaderPass("test", TestShader);

    // Set up weather effects
    this.weather.setTimeOfDay(17);

    // Create and add generic 3D objects
    const gridHelper = new THREE.GridHelper(10, 10);
    this.add(gridHelper);
    const axisHelper = new THREE.AxesHelper(5);
    this.add(axisHelper);
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    // Load level from JSON
    Level.importJsonFile(this, "levels/level.json");
  }

  update(time: number, dt: number, args: any) {
    super.update(time, dt, args);
    // this.postprocess.getPass("test").uniforms.time.value = time * 0.001;
  }

  dispose(): void {
    super.dispose();
  }
}
