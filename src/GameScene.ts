import { Level } from "./Level";
import { updateListener } from "./Audio";
import { IThing } from "./Types";
import { IPlayerData, MultiplayerManager } from "./multiplayer/multiplayerManager";

/** Configuration interface for GameScene */
export interface GameSceneConfig {
  name: string;
  levels: Array<typeof Level>;
}

/** Game scene class, which manages levels. */
export class GameScene extends Phaser.Scene {
  private hud: Phaser.GameObjects.Graphics = null as any;
  private activeLevel: Level = null as any;
  private levels: Level[] = [];
  private multiplayerMgr: MultiplayerManager | null = null; 
  constructor(config: GameSceneConfig) { 
    super(config.name);
    this.levels = config.levels.map(LevelClass => new LevelClass(this));
    this.activeLevel = this.levels[0];
    // on reload, dispose of the scene properly
    window.addEventListener('beforeunload', () => {
      this.dispose();
    });
  }

  preload() {
    this.levels.forEach(level => {
      level.preload && level.preload();
    });
  }

  create() {
    this.hud = this.add.graphics();
    this.activeLevel.create();
  }

  update(time: number, delta: number) {
    updateListener(this.activeLevel.camera);
    const step = Math.min(delta / 1000, 0.1);
    for (let i = 0; i < 10; i++) {
      const subStep = step / 10;
      this.activeLevel.update(time, subStep, { hud: this.hud });
    }
    this.activeLevel.render();
  }

  dispose() {
    if (this.multiplayerMgr) {
      this.multiplayerMgr.disconnect();
      this.multiplayerMgr = null;
    }
    this.levels.forEach(level => level.dispose());
    this.levels = [];
    this.activeLevel = null as any;
    this.hud.destroy();
    this.hud = null as any;
  }

  /** Set the active level by index */
  setActiveLevel(index: number) {
    if (index >= 0 && index < this.levels.length) {
      this.activeLevel = this.levels[index];
    }
  }

  /** Transition to another scene by key */
  transitionTo(sceneKey: string) {
    console.log(`Transitioning to ${sceneKey}`);
    this.scene.stop();
    this.scene.start(sceneKey);
  }

  getThreeScene() {
    return this.activeLevel;
  }

  getThreeCamera() {
    return this.activeLevel.camera;
  }

  /** Helper to add thing(s) to the active level */
  addThing(things: IThing | IThing[], autoCreate: boolean = true) {
    if (!Array.isArray(things)) {
      things = [things];
    }

    things.forEach(thing => {
      this.activeLevel.addThing(thing);
      if (autoCreate) {
        thing.create();
      }
    });
  }

  /** Helper to remove thing(s) from the active level */
  removeThing(things: IThing | IThing[]) {
    if (!Array.isArray(things)) {
      things = [things];
    }
    things.forEach(thing => {
      this.activeLevel.removeThing(thing);
    });
  }

  /** Helper to add a keyboard key listener */
  addKey(key: string | number): Phaser.Input.Keyboard.Key | undefined {
    if (!this.input || !this.input.keyboard) {
      return undefined;
    }
    return this.input.keyboard.addKey(key);
  }

  /** Initialize multiplayer manager */
  initMultiplayer(roomId: string, playerData: IPlayerData) {
    if (this.multiplayerMgr) {
      console.warn("MultiplayerManager already initialized");
      return this.multiplayerMgr;
    }
    this.multiplayerMgr = new MultiplayerManager(roomId, playerData);
    return this.multiplayerMgr;
  }

  /** Get the multiplayer manager */
  getMultiplayerManager() {
    return this.multiplayerMgr;
  }
}