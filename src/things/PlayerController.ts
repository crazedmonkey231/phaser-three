import * as THREE from 'three';
import { Capsule, Octree } from 'three/examples/jsm/Addons.js';
import { Level } from '../Level';
import { Thing } from '../Thing';
import { IThing } from '../Types';


export class PlayerController extends Thing {
  speed: number = 100;
  velocity: THREE.Vector3 = new THREE.Vector3();
  onGround: boolean = false;
  camOffset: THREE.Vector3 = new THREE.Vector3(0, 0.7, 0);
  crouched: boolean = false;
  health: number = 100;
  healthMax: number = 100;
  groundAcceleration: number = 60;
  airAcceleration: number = 18;
  groundDrag: number = 10;
  airDrag: number = 3;
  gravityStrength: number = 20;
  jumpVelocity: number = 8;
  private keyW: Phaser.Input.Keyboard.Key | null = null;
  private keyA: Phaser.Input.Keyboard.Key | null = null;
  private keyS: Phaser.Input.Keyboard.Key | null = null;
  private keyD: Phaser.Input.Keyboard.Key | null = null;
  private keyE: Phaser.Input.Keyboard.Key | null = null;
  private keyQ: Phaser.Input.Keyboard.Key | null = null;
  private keyUp: Phaser.Input.Keyboard.Key | null = null;
  private keyDown: Phaser.Input.Keyboard.Key | null = null;
  private keyLeft: Phaser.Input.Keyboard.Key | null = null;
  private keyRight: Phaser.Input.Keyboard.Key | null = null;
  private space: Phaser.Input.Keyboard.Key | null = null;
  private yaw: number = Math.PI;
  private pitch: number = 0;
  private readonly moveInput: THREE.Vector2 = new THREE.Vector2();
  private readonly moveDirection: THREE.Vector3 = new THREE.Vector3();
  private static readonly UP_AXIS = new THREE.Vector3(0, 1, 0);
  private readonly colliderHalfHeight: number = 0.5;
  private readonly colliderStartOffset: THREE.Vector3 = new THREE.Vector3(0, -this.colliderHalfHeight, 0);
  private readonly colliderEndOffset: THREE.Vector3 = new THREE.Vector3(0, this.colliderHalfHeight, 0);
  private mouseSensitivity: number = 0.0025;
  private pitchLimit: number = THREE.MathUtils.degToRad(89);
  private floorNormalThreshold: number = 0.15;
  private head: THREE.Group = new THREE.Group();
  private stepSoundTimer: number = 0;
  constructor(level: Level, name: string = 'player') {
    super(level, name, 'Player');
  }

  create(): void {
    super.create();
    const geometry = new THREE.CapsuleGeometry(0.5, 1.0, 4, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    const camera = this.level.camera!;
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    camera.rotation.order = 'YXZ';

    this.collider = new Capsule(new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, 0.5, 0), 0.5);
    this.head.rotation.order = 'YXZ';
    this.head.position.copy(this.camOffset);
    this.head.add(camera);
    this.group.add(this.head);

    this.syncCollider();
    this.applyLook();

    const baseScene = this.level.getGameScene()!;
    this.keyW = baseScene.addKey('W');
    this.keyA = baseScene.addKey('A');
    this.keyS = baseScene.addKey('S');
    this.keyD = baseScene.addKey('D');
    this.keyE = baseScene.addKey('E');
    this.keyQ = baseScene.addKey('Q');
    this.keyUp = baseScene.addKey('UP');
    this.keyDown = baseScene.addKey('DOWN');
    this.keyLeft = baseScene.addKey('LEFT');
    this.keyRight = baseScene.addKey('RIGHT');
    this.space = baseScene.addKey('SPACE');
    baseScene.input.on('pointermove', this.onMouseMove, this);
    baseScene.input.on('pointerdown', this.onMouseClick, this);
    this.respawn(new THREE.Vector3(2, 100, 2));
  }

  respawn(position: THREE.Vector3): void {
    super.respawn(position);
    this.velocity.set(0, 0, 0);
    this.yaw = Math.PI;
    this.pitch = 0;
    this.onGround = false;
    this.syncCollider();
    this.applyLook();
  }

