import * as THREE from "three";
import { GameScene } from "../GameScene";
import { Level } from "../Level";
import { GlitchyEmbossShader } from "../shaders/GlitchyEmboss";

/** A level class for the level editor */
export class EditorLevel extends Level {
  constructor(baseScene: GameScene) {
    super(baseScene);
  }

  create(): void {
    super.create();

    // Set up level editor tools
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
    // this.postprocess.addShaderPass("test", GlitchyEmbossShader);

    // Create and add generic 3D objects
    const gridHelper = new THREE.GridHelper(10, 10);
    this.add(gridHelper);
    const axisHelper = new THREE.AxesHelper(5);
    this.add(axisHelper);

    // Load level from JSON
    Level.importJsonFile(this, "level.json");
  }

  update(time: number, delta: number, args: any) {
    super.update(time, delta, args);

    // Update test shader uniforms
    // const pass: any = this.postprocess.getPass("test");
    // pass.uniforms.time.value += delta;
    // pass.uniforms.resolution.value.set(this.gameScene.game.canvas.width, this.gameScene.game.canvas.height);
  }

  dispose(): void {
    super.dispose();
  }
}
