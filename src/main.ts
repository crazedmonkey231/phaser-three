import Phaser from "phaser";
import { GameScene } from "./GameScene";
import { TemplateLevel } from "./levels/TemplateLevel";
import { LevelEditorScene } from "./scenes/LevelEditorScene";
import { VoxelLevel } from "./levels/VoxelLevel";


class Scene extends GameScene {
  constructor() { 
    super({ 
      name: "Scene", 
      levels: [
        // TestLevel
        // TemplateLevel
        VoxelLevel
      ]
    });
  }
}

const phaserGame = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "phaser-parent",
  canvas: undefined,  // Phaser creates its own canvas
  transparent: true,
  fps: { 
    min: 60,
    target: 75,
    smoothStep: true
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: "100%",
    height: "100%"
  },
  dom: {
    createContainer: true
  },
  scene: [LevelEditorScene, Scene],
  input: { activePointers: 3 } // multi-touch friendly
});

/** Keep Phaser canvas aligned if container resizes (extra safety) */
phaserGame.scale.on("resize", () => {
  // Three already listens via ResizeObserver; nothing needed here,
  // but this hook is handy if you add UI layout code later.
  console.log("Phaser scale resize event");
});
