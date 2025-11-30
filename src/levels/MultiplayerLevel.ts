import * as THREE from "three";
import { GameScene } from "../GameScene";
import { Level } from "../Level";
import { Thing } from "../Thing";
import { IThing } from "../Types";
import { BasicBoxThing } from "../things/BasicBoxThing";

/** A template level class to be copied and customized */
export class MultiplayerLevel extends Level {
  roomId: string = "lobby";
  playerName: string = "Player";
  socketId: any;
  syncTimer: number = 0;
  moveSpeed: number = 0.2; // units per second
  playerPosition: THREE.Vector3 = new THREE.Vector3();
  playerRotation: THREE.Euler = new THREE.Euler();
  playerScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
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
    const mgr = this.gameScene.getMultiplayerManager();
    if (!mgr) return;
    const rooms = ["room1", "room2", "room3"];
    let yOffset = 100;
    const buttons: Phaser.GameObjects.Text[] = [];
    rooms.forEach((roomId) => {
      const roomText = this.gameScene.add
        .text(
          this.gameScene.cameras.main.centerX,
          yOffset,
          `Join ${roomId}`,
          { 
            fontFamily: "Segoe UI",
            fontStyle: "bold",
            fontSize: "48px", 
            color: "#ffffff" 
          }
        )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true, draggable: false, pixelPerfect: false })
        .setDepth(1000);
      roomText.on("pointerover", () => {
        roomText.setStyle({ color: "#00ccff" });
      });
      roomText.on("pointerout", () => {
        roomText.setStyle({ color: "#ffffff" });
      });
      roomText.on("pointerdown", () => {
        this.roomId = roomId;
        buttons.forEach((btn) => btn.destroy());
        mgr.emit("playerChangeRoom", roomId);
      });
      buttons.push(roomText);
      yOffset += 80;
    });
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
      this.removeAllThings(true);
      this.socketId = data.you;
      const things: Record<string, any> = data.things;
      for (const thingId in things) {
        Thing.fromJsonObject(this, things[thingId]);
      }
    });

    mgr.on("playerJoined", (data: any) => {
      console.log("Player joined:", data);
      const things: Record<string, any> = data.things;
      for (const thingId in things) {
        if (!this.getThingById(thingId)) {
          Thing.fromJsonObject(this, things[thingId]);
        }
      }
    });

    mgr.on("playerLeft", (id: any) => {
      console.log("Player left:", id);
      const thing = this.getThingById(id);
      if (thing) {
        this.removeThing(thing, true, false);
      }
      if (id === this.socketId) {
        // We left the room, clean up
        this.removeAllThings(true);
      }
    });

    mgr.on("thingMoved", (data: any) => {
      const thing = this.getThingById(data.id);
      if (thing) {
        const position = data.position;
        this.tmpVec.set(position.x, position.y, position.z);
        thing.group.position.lerp(this.tmpVec, 0.5);
      }
    });

    // this.gameScene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
    //   // this.gameScene.input.mouse?.requestPointerLock();
    //   const randX = Math.random() * 20 - 10;
    //   const randZ = Math.random() * 20 - 10;
    //   new BasicBoxThing(this, `Box_${Math.random().toString(36).substring(2, 9)}`, new THREE.Vector3(randX, 0.5, randZ));
    // });

    mgr.on("thingSpawned", (data: any) => {
      if (this.getThingById(data.id)) return;
      console.log("Thing spawned:", data);
      Thing.fromJsonObject(this, data);
    });

    const gridHelper = new THREE.GridHelper(10, 10);
    this.add(gridHelper);
    const axisHelper = new THREE.AxesHelper(5);
    this.add(axisHelper);
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

  addThing(thing: IThing | IThing[]): void {
    super.addThing(thing);
    const mgr = this.gameScene.getMultiplayerManager();
    if (mgr) {
      if (Array.isArray(thing)) {
        for (const t of thing) {
          mgr.emit("addThing", t.toJsonObject());
        }
      } else {
        mgr.emit("addThing", thing.toJsonObject());
      }
    }
  }

  removeThing(thing: IThing, dispose?: boolean, replicated: boolean = false): void {
    super.removeThing(thing, dispose);
    if (!replicated) {
      const mgr = this.gameScene.getMultiplayerManager();
      if (mgr) {
        mgr.emit("removeThing", { id: thing.id });
      }
    }
  }

  removeAllThings(dispose?: boolean, replicated?: boolean): void {
    this.things.forEach(thing => {
      this.removeThing(thing, dispose, replicated);
    });
  }

  update(time: number, dt: number, args: any) {
    super.update(time, dt, args);
    const mgr = this.gameScene.getMultiplayerManager();
    if (!mgr) return;
    const mesh = this.getThingById(this.socketId)?.group;
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
