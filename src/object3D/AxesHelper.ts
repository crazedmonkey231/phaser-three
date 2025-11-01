import * as THREE from 'three'

export class AxesHelper extends THREE.Object3D {
  constructor(size: number) {
    super();

    const arrowLength = size;
    const arrowWidth = size / 100;

    const geometry = new THREE.CylinderGeometry(arrowWidth, arrowWidth, arrowLength, 8);

    // X Axis (Red)
    const xAxis = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = size / 2;
    this.add(xAxis);

    // Y Axis (Green)
    const yAxis = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    yAxis.position.y = size / 2;
    this.add(yAxis);

    // Z Axis (Blue)
    const zAxis = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = size / 2;
    this.add(zAxis);
  }
}
