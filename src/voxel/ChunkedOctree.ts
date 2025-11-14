import * as THREE from 'three';
import { Octree } from 'three/examples/jsm/math/Octree.js';

/** 
 * Chunked Octree for spatial partitioning of chunks.
 */
export class ChunkedOctree extends Octree {
  private readonly chunkTrees: Map<string, Octree> = new Map();
  constructor() {
    super();
  }

  addChunk(key: string, mesh: THREE.Mesh): void {
    if (!mesh) return;
    let octree = this.chunkTrees.get(key);
    if (octree) {
      octree.clear();
    } else {
      octree = new Octree();
    }
    octree.fromGraphNode(mesh);
    this.chunkTrees.set(key, octree);
  }

  removeChunk(key: string): void {
    const value = this.chunkTrees.get(key);
    if (!value) return;
    value.clear();
    this.chunkTrees.delete(key);
  }

  clearChunk(key: string): void {
    const value = this.chunkTrees.get(key);
    if (!value) return;
    value.clear();
  }

  clear(): this {
    super.clear();
    for (const tree of this.chunkTrees.values()) {
      tree.clear();
    }
    this.chunkTrees.clear();
    return this;
  }

  capsuleIntersect(capsule: any) {
    let closest: any = null;
    for (const octree of this.chunkTrees.values()) {
      const result = octree.capsuleIntersect(capsule);
      if (!result) {
        continue;
      }
      if (!closest || result.depth > closest.depth) {
        closest = result;
      }
    }
    return closest;
  }

  sphereIntersect(sphere: any) {
    let closest: any = null;
    for (const octree of this.chunkTrees.values()) {
      const result = octree.sphereIntersect(sphere);
      if (!result) {
        continue;
      }
      if (!closest || result.depth > closest.depth) {
        closest = result;
      }
    }
    return closest;
  }
}