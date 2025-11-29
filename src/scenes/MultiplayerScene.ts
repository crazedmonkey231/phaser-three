import { GameScene } from "../GameScene";
import { MultiplayerLevel } from "../levels/MultiplayerLevel";

// A scene class for the level editor
export class MultiplayerScene extends GameScene {
  constructor() { 
    super({ 
      name: "MultiplayerScene", 
      levels: [
        MultiplayerLevel,
      ]
    });
  }

  preload(): void {
    super.preload();
  }
}