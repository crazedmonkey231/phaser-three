import { GameScene } from "../GameScene";
import { EditorLevel } from "../levels/EditorLevel";
import { loadImages } from '../Utils';

// A scene class for the level editor
export class LevelEditorScene extends GameScene {
  constructor() { 
    super({ 
      name: "LevelEditorScene", 
      levels: [
        EditorLevel
      ]
    });
  }

  preload(): void {
    super.preload();
    // Load any additional assets needed for the level editor here
    loadImages(this, [
      "add.png",
      "duplicate.png",
      "translate.png",
      "rotate.png",
      "scale.png",
      "delete.png",
      "reload.png",
      "save.png",
      "cube-icon.png",
      "toggle_weather.png"
    ]);
  }
}