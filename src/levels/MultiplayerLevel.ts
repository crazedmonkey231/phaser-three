import * as THREE from "three";
import { GameScene } from "../GameScene";
import { Level } from "../Level";

/** A template level class to be copied and customized */
export class MultiplayerLevel extends Level {
  roomId: string = "lobby";
  playerName: string = "Player";
  players: Map<any, THREE.Mesh> = new Map();
  socketId: any;
  syncTimer: number = 0;
  moveSpeed: number = 0.2; // units per second
  playerPosition: THREE.Vector3 = new THREE.Vector3();
  playerRotation: THREE.Euler = new THREE.Euler();
  playerScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  levelThings: Map<string, THREE.Mesh> = new Map();
  private tmpVec: THREE.Vector3 = new THREE.Vector3();
  private startButton!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  inputs: { [key: string]: Phaser.Input.Keyboard.Key | undefined } = {};
  constructor(baseScene: GameScene) {
    super(baseScene);
  }

  /** Create the level */
  create(): void {
    super.create();

    // this.getOrbitControls();
    this.inputs = {
      w: this.gameScene.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.gameScene.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.gameScene.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.gameScene.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      space: this.gameScene.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    }

    // Set up post-processing effects here, Example:
    this.postprocess.addRender("render");
    this.postprocess.addFXAA("fxaa");
    this.postprocess.addPosterize("toon", 100);
    this.postprocess.addOutput("output");

    this.descText = this.gameScene.add
      .text(50, this.gameScene.cameras.main.height - 50, "OrbitWorks Multiplayer", { 
        fontFamily: "Segoe UI",
        fontStyle: "bold",
        fontSize: "24px", 
        color: "#00ccff" 
      })
      .setOrigin(0, 0.5)
      .setDepth(1000);

    this.startButton = this.gameScene.add
      .text(
        this.gameScene.cameras.main.width - 250,
        this.gameScene.cameras.main.centerY,
        "Start",
        { 
          fontFamily: "Segoe UI",
          fontStyle: "bold",
          fontSize: "92px", 
          color: "#ffffff"
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true, draggable: false, pixelPerfect: false })
      .setDepth(1000)
      .setScale(0);
    this.gameScene.tweens.add({
      targets: this.startButton,
      scale: 1,
      duration: 1500,
      ease: "Back.Out",
    });
    this.startButton.on("pointerover", () => {
      this.startButton.setStyle({ color: "#00ccff" });
      if (!this.gameScene.tweens.isTweening(this.startButton)) {
        this.gameScene.tweens.add({
          targets: this.startButton,
          scale: 1.1,
          duration: 200,
          ease: "Sine.Out",
        });
      }
    });
    this.startButton.on("pointerout", () => {
      this.startButton.setStyle({ color: "#ffffff" });
      if (!this.gameScene.tweens.isTweening(this.startButton)) {
        this.gameScene.tweens.add({
          targets: this.startButton,
          scale: 1,
          duration: 200,
          ease: "Sine.Out",
        });
      }
    });
    this.startButton.on("pointerdown", () => {
      this.startButton.destroy();
      this.descText.destroy();
      this.playerPosition.set(0, 0, 0);
      this.initializeMultiplayer();
      this.createLobbyUI();
    });
  }

  createLobbyUI(): void {
    // Create any lobby UI elements here
    // For example, a simple text display
  }

  resizeWidgets(): void {
    super.resizeWidgets();
    this.startButton.setPosition(
      this.gameScene.cameras.main.width - 250,
      this.gameScene.cameras.main.centerY
    );
    this.descText.setPosition(
      50,
      this.gameScene.cameras.main.height - 50
    );
  }