  private onMouseMove(event: any): void {
    if (!this.level.getGameScene()!.input.mouse?.locked) {
      return;
    }
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    this.yaw -= movementX * this.mouseSensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch - movementY * this.mouseSensitivity, -this.pitchLimit, this.pitchLimit);
    this.applyLook();
  }

  private onMouseClick(e: any): void {
    const baseScene = this.level.getGameScene()!;
    if (!baseScene.input.mouse?.locked) {
      baseScene.input.mouse?.requestPointerLock();
    }

    if (e.button === 2) {
      this.crouched = !this.crouched;
      this.level.postprocess?.setPassEnabled("afterimage", this.crouched);
      if (!this.crouched) {
        // this.colliderStartOffset.set(0, -this.colliderHalfHeight / 5, 0);
        // this.colliderEndOffset.set(0, this.colliderHalfHeight / 5, 0);
      } else {
        this.colliderStartOffset.set(0, -this.colliderHalfHeight, 0);
        this.colliderEndOffset.set(0, this.colliderHalfHeight, 0);
      }
    }
  }

  update(time: number, dt: number, args: any): void {
    const delta = Math.min(dt / 1000, 0.1);
    if (!Number.isFinite(delta) || delta <= 0) {
      return;
    }

    const forward = (this.keyW?.isDown || this.keyUp?.isDown ? 1 : 0) - (this.keyS?.isDown || this.keyDown?.isDown ? 1 : 0);
    const strafe = (this.keyD?.isDown || this.keyRight?.isDown ? 1 : 0) - (this.keyA?.isDown || this.keyLeft?.isDown ? 1 : 0);
    this.moveInput.set(strafe, forward);

    const hasMoveInput = this.moveInput.lengthSq() > 0;
    if (hasMoveInput && this.moveInput.lengthSq() > 1) {
      this.moveInput.normalize();
    }

    if (hasMoveInput) {
      this.moveDirection.set(this.moveInput.x, 0, -this.moveInput.y).normalize();
      this.moveDirection.applyAxisAngle(PlayerController.UP_AXIS, this.yaw);
      const acceleration = this.onGround ? this.groundAcceleration : this.airAcceleration;
      this.velocity.addScaledVector(this.moveDirection, acceleration * delta);
    }

    const damping = this.onGround ? this.groundDrag : this.airDrag;
    this.velocity.x -= this.velocity.x * damping * delta;
    this.velocity.z -= this.velocity.z * damping * delta;

    const maxHorizontalSpeed = this.speed;
    const horizontalSpeedSq = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;
    if (horizontalSpeedSq > maxHorizontalSpeed * maxHorizontalSpeed) {
      const scale = maxHorizontalSpeed / Math.sqrt(horizontalSpeedSq);
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    if (this.space?.isDown && this.onGround) {
      this.velocity.y = this.jumpVelocity;
      this.onGround = false;
    }

    if (!this.onGround) {
      this.velocity.y -= this.gravityStrength * delta;
    } else if (this.velocity.y < 0) {
      this.velocity.y = 0;
    }

    this.group.position.addScaledVector(this.velocity, delta);
    this.applyLook();
    this.syncCollider();
    this.resolveCollision(args.level.octree);

    if (this.onGround && hasMoveInput && (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1)) {
      this.stepSoundTimer += delta;
      const time = 0.15 - Math.min(0.15, this.velocity.length() / this.speed * 0.2);
      if (this.stepSoundTimer > time) {
        this.stepSoundTimer = 0;
        // console.log("step"); // play step sound
      }
    }
  }

  private applyLook(): void {
    this.group.rotation.y = this.yaw;
    this.head.position.copy(this.camOffset);
    this.head.rotation.set(this.pitch, 0, 0);
    this.level.getGameScene()?.getThreeCamera()?.updateMatrixWorld();
  }

  syncCollider(): void {
    if (!this.collider) return;
    if (this.collider instanceof Capsule) {
      this.collider.start.copy(this.group.position).add(this.colliderStartOffset);
      this.collider.end.copy(this.group.position).add(this.colliderEndOffset);
    }
  }

  resolveCollision(octree: Octree): void {
    if (!this.collider || !octree) return;
    const c = this.collider as Capsule;
    if (c.end.y < -100) {
      this.respawn(new THREE.Vector3(0, 100, 0));
      return;
    }
    if (!octree) return;
    const result = octree.capsuleIntersect(c);
    this.onGround = false;

    if (!result) {
      return;
    }

    const translation = result.normal.clone().multiplyScalar(result.depth);
    if (translation.lengthSq() > 0) {
      this.collider.translate(translation);
      this.group.position.add(translation);
    }

    const velocityDot = this.velocity.dot(result.normal);
    if (velocityDot < 0) {
      this.velocity.addScaledVector(result.normal, -velocityDot);
    }

    if (result.normal.y >= this.floorNormalThreshold) {
      this.onGround = true;
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }
      // fall damage
      const impactSpeed = -velocityDot;
      if (impactSpeed > 15) {
        const damage = Math.floor((impactSpeed - 15) * 2.5);
        this.health -= damage;
        if (this.health <= 0) {
          this.health = 0;
        }
      }
    }
  }

  dispose(): void {
    const baseScene = this.level.getGameScene()!;
    baseScene.input.off('pointermove');
    baseScene.input.off('pointerdown');
    super.dispose();
  }
}