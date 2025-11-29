import * as THREE from "three";
import { GameScene } from "../GameScene";
import { Level } from "../Level";

/** A template level class to be copied and customized */
export class MultiplayerLevel extends Level {
  roomId: string = "lobby";
  playerName: string = "Player";
  players: Map<string, THREE.Mesh> = new Map();
  constructor(baseScene: GameScene) {
    super(baseScene);
  }

  /** Create the level */
  create(): void {
    super.create();

    this.getOrbitControls();

    // Set up post-processing effects here, Example:
    this.postprocess.addRender("render");
    this.postprocess.addFXAA("fxaa");
    this.postprocess.addPosterize("toon", 100);
    this.postprocess.addOutput("output");

    const randX = Math.random() * 20 - 10;
    const randZ = Math.random() * 20 - 10;

    const mgr = this.gameScene.initMultiplayer(this.roomId, {
      name: this.playerName,
      score: 0,
      transform: {
        position: new THREE.Vector3(randX, 0, randZ),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
      },
    });

    mgr.on("init", (data: any) => {
      console.log("Multiplayer init data:", data);
      const players: Record<string, any> = data.players;
      for (const id in players) {
        this.addPlayer(players[id]);
      }
    });

    mgr.on("playerJoined", (data: any) => {
      console.log("Player joined:", data);
      this.addPlayer(data);
    });

    mgr.on("playerLeft", (id: any) => {
      console.log("Player left:", id);
      const mesh = this.players.get(id);
      if (mesh) {
        this.remove(mesh);
        this.players.delete(id);
      }
    });

    mgr.on("update", (data: any) => {
      // Handle player updates here
      this.updatePlayer(data);
    });
  }

  addPlayer(data: any): void {
    // Add player representation to the level
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: Math.random() * 0xffffff,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const transform = JSON.parse(data.transform);
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
    this.players.set(data.id, mesh);
  }

  updatePlayer(data: any): void {
    // Update player representation in the level
    const players = data.players;
    for (const id in players) {
      if (id !== data.id) {
        this.updatePlayerTransform(players[id]);
      }
    }
  }

  updatePlayerTransform(data: any): void {
    const mesh = this.players.get(data.id);
    if (mesh) {
      const transform = JSON.parse(data.transform);
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
    }
  }

  update(time: number, dt: number, args: any) {
    super.update(time, dt, args);
  }

  dispose(): void {
    super.dispose();
  }
}
