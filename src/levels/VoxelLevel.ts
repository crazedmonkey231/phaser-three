import * as THREE from "three";
import { GameScene } from "../GameScene";
import { Level } from "../Level";
import { PlayerController } from "../things/PlayerController";
import { loadTexture } from "../Utils";
import { VoxelMap } from "../voxel/Voxel";
import { defaultPass } from "../voxel/VoxelMapGenerators";
import { WidgetType } from "../Types";
import { FpsWidget } from "../widgets/FpsWidget";


/** 
 * A level class demonstrating voxel map usage.
 * 
 * Work in progress.
 */
export class VoxelLevel extends Level {
  private voxelMap: VoxelMap | undefined;
  private fpsText: WidgetType | undefined;
  private playerController: PlayerController | undefined;
  constructor(gameScene: GameScene) {
    super(gameScene);
    this.camera?.position.set(50, 75, 50);
    this.camera?.lookAt(0, 0, 0);
  }

  create(): void {
    super.create();

    this.postprocess.addRender("render");
    this.postprocess.addFXAA("fxaa");
    this.postprocess.addPosterize("toon", 100);
    this.postprocess.addOutput("output");

    this.gameScene.input.on('pointerdown', () => {
      // Handle pointer down event
      console.log('Pointer down event in TestLevel');
      if (!this.voxelMap) return;
      const result = this.voxelMap.raycastVoxel(this.camera, false, 5);
      console.log('Raycast result:', result);
      if (result && result.voxel) {
        this.voxelMap.removeVoxel(result.voxel.position);
      }
    });

    loadTexture("tilemap.png").then((texture) => {
      this.voxelMap = new VoxelMap(texture, undefined, {
        worldSize: new THREE.Vector3(96, 32, 96),
        chunkSize: 16,
        seed: 0,
        mapGeneratorPasses: [defaultPass],
      });
      this.voxelMap.generateMap().then(({ root, octree }) => {
        this.octree = octree; // set level octree for collisions
        this.add(root);
      });
    });

    this.playerController = new PlayerController(this, "player");
    
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
    this.fpsText?.setText(`FPS: ${this.gameScene.game.loop.actualFps} `);
    if (!this.voxelMap) return;
  }

  dispose(): void {
    super.dispose();
    if (this.playerController) this.playerController.dispose();
    this.playerController = undefined;
    if (this.fpsText) this.fpsText.dispose();
    this.fpsText = undefined;
    if (this.voxelMap) this.voxelMap.dispose();
    this.voxelMap = undefined;
  }
}