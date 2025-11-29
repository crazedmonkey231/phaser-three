import * as THREE from "three";
import { GameScene } from "../GameScene";
import { Level } from "../Level";

/** A template level class to be copied and customized */
export class MultiplayerLevel extends Level {
  roomId: string = "lobby";
  playerName: string = "Player";
  players: Map<any, THREE.Mesh> = new Map();
  space: Phaser.Input.Keyboard.Key | undefined;
  syncTimer: number = 0;
  moveSpeed: number = 0.1; // units per second
  playerPosition: THREE.Vector3 = new THREE.Vector3();
  playerRotation: THREE.Euler = new THREE.Euler();
  playerScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  constructor(baseScene: GameScene) {
    super(baseScene);
  }

  /** Create the level */
  create(): void {
    super.create();

    this.getOrbitControls();

    this.space = this.gameScene.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Set up post-processing effects here, Example:
    this.postprocess.addRender("render");
    this.postprocess.addFXAA("fxaa");
    this.postprocess.addPosterize("toon", 100);
    this.postprocess.addOutput("output");

    const randX = Math.random() * 20 - 10;
    const randZ = Math.random() * 20 - 10;

    this.playerPosition.set(randX, 0, randZ);

    const mgr = this.gameScene.initMultiplayer(this.roomId, {
      name: this.playerName,
      score: 0,
      speed: this.moveSpeed,
      transform: {
        position: this.playerPosition,
        rotation: this.playerRotation,
        scale: this.playerScale,
      },
    });

    mgr.on("init", (data: any) => {
      console.log("Multiplayer init data:", data);
      const players: Record<string, any> = data.players;
      for (const id in players) {
        this.addPlayer(id, players[id]);
      }
    });

    mgr.on("playerJoined", (data: any) => {
      console.log("Player joined:", data);
      this.addPlayer(data.id, data);
    });

    mgr.on("playerLeft", (id: any) => {
      console.log("Player left:", id);
      const mesh = this.players.get(id);
      if (mesh) {
        this.remove(mesh);
        this.players.delete(id);
      }
    });

    mgr.on("playerMoved", (data: any) => {
      const mesh = this.players.get(data.id);
      if (mesh) {
        const position = data.position;
        mesh.position.set(
          position.x,
          position.y,
          position.z
        );
      }
    });
  }

  addPlayer(id: any, data: any): void {
    console.log("Adding player:", data);
    // Add player representation to the level
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const transform = data.transform;
    mesh.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z
    );
    mesh.rotation.set(
      transform.rotation._x,
      transform.rotation._y,
      transform.rotation._z
    );
    mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
    this.add(mesh);
    this.players.set(id, mesh);
  }

  update(time: number, dt: number, args: any) {
    super.update(time, dt, args);
    const mgr = this.gameScene.getMultiplayerManager();
    if (!mgr) return;
    if (this.space && this.space.isDown) {
      this.syncTimer += dt;
      if (this.syncTimer >= 0.01) {
        this.syncTimer = 0;
        mgr.emit("playerInput", {
          up: true,
          transform: {
            position: this.playerPosition,
            rotation: this.playerRotation,
            scale: this.playerScale,
          },
        });
      }
    } else {
      this.syncTimer = 0;
    }
  }

  dispose(): void {
    super.dispose();
  }
}
