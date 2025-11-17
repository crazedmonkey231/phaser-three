import * as THREE from "three";
import { Level } from '../Level';
import { NeonGridShader } from "../shaders/NeonGridShader";
import { Thing } from "../Thing";

export interface IGameBoardProps {
  size?: THREE.Vector2;
}

export class GameBoard extends Thing {
  private boardMesh: THREE.Mesh | null = null;
  props: IGameBoardProps;
  constructor(level: Level, props: IGameBoardProps = {}) {
    super(level, "gameBoard", "board");
    this.props = props;
  }

  create(): void {
    const { size = new THREE.Vector2(20, 20) } = this.props;
    const adjSize = size.clone().multiplyScalar(3);
    const geometry = new THREE.PlaneGeometry(adjSize.x, adjSize.y);
    const material = new THREE.ShaderMaterial(NeonGridShader);
    material.uniforms.gridSize.value = Math.max(adjSize.x, adjSize.y);
    if (material.uniforms.waveFrequency) {
      material.uniforms.waveFrequency.value = Math.max(adjSize.x, adjSize.y) / 3.0;
    }
    if (material.uniforms.waveSpeed) {
      material.uniforms.waveSpeed.value = 1.0;
    }

    this.boardMesh = new THREE.Mesh(geometry, material);
    this.boardMesh.rotation.x = -Math.PI / 2;
    this.group.add(this.boardMesh);

    // Create border as a single shape extruded frame
    const frameHeight = 1;
    const frameThickness = 1.0;
    const halfSizeX = size.x / 2;
    const halfSizeZ = size.y / 2;

    const outerShape = new THREE.Shape();
    outerShape.moveTo(-halfSizeX - frameThickness, -halfSizeZ - frameThickness);
    outerShape.lineTo(halfSizeX + frameThickness, -halfSizeZ - frameThickness);
    outerShape.lineTo(halfSizeX + frameThickness, halfSizeZ + frameThickness);
    outerShape.lineTo(-halfSizeX - frameThickness, halfSizeZ + frameThickness);
    outerShape.closePath();

    const innerPath = new THREE.Path();
    innerPath.moveTo(-halfSizeX, -halfSizeZ);
    innerPath.lineTo(halfSizeX, -halfSizeZ);
    innerPath.lineTo(halfSizeX, halfSizeZ);
    innerPath.lineTo(-halfSizeX, halfSizeZ);
    innerPath.closePath();
    outerShape.holes.push(innerPath);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: frameHeight,
      bevelEnabled: true,
      steps: 1,
    };
    const frameGeometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
    frameGeometry.center();
    frameGeometry.translate(0, frameHeight / 2 - 0.5, 0.5);
    frameGeometry.rotateX(-Math.PI / 2);

    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x227777,
      roughness: 0.5,
      metalness: 0.5,
      transparent: true,
      opacity: 0.6,
      emissive: new THREE.Color(0x00aaaa),
      emissiveIntensity: 1.0,
    });

    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    this.group.add(frameMesh);

    // add walls
    const wall1 = new THREE.Mesh(geometry, material);
    wall1.position.set(0, adjSize.y / 2, -adjSize.y / 2);
    wall1.rotation.x = -Math.PI;
    wall1.rotation.y = Math.PI;
    this.group.add(wall1); // back wall

    const wall2 = new THREE.Mesh(geometry, material);
    wall2.position.set(0, adjSize.y / 2, adjSize.y / 2);
    wall2.rotation.x = -Math.PI;
    this.group.add(wall2); 

    const wall3 = new THREE.Mesh(geometry, material);
    wall3.position.set(-adjSize.x / 2, adjSize.y / 2, 0);
    wall3.rotation.x = -Math.PI / 2;
    wall3.rotation.y = Math.PI / 2;
    this.group.add(wall3);

    const wall4 = new THREE.Mesh(geometry, material);
    wall4.position.set(adjSize.x / 2, adjSize.y / 2, 0);
    wall4.rotation.x = -Math.PI / 2;
    wall4.rotation.y = -Math.PI / 2;
    this.group.add(wall4);
  }

  update(time: number, delta: number, args: any): void {
    // Update logic for the game board can be added here
    if (this.boardMesh) {
      const material = this.boardMesh.material as THREE.ShaderMaterial;
      material.uniforms.time.value += delta * 0.001;
    }
  }

  dispose(): void {
    if (this.boardMesh) {
      this.boardMesh.geometry.dispose();
      (this.boardMesh.material as THREE.Material).dispose();
      this.group.remove(this.boardMesh);
      this.boardMesh = null;
    }
    super.dispose();
  }
}
