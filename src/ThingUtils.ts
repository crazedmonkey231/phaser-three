import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/Addons.js";

const base = import.meta.env.BASE_URL || "./";

/**
 * Load 3D text parameters.
 */
export interface LoadText3DParams {
  fontFile?: string;
  size?: number;
  color?: number;
  outlineColor?: number;
  opacity?: number;
}

/**
 * Load Flat shaped 3D text as a mesh with optional parameters for font, size, color, and outline.
 * @param text The text to load as a 3D mesh.
 * @param params Optional parameters for font, size, color, and outline.
 * @returns A promise that resolves to a THREE.Mesh containing the 3D text.
 */
export function loadText3D(text: string, params: LoadText3DParams = {}): Promise<THREE.Mesh> {
  const fontFile = params.fontFile || "helvetiker_regular.typeface.json";
  const fontPath = `${base}fonts/${fontFile}`;
  const size = params.size || 0.3;
  const color = params.color || 0xFFFFFF;
  const outlineColor = params.outlineColor || 0x000000;
  const opacity = params.opacity || 0.9;
  return new Promise((resolve, reject) => {
    const loader = new FontLoader();
    loader.load(fontPath, (font) => {
      const matDark = new THREE.LineBasicMaterial({
        color: outlineColor,
        side: THREE.DoubleSide,
        linewidth: 0.1,
      });
      const matLite = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
      });

      const message = text;
      const shapes = font.generateShapes(message, size);
      const geometry = new THREE.ShapeGeometry(shapes);
      geometry.computeBoundingBox();
      const xMid =
        -0.5 * (geometry.boundingBox!.max.x - geometry.boundingBox!.min.x);
      geometry.translate(xMid, 0, 0);

      // make shape ( N.B. edge view not visible )

      const textMesh = new THREE.Mesh(geometry, matLite);

      // make line shape ( N.B. edge view remains visible )

      const holeShapes: any[] = [];
      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        if (shape.holes && shape.holes.length > 0) {
          for (let j = 0; j < shape.holes.length; j++) {
            const hole = shape.holes[j];
            holeShapes.push(hole);
          }
        }
      }

      shapes.push(...holeShapes);
      const lineText = new THREE.Object3D();
      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        const points = shape.getPoints();
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        geometry.translate(xMid, 0, 0);
        const lineMesh = new THREE.Line(geometry, matDark);
        lineText.add(lineMesh);
      }
      textMesh.add(lineText);
      textMesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI);
      resolve(textMesh);
    }, undefined, reject);
  });
}