import * as THREE from "three";
import { Level } from "./Level";
import { Thing } from "./Thing";
import { XYZ } from './Types';

/** Interface representing the data structure for a Spline */
export interface SplineData {
  splineType: string;
  tubularSegments: number;
  radius: number;
  radialSegments: number;
  closed: boolean;
  tension: number;
  controlPoints: XYZ[];
  color?: number;
}

export function defaultSplineData(): SplineData {
  return {
    splineType: "catmullrom",
    tubularSegments: 128,
    radius: 0.05,
    radialSegments: 8,
    closed: false,
    tension: 0.5,
    controlPoints: [
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
    ],
    color: 0x00ff00,
  };
}

export interface FrenetFrameResult {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
}

/** Spline class representing a series of control points */
export class Spline extends Thing {
  protected controlPoints: THREE.Object3D[] = [];
  protected curve: THREE.CatmullRomCurve3 | null = null;
  protected curveGeometry: THREE.TubeGeometry | null = null;
  protected curveMesh: THREE.Mesh | null = null;
  protected isEditing: boolean = false;
  constructor(level: Level, name: string = "spline", type: string = "Spline", data: Partial<SplineData> = {}) {
    super(level, name, type);
    if (!this.data.splineData) {
      const defaultData = defaultSplineData();
      this.data.splineData = { ...defaultData, ...data };
    }
    this.isEditing = level.isEditing();
  }

  createCurve() {
    const { splineType, tubularSegments, closed, tension, controlPoints, color, radius, radialSegments } = this.data.splineData;
    const points: THREE.Vector3[] = controlPoints.map((cp: XYZ) => new THREE.Vector3(cp.x, cp.y, cp.z));
    this.curve = new THREE.CatmullRomCurve3(points, closed, splineType, tension);

    if (!this.isEditing) return;
    if (this.curveMesh) {
      this.group.remove(this.curveMesh);
    }
    this.curveGeometry = new THREE.TubeGeometry(this.curve, tubularSegments, radius || 0.05, radialSegments || 8, closed);
    const material = new THREE.MeshStandardMaterial({ 
      color: color || 0x00ff00,
      side: THREE.DoubleSide
     });
    this.curveMesh = new THREE.Mesh(this.curveGeometry, material);
    this.group.add(this.curveMesh);
  }

  updateCurve() {
    if (!this.curve) return;
    const points = this.controlPoints.map(cp => cp.position);
    this.curve.points = points;
    if (this.curveGeometry) {
      this.curveGeometry.dispose();
      const { tubularSegments, radius, radialSegments, closed } = this.data.splineData;
      this.curveGeometry = new THREE.TubeGeometry(this.curve, tubularSegments, radius || 0.05, radialSegments || 8, closed);
      if (this.curveMesh) {
        this.curveMesh.geometry.dispose();
        this.curveMesh.geometry = this.curveGeometry;
      }
    }
  }

  getPointAt(t: number, optionalTarget?: THREE.Vector3): THREE.Vector3 | null {
    if (!this.curve) return null;
    return this.curve.getPointAt(t, optionalTarget);
  }

  getPoint(t: number, optionalTarget?: THREE.Vector3): THREE.Vector3 | null {
    if (!this.curve) return null;
    return this.curve.getPoint(t, optionalTarget);
  }

  /**  Returns the Frenet frame (tangent, normal, binormal) at a given parameter t along the curve */
  getFrenetFrameAt(t: number): FrenetFrameResult | null {
    if (!this.curve) return null;
    const { tubularSegments, closed } = this.data.splineData;
    const tangent = this.curve.getTangent(t);
    const position = this.curve.getPoint(t);
    const normal = new THREE.Vector3();
    const binormal = new THREE.Vector3();
    const frames = this.curve.computeFrenetFrames(tubularSegments, closed);
    const segment = Math.floor(t * tubularSegments);
    normal.copy(frames.normals[segment]);
    binormal.copy(frames.binormals[segment]);
    return { position, tangent, normal, binormal };
  }

  createControlPointMesh(position: THREE.Vector3): THREE.Object3D | null {
    if (!this.isEditing) return null;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({
        color: 0x00aa00,
      })
    );
    box.position.copy(position);
    box.userData.controlPoint = true;
    this.group.add(box);
    this.controlPoints.push(box);
    this.updateCurve();
    return box;
  }

  addControlPoint() {
    const controlPoints = this.data.splineData.controlPoints;
    const lastPoint = controlPoints[controlPoints.length - 1];
    const newPosition = lastPoint ? new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z).clone().add(new THREE.Vector3(2, 0, 0)) : new THREE.Vector3(0, 0, 0);
    controlPoints.push({ x: newPosition.x, y: newPosition.y, z: newPosition.z });
    this.createControlPointMesh(newPosition);
  }

  removeControlPoint() {
    if (this.controlPoints.length === 1) return; // Don't remove the last control point
    const lastPoint = this.controlPoints.pop();
    if (lastPoint) {
      this.group.remove(lastPoint);
    }
    this.data.splineData.controlPoints.pop();
    this.updateCurve();
  }

  toggleClosed() {
    this.data.splineData.closed = !this.data.splineData.closed;
    this.createCurve();
  }

  refresh() {
    this.syncControlPoints();
    this.createCurve();
  }

  syncControlPoints(): void {
    this.data.splineData.controlPoints = this.controlPoints.map((cp) => ({
      x: cp.position.x,
      y: cp.position.y,
      z: cp.position.z,
    }));
  }

  create(): void {
    if (this.isEditing) {
      const { controlPoints } = this.data.splineData;
      controlPoints.forEach((pos: XYZ) => {
        const position = new THREE.Vector3(pos.x, pos.y, pos.z);
        this.createControlPointMesh(position);
      });
    }
    this.createCurve();
  }

  update(time: number, dt: number): void {
    if (!this.isEditing) return;
    if (this.controlPoints.length === 0) return;
    this.syncControlPoints();
    this.updateCurve();
  }

  dispose(): void {
    super.dispose();
    this.controlPoints = [];
    this.curve = null;
    this.curveMesh = null;
    this.curveGeometry = null;
  }
}
