import * as THREE from "three";
import { Octree } from "three/examples/jsm/Addons.js";
import { Level } from "../Level";
import { Spline } from "../Spline";


export class BallSpline extends Spline {
  private ballMesh: THREE.Mesh | null = null;
  constructor(level: Level, name: string = "ballSpline") {
    super(level, name, 'BallSpline', {
      splineType: "catmullrom",
      tubularSegments: 100,
      radius: 0.05,
      radialSegments: 8,
      closed: true,
      tension: 0.5,
      controlPoints: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ],
      color: 0x00ff00,
    });
    this.speed = 0.1;
  }

  create(): void {
    super.create();
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xff0000, 
        metalness: 0.2, 
        roughness: 0.7,
        emissive: 0x550000,
        emissiveIntensity: 5,
      })
    );
    ball.castShadow = true;
    ball.receiveShadow = true;
    this.group.add(ball);
    this.ballMesh = ball;
  }

  resolveCollision(octree: Octree): void { }

  update(time: number, dt: number): void { 
    super.update(time, dt);
    if (!this.ballMesh || !this.curve || !this.speed) return;
    const t = (time * 0.001 * this.speed) % 1;
    const position = this.curve.getPoint(t);
    if (position) {
      this.ballMesh.position.set(position.x, position.y, position.z);
    }
  }
}
