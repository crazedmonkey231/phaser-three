import * as THREE from "three";
import { Level } from "./Level";
import { Thing } from "./Thing";
import { XYZ } from './Types';
import { Line2, LineGeometry, LineMaterial } from "three/examples/jsm/Addons.js";

/** Interface representing the data structure for a Spline */
export interface SplineData {
  splineType: string;
  arcSegments: number;
  closed: boolean;
  tension: number;
  controlPoints: XYZ[];
  color?: number;
  lineWidth?: number;
}

export function defaultSplineData(): SplineData {
  return {
    splineType: "catmullrom",
    arcSegments: 64,
    closed: false,
    tension: 0.5,
    controlPoints: [
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
    ]
  };
}

/** Spline class representing a series of control points */
export class Spline extends Thing {
  private controlPoints: THREE.Object3D[] = [];
  private curve: THREE.CatmullRomCurve3 | null = null;
  private curveMesh: Line2 | null = null;
  private curveGeometry: LineGeometry | null = null;
  private isEditing: boolean = false;
  constructor(level: Level, name: string = "spline", type: string = "Spline", data: Partial<SplineData> = {}) {
    super(level, name, type);
    if (!this.data.splineData) {
      const defaultData = defaultSplineData();
      this.data.splineData = { ...defaultData, ...data };
    }
    this.isEditing = level.isEditing();
  }

  private createCurve() {
    const { splineType, arcSegments, closed, tension, controlPoints, color, lineWidth } = this.data.splineData;
    const points: THREE.Vector3[] = controlPoints.map((cp: XYZ) => new THREE.Vector3(cp.x, cp.y, cp.z));
    this.curve = new THREE.CatmullRomCurve3(points, closed, splineType, tension);

    if (!this.isEditing) return;
    if (this.curveMesh) {
      this.group.remove(this.curveMesh);
    }
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions(this.curve.getPoints(arcSegments).flatMap(p => [p.x, p.y, p.z]));
    const matLine = new LineMaterial({
      color: color || 0x00ff00,
      linewidth: lineWidth || 0.05,
      worldUnits: true,
      vertexColors: false,
      alphaToCoverage: true,
    });
    const line = new Line2(lineGeometry, matLine);
    line.computeLineDistances();
    line.scale.set( 1, 1, 1 );
    this.curveMesh = line;
    this.curveGeometry = lineGeometry;
    this.group.add(this.curveMesh);
  }

  private updateCurve() {
    if (!this.curve) return;
    const points = this.controlPoints.map(cp => cp.position);
    this.curve.points = points;
    if (this.curveGeometry) {
      this.curveGeometry.setPositions(this.curve.getPoints(this.data.splineData.arcSegments).flatMap(p => [p.x, p.y, p.z]));
      this.curveGeometry.attributes.position.needsUpdate = true;
    }
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
