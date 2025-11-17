import * as THREE from "three";
import { Capsule, GLTFLoader } from "three/examples/jsm/Addons.js";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";
import { IThing } from "./Types";


const base = import.meta.env.BASE_URL || "./";

/** tween easings */
export const tweensEasing = {
  sineEaseInOut: "Sine.easeInOut",
  expoEaseInOut: "Expo.easeInOut",
  circEaseInOut: "Circ.easeInOut",
  quadEaseInOut: "Quad.easeInOut",
  cubicEaseInOut: "Cubic.easeInOut",
  quartEaseInOut: "Quart.easeInOut",
  quintEaseInOut: "Quint.easeInOut",
  backEaseInOut: "Back.easeInOut",
  elasticEaseInOut: "Elastic.easeInOut",
  bounceEaseInOut: "Bounce.easeInOut",
};

/** Neighbor directions */
export const neighbors = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];

/** Positive X face geometry */
export const pxGeometry = (size: number) => {
  const pxGeometry = new THREE.PlaneGeometry(size, size);
  pxGeometry.attributes.uv.array[1] = 0.5;
  pxGeometry.attributes.uv.array[3] = 0.5;
  pxGeometry.rotateY(Math.PI / 2);
  pxGeometry.translate(size / 2, 0, 0);
  return pxGeometry;
};

/** Negative X face geometry */
export const nxGeometry = (size: number) => {
  const nxGeometry = new THREE.PlaneGeometry(size, size);
  nxGeometry.attributes.uv.array[1] = 0.5;
  nxGeometry.attributes.uv.array[3] = 0.5;
  nxGeometry.rotateY(-Math.PI / 2);
  nxGeometry.translate(-size / 2, 0, 0);
  return nxGeometry;
};

/** Positive Y face geometry */
export const pyGeometry = (size: number) => {
  const pyGeometry = new THREE.PlaneGeometry(size, size);
  pyGeometry.attributes.uv.array[5] = 0.5;
  pyGeometry.attributes.uv.array[7] = 0.5;
  pyGeometry.rotateX(-Math.PI / 2);
  pyGeometry.translate(0, size / 2, 0);
  return pyGeometry;
};

/** Negative Y face geometry */
export const nyGeometry = (size: number) => {
  const nyGeometry = new THREE.PlaneGeometry(size, size);
  nyGeometry.attributes.uv.array[5] = 0.5;
  nyGeometry.attributes.uv.array[7] = 0.5;
  nyGeometry.rotateX(Math.PI / 2);
  nyGeometry.translate(0, -size / 2, 0);
  return nyGeometry;
};

/** Positive Z face geometry */
export const pzGeometry = (size: number) => {
  const pzGeometry = new THREE.PlaneGeometry(size, size);
  pzGeometry.attributes.uv.array[1] = 0.5;
  pzGeometry.attributes.uv.array[3] = 0.5;
  pzGeometry.translate(0, 0, size / 2);
  return pzGeometry;
};

/** Negative Z face geometry */
export const nzGeometry = (size: number) => {
  const nzGeometry = new THREE.PlaneGeometry(size, size);
  nzGeometry.attributes.uv.array[1] = 0.5;
  nzGeometry.attributes.uv.array[3] = 0.5;
  nzGeometry.rotateY(Math.PI);
  nzGeometry.translate(0, 0, -size / 2);
  return nzGeometry;
};

/** Cube geometry for voxels */
export const cubeGeometry = (size: number) => {
  return {
    px: pxGeometry(size),
    nx: nxGeometry(size),
    py: pyGeometry(size),
    ny: nyGeometry(size),
    pz: pzGeometry(size),
    nz: nzGeometry(size),
  }
}

// Utils

/** Get a unique key for a vector3 */
export function getKey(vector: THREE.Vector3): string {
  return `${vector.x},${vector.y},${vector.z}`;
}

/** Get chunk position from world position */
export function getChunkPosition(
  position: THREE.Vector3,
  chunkSize: number
): THREE.Vector3 {
  const cx = Math.floor(position.x / chunkSize);
  const cy = Math.floor(position.y / chunkSize);
  const cz = Math.floor(position.z / chunkSize);
  return new THREE.Vector3(cx * chunkSize, cy * chunkSize, cz * chunkSize);
}

/** Get chunk key from chunk position */
export function getChunkKey(chunkPos: THREE.Vector3, chunkSize: number): string {
  return getKey(getChunkPosition(chunkPos, chunkSize));
}