  initializeMultiplayer(): void {
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
      this.socketId = data.you;
      const players: Record<string, any> = data.players;
      for (const id in players) {
        this.addPlayer(id, players[id]);
      }
      const things = data.things;
      if (things.length > 0) {
        console.log("Existing things in level:", things);
        for (const thingId in things) {
          this.initThingFromData(thingId, things[thingId]);
        }
      } else {
        console.log("No existing things in level.");
        this.createWorld();
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
        this.tmpVec.set(position.x, position.y, position.z);
        mesh.position.lerp(this.tmpVec, 0.5);
      }
    });

    // this.gameScene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
    //   // this.gameScene.input.mouse?.requestPointerLock();
    //   const randX = Math.random() * 20 - 10;
    //   const randZ = Math.random() * 20 - 10;
    //   mgr.emit("spawnThing", {
    //     id: `${this.socketId}_thing_${Date.now()}`,
    //     type: "cube",
    //     transform: {
    //       position: {
    //         x: this.playerPosition.x + randX,
    //         y: this.playerPosition.y,
    //         z: this.playerPosition.z + randZ,
    //       },
    //       rotation: {
    //         _x: 0,
    //         _y: 0,
    //         _z: 0,
    //         isEuler: true,
    //       },
    //       scale: {
    //         x: 1,
    //         y: 1,
    //         z: 1,
    //       },
    //     },
    //   });
    // });

    mgr.on("thingSpawned", (data: any) => {
      console.log("Thing spawned:", data);
      this.initThingFromData(data.id, data);
    });

    mgr.on("thingDespawned", (thingId: string) => {
      console.log("Thing despawned:", thingId);
      const mesh = this.levelThings.get(thingId);
      if (mesh) {
        this.remove(mesh);
        this.levelThings.delete(thingId);
      }
    });

    const gridHelper = new THREE.GridHelper(10, 10);
    this.add(gridHelper);
    const axisHelper = new THREE.AxesHelper(5);
    this.add(axisHelper);
  }

  addPlayer(id: any, data: any): void {
    console.log("Adding player:", data);
    // Add player representation to the level
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `player_${id}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
    mesh.userData.playerId = id; // Store playerId for reference
  }

  initThingFromData(
    thingId: string,
    data: any
  ): void {
    // Example: create a simple cube thing based on data
    console.log("Initializing thing from data:", thingId, data);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `thing_${thingId}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
    mesh.userData.thingId = thingId; // Store thingId for reference
    this.levelThings.set(thingId, mesh);
  }

  createWorld(): void {
    // Create initial world things if none exist
    // console.log("Creating initial world things.");
    // for (let i = 0; i < 5; i++) {
    //   const randX = Math.random() * 20 - 10;
    //   const randZ = Math.random() * 20 - 10;
    //   const thingId = `initial_thing_${i}`;
    //   const data = {
    //     transform: {
    //       position: { x: randX, y: 0, z: randZ },
    //       rotation: { _x: 0, _y: 0, _z: 0, isEuler: true },
    //       scale: { x: 1, y: 1, z: 1 },
    //     },
    //   };
    //   this.initThingFromData(thingId, data);
    // }
  }

  update(time: number, dt: number, args: any) {
    super.update(time, dt, args);
    const mgr = this.gameScene.getMultiplayerManager();
    if (!mgr) return;
    const mesh = this.players.get(this.socketId);
    if (mesh) {
      this.playerPosition.copy(mesh.position);
      this.playerRotation.copy(mesh.rotation);
      this.playerScale.copy(mesh.scale);

      this.camera.position.set(
        this.playerPosition.x,
        this.playerPosition.y + 10,
        this.playerPosition.z + 10
      );
      this.camera.lookAt(this.playerPosition);
    }
    const w = this.inputs.w;;
    const a = this.inputs.a;
    const s = this.inputs.s;
    const d = this.inputs.d;
    const space = this.inputs.space;

    const anyKey = (w && w.isDown) || (a && a.isDown) || (s && s.isDown) || (d && d.isDown) || (space && space.isDown);
    if (anyKey) {
      this.syncTimer += dt;
      if (this.syncTimer >= 0.05) {
        this.syncTimer = 0;
        mgr.emit("playerInput", {
          forward: w && w.isDown,
          backward: s && s.isDown,
          left: a && a.isDown,
          right: d && d.isDown,
          jump: space && space.isDown,
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
