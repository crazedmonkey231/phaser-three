import * as THREE from "three";
import { BufferGeometry } from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { cubeGeometry, neighbors, getKey, getChunkKey, getChunkPosition } from "../Utils";
import { ChunkedOctree } from "./ChunkedOctree";
import { setFaceUVs } from "./VoxelBlocks";

// Voxel interface
export interface IVoxel {
  position: THREE.Vector3;
  type: number;
}

// Chunk containing multiple voxels
export interface IChunk {
  position: THREE.Vector3;
  voxels: Set<IVoxel>;
}

// Result of voxel edit operations
export interface IVoxelEditResult {
  voxel?: IVoxel | undefined;
  chunk?: IChunk | undefined;
}

export interface IVoxelRaycastResult {
  position?: THREE.Vector3 | undefined;
  voxel?: IVoxel | undefined;
}

// Interface for map generator passes
export interface IMapGeneratorPass {
  name: string;
  apply(voxelManager: VoxelMap): void;
}

// Voxel Manager options
export interface IVoxelOptions {
  worldSize: THREE.Vector3;
  chunkSize: number;
  mapGeneratorPasses: IMapGeneratorPass[];
  blockSize?: number;
  seed?: number;
  seaLevel?: number;
  noise?: any;
}

// Voxel Manager
export class VoxelMap {
  worldSize: THREE.Vector3 = new THREE.Vector3(100, 100, 100);
  chunkSize: number = 16;
  blockSize: number = 1;
  root: THREE.Group = new THREE.Group();
  octree: ChunkedOctree = new ChunkedOctree();
  voxels: Map<string, IVoxel> = new Map<string, IVoxel>();
  chunks: Map<string, IChunk> = new Map<string, IChunk>();
  chunkMeshes: Map<string, THREE.Mesh> = new Map<string, THREE.Mesh>();
  seaLevel: number = 0;
  noise: any = null;
  seed = 0;
  private readonly texture: THREE.Texture;
  private mapGeneratorPasses: Map<string, IMapGeneratorPass> = new Map<
    string,
    IMapGeneratorPass
  >();
  private _matrix = new THREE.Matrix4();
  private _voxelGeometry = cubeGeometry(this.blockSize);
  constructor(texture: THREE.Texture, file?: string, options?: IVoxelOptions) {
    this.texture = texture;
    if (file) {
      this.loadFromFile(file);
    } else {
      if (!options) throw new Error("VoxelMap options are required if no file is provided");
      this.worldSize = options.worldSize;
      this.chunkSize = options.chunkSize || 16;
      this.blockSize = options.blockSize || 1;
      this.seaLevel = options.seaLevel || 0;
      this.noise = options.noise || null;
      this.seed = options.seed || Math.random() * 10000;
      if (options.mapGeneratorPasses) {
        options.mapGeneratorPasses.forEach((pass) => {
          this.mapGeneratorPasses.set(pass.name, pass);
        });
      }
    }
  }

  exportMapJson() {
    const voxelArray: { position: number[]; type: number }[] = [];
    this.voxels.forEach((voxel) => {
      voxelArray.push({ position: [voxel.position.x, voxel.position.y, voxel.position.z], type: voxel.type });
    });
    return JSON.stringify({
      worldSize: [this.worldSize.x, this.worldSize.y, this.worldSize.z],
      chunkSize: this.chunkSize,
      blockSize: this.blockSize,
      seaLevel: this.seaLevel,
      seed: this.seed,
      voxels: voxelArray,
    });
  }