/** Perlin noise height generation */
export function generateNoise(
  x: number,
  z: number,
  seed: number,
  heightOffset: number = 0,
  frequency: number = 100,
  amplitude: number = 50,
  scaleX: number = 10,
  scaleZ: number = 10,
  strength: number = 0.3,
  noiseClass: any = null
): number {
  const ImprovedNoiseClass = noiseClass || ImprovedNoise;
  const noise = new ImprovedNoiseClass();
  const generateHeightVariation = (): number => {
    return (
      (noise.noise(x / frequency, z / frequency, seed) + 1) * strength * scaleZ
    );
  };
  const height =
    heightOffset +
    (noise.noise(x / amplitude, z / amplitude, seed) + 1) *
    generateHeightVariation() *
    scaleX;
  return Math.floor(height);
}

/** Simple box mesh */
export function getBox(size: number, color: any) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshStandardMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

// Phaser images
const ImagePath = (file: string) => `${base}textures/sprites/${file}`;
/** Load multiple images into a Phaser scene */
export function loadImages(scene: Phaser.Scene, images: string[]) {
  for (const path of images) {
    const key = path.split("/").pop()?.split(".")[0] || path;
    scene.load.image(key, ImagePath(path));
  }
}

// three.js models
const ModelPath = (file: string) => `${base}models/${file}`;
const gltfLoader = new GLTFLoader();
/** Load a GLTF model from models folder */
export function loadGLTF(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      ModelPath(path),
      (gltf) => {
        const child = gltf.scene.children[0];
        child.traverse((node: any) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        resolve(child);
      },
      undefined,
      reject
    );
  });
}

// load a texture
const textureLoader = new THREE.TextureLoader();
const TexturePath = (file: string) => `${base}textures/${file}`;
/** Load a texture from textures folder */
export function loadTexture(path: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      TexturePath(path),
      (texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        resolve(texture);
      },
      undefined,
      reject
    );
  });
}

/** Capsule-sphere intersection test */
export function CapsuleIntersectSphere(capsule: Capsule, sphere: THREE.Sphere) {
  if (!capsule || !sphere) return false;
  const start = capsule.start;
  const end = capsule.end;
  const radius = capsule.radius + sphere.radius;
  const segDir = new THREE.Vector3().subVectors(end, start).normalize();
  const ptDir = new THREE.Vector3().subVectors(sphere.center, start);
  const segLen = start.distanceTo(end);
  const ptSegDist = ptDir.dot(segDir);
  let closest: THREE.Vector3;
  if (ptSegDist < 0) {
    closest = start;
  } else if (ptSegDist > segLen) {
    closest = end;
  } else {
    closest = segDir.multiplyScalar(ptSegDist).add(start);
  }
  const dist = closest.distanceTo(sphere.center);
  return dist < radius;
}

/** Raycast for the first intersected thing */
export function simpleRaycastFirst(
  root: THREE.Object3D,
  camera: any,
  maxDistance: number = 100
): IThing | null {
  const raycaster = new THREE.Raycaster(undefined, undefined, 0, maxDistance);
  const mouse = new THREE.Vector2(0, 0);
  camera.updateMatrixWorld();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(root, true);
  if (intersects.length === 0) return null;
  const intersection = intersects[0];
  return intersection.object.parent?.userData.thing;
}

/** Raycast for all intersected objects */
export function simpleRaycastAll(
  root: THREE.Object3D,
  camera: THREE.Camera,
  maxDistance: number = 100
): THREE.Intersection[] | null {
  const raycaster = new THREE.Raycaster(undefined, undefined, 0, maxDistance);
  const mouse = new THREE.Vector2(0, 0);
  camera.updateMatrixWorld();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(root, true);
  if (intersects.length === 0) return null;
  return intersects;
}

/** Raycast for all intersected things */
export function simpleRaycastThings(
  root: THREE.Object3D,
  camera: any,
  maxDistance: number = 100
): IThing[] | null {
  const intersects = simpleRaycastAll(root, camera, maxDistance);
  if (!intersects) return null;
  return intersects.filter(intersect => {
    let obj: any = intersect.object;
    return obj.parent.userData.thing;
  }).map(intersect => {
    return intersect.object.parent?.userData.thing;
  });
}

/** Raycast for all intersected things given mouse coordinates */
export function simpleRaycastMouse(
  root: THREE.Object3D,
  camera: any,
  mouse: THREE.Vector2,
  maxDistance: number = 100
): Set<IThing> | null {
  const raycaster = new THREE.Raycaster(undefined, undefined, 0, maxDistance);
  camera.updateMatrixWorld();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(root, true);
  if (intersects.length === 0) return null;
  return new Set(intersects.filter(intersect => {
    let obj: any = intersect.object;
    return obj.parent.userData.thing;
  }).map(intersect => {
    return intersect.object.parent?.userData.thing;
  }));
}