  saveMapToFile(filename: string = 'voxelmap.json') {
    const mapJson = this.exportMapJson();
    const blob = new Blob([mapJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  loadFromFile(filename: string) {
    fetch(filename)
      .then((response) => response.json())
      .then((data) => {
        this.worldSize = new THREE.Vector3(...data.worldSize);
        this.chunkSize = data.chunkSize;
        this.blockSize = data.blockSize;
        this.seaLevel = data.seaLevel;
        this.seed = data.seed;
        data.voxels.forEach((voxelData: { position: number[]; type: number }) => {
          this.addVoxel(new THREE.Vector3(...voxelData.position), voxelData.type);
        });
      });
  }

  private generateVoxelGeometry(voxel: IVoxel) {
    const { position } = voxel;
    const geometries: BufferGeometry[] = [];
    neighbors.forEach((offset, index) => {
      const neighborPos = new THREE.Vector3()
        .copy(position)
        .add(offset);
      const neighbor = this.voxels.get(getKey(neighborPos));
      const isAir = neighbor && neighbor.type === 0 && voxel.type !== 0;
      if (!neighbor || isAir) {
        switch (index) {
          case 0:
            const pxGeom = this._voxelGeometry.px.clone();
            setFaceUVs(pxGeom, voxel.type, index);
            geometries.push(pxGeom);
            break;
          case 1:
            const nxGeom = this._voxelGeometry.nx.clone();
            setFaceUVs(nxGeom, voxel.type, index);
            geometries.push(nxGeom);
            break;
          case 2:
            const pyGeom = this._voxelGeometry.py.clone();
            setFaceUVs(pyGeom, voxel.type, index);
            geometries.push(pyGeom);
            break;
          case 3:
            const nyGeom = this._voxelGeometry.ny.clone();
            setFaceUVs(nyGeom, voxel.type, index);
            geometries.push(nyGeom);
            break;
          case 4:
            const pzGeom = this._voxelGeometry.pz.clone();
            setFaceUVs(pzGeom, voxel.type, index);
            geometries.push(pzGeom);
            break;
          case 5:
            const nzGeom = this._voxelGeometry.nz.clone();
            setFaceUVs(nzGeom, voxel.type, index);
            geometries.push(nzGeom);
            break;
        }
      }
    });
    if (geometries.length === 0) return null;
    const voxelGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    this._matrix.makeTranslation(position.x, position.y, position.z);
    voxelGeometry.applyMatrix4(this._matrix);
    return voxelGeometry;
  }

  private generateVoxelGeometryAsync(voxel: IVoxel): Promise<BufferGeometry | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const geometry = this.generateVoxelGeometry(voxel);
        resolve(geometry);
      }, 0);
    });
  }

  private generateMesh(geometry: BufferGeometry) {
    const material = new THREE.MeshLambertMaterial({
      map: this.texture,
      side: THREE.DoubleSide,
      fog: true,
    });
    material.transparent = true;
    material.alphaTest = 0.5;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private removeMesh(chunk: IChunk) {
    const key = getChunkKey(chunk.position, this.chunkSize);
    // Remove old mesh if exists
    const oldMesh = this.chunkMeshes.get(key);
    if (oldMesh) {
      this.root.remove(oldMesh);
      this.octree.clearChunk(key);
      this.chunkMeshes.delete(key);
      oldMesh.geometry.dispose();
      if (oldMesh.material instanceof THREE.Material) {
        oldMesh.material.dispose();
      } else if (Array.isArray(oldMesh.material)) {
        oldMesh.material.forEach((mat) => mat.dispose());
      }
    }
    return key;
  }

  private generateChunkGeometry(chunk: IChunk) {
    // Generate geometries for all voxels in the chunk
    const promises: Promise<BufferGeometry | null>[] = [];
    chunk.voxels.forEach((voxel) => {
      promises.push(this.generateVoxelGeometryAsync(voxel));
    });
    Promise.all(promises).then((geometries) => {
      const validGeometries = geometries.filter((geom) => geom !== null) as BufferGeometry[];
      if (validGeometries.length === 0) return;
      const chunkGeometry = BufferGeometryUtils.mergeGeometries(validGeometries);
      if (!chunkGeometry) return;
      // Remove old mesh if exists and generate new mesh
      const key = this.removeMesh(chunk);
      const mesh = this.generateMesh(chunkGeometry);
      this.root.add(mesh);
      this.octree.addChunk(getChunkKey(chunk.position, this.chunkSize), mesh);
      this.chunkMeshes.set(key, mesh);
    });
  }

  private generateChunkGeometryAsync(results: Set<THREE.Vector3>): Promise<void[]> {
    // Generate chunk geometries asynchronously
    const promises: Set<Promise<void>> = new Set();
    results.forEach((chunkPos) => {
      const chunkKey = getChunkKey(chunkPos, this.chunkSize);
      const chunk = this.chunks.get(chunkKey);
      if (chunk) {
        promises.add(new Promise((resolve) => {
          setTimeout(() => {
            this.generateChunkGeometry(chunk);
            resolve();
          }, 0);
        }));
      }
    });
    return Promise.all(promises);
  }

  dispose(): void {
    // clear existing data
    this.voxels.clear();
    this.chunks.clear();
    this.chunkMeshes.forEach((mesh) => {
      this.root.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      } else if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      }
    });
    this.chunkMeshes.clear();
    this.octree.clear();
  }

  async generateMap(): Promise<{ root: THREE.Group; octree: ChunkedOctree }> {
    this.dispose();

    // Apply each map generator pass
    this.mapGeneratorPasses.forEach((pass) => {
      pass.apply(this);
    });

    // Center the root group
    this.reCenter();

    // Generate geometry for all chunks
    await this.generateChunkGeometryAsync(new Set(this.chunks.values().map(c => c.position)));
    return { root: this.root, octree: this.octree };
  }

  reCenter() {
    // Center the root group
    this.root.position.set(
      -(this.worldSize.x * this.blockSize) / 2,
      0,
      -(this.worldSize.z * this.blockSize) / 2
    );
  }

  // Rebuild neighboring chunks after voxel edit
  private rebuildNeighborChunks(editResult: IVoxelEditResult) {
    if (!editResult || !editResult.voxel) return;
    const result = new Set<THREE.Vector3>();
    neighbors.forEach((offset) => {
      const neighborPos = new THREE.Vector3()
        .copy(editResult.voxel!.position)
        .add(offset);
      const neighbor = this.voxels.get(getKey(neighborPos));
      if (neighbor) {
        const chunkPos = getChunkPosition(neighbor.position, this.chunkSize);
        result.add(chunkPos);
      }
    });
    if (editResult.chunk) {
      result.add(editResult.chunk.position);
    }

    this.generateChunkGeometryAsync(result);
  }

  addVoxel(position: THREE.Vector3, type: number, rebuild: boolean = true): IVoxelEditResult {
    const key = getKey(position);
    const current = this.voxels.get(key);
    if (current && current.type === type)
      return { voxel: undefined, chunk: undefined }; // already exists
    if (current) {
      this.removeVoxel(position);
    }
    const voxel = { position, type } as IVoxel;
    this.voxels.set(key, voxel);
    const chunkKey = getChunkKey(position, this.chunkSize);
    let chunk = this.chunks.get(chunkKey);
    if (!chunk) {
      chunk = {
        position: getChunkPosition(position, this.chunkSize),
        voxels: new Set<IVoxel>(),
      };
      this.chunks.set(chunkKey, chunk);
    }
    chunk.voxels.add(voxel);

    const result = { voxel, chunk };
    if (rebuild)
      this.rebuildNeighborChunks(result);
    return result;
  }

  removeVoxel(position: THREE.Vector3, rebuild: boolean = true): IVoxelEditResult {
    const key = getKey(position);
    const voxel = this.voxels.get(key);
    const chunkKey = getChunkKey(position, this.chunkSize);
    const chunk = this.chunks.get(chunkKey);
    if (voxel) {
      this.voxels.delete(key);
      if (chunk) {
        chunk.voxels.delete(voxel);
        if (chunk.voxels.size === 0) {
          this.chunks.delete(chunkKey);
          this.octree.removeChunk(chunkKey);
        }
      }
    }
    const result = { voxel, chunk };
    if (rebuild) 
      this.rebuildNeighborChunks(result);
    return result;
  }

  getVoxel(position: THREE.Vector3): IVoxel | undefined {
    return this.voxels.get(getKey(position));
  }

  iterateVoxels(callback: (position: THREE.Vector3) => void): void {
    const worldSize = this.worldSize;
    const totalSize = worldSize.x * worldSize.y * worldSize.z;
    const tmp = new THREE.Vector3();
    for(let i = 0; i < totalSize; i++) {
      const x = i % worldSize.x;
      const y = Math.floor(i / (worldSize.x * worldSize.z));
      const z = Math.floor(i / worldSize.x) % worldSize.z;
      callback(tmp.set(x, y, z));
    }
  }

  // Raycast to find voxel position under crosshair
  raycastVoxel(
    camera: any,
    addRemove: boolean = false,
    maxDistance: number = 5
  ): IVoxelRaycastResult | undefined {
    const raycaster = new THREE.Raycaster(undefined, undefined, 0, maxDistance);
    const mouse = new THREE.Vector2(0, 0);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(this.root, true);
    if (intersects.length === 0) return;
    const intersection = intersects[0];

    // Determine which voxel was hit
    const faceNormal = (
      intersection.face?.normal || new THREE.Vector3()
    ).clone();
    faceNormal.transformDirection(intersection.object.matrixWorld).normalize();
    const epsilon = Math.min(this.blockSize, 1) * 0.01;
    const facing = addRemove ? epsilon : -epsilon;
    const hitPoint = intersection.point
      .clone()
      .addScaledVector(faceNormal, facing);
    const localPoint = this.root.worldToLocal(hitPoint);

    // position is in voxel coordinates; round to nearest voxel center
    const voxelX = Math.floor(localPoint.x + 0.5);
    const voxelY = Math.floor(localPoint.y + 0.5);
    const voxelZ = Math.floor(localPoint.z + 0.5);

    const voxPos = new THREE.Vector3(voxelX, voxelY, voxelZ);
    const voxel = this.voxels.get(getKey(voxPos));
    return { position: voxPos, voxel };
  }
}
