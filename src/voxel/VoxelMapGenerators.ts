import * as THREE from "three";
import { generateNoise } from "../Utils";
import { IMapGeneratorPass, VoxelMap } from "./Voxel";
import { blockTypes } from "./VoxelBlocks";

// Default map generator pass that creates a simple terrain
export const defaultPass: IMapGeneratorPass = {
  name: "default",
  apply(voxelManager: VoxelMap) {
    const { worldSize, seed } = voxelManager;
    const totalSize = worldSize.x * worldSize.y * worldSize.z;
    for(let i = 0; i < totalSize; i++) {
      const x = i % worldSize.x;
      const z = Math.floor(i / worldSize.x) % worldSize.z;
      const height = generateNoise(x, z, seed, -4, 200, 30, 10, 5, 0.3);
      for (let y = 0; y < worldSize.y; y++) {
        const position = new THREE.Vector3(x, y, z);
        let type = blockTypes.AIR;
        if (y < height) {
          type = blockTypes.GRASS;
        }
        if (type !== blockTypes.AIR) {
          voxelManager.addVoxel(position, type, false);
        }
      }
    }
  },
};

// Example of a custom pass that removes all air blocks
export const removeAirPass: IMapGeneratorPass = {
  name: "removeAir",
  apply(voxelManager: VoxelMap) {
    voxelManager.iterateVoxels(position => {
      const voxel = voxelManager.getVoxel(position);
      if (voxel && voxel.type === blockTypes.AIR) {
        voxelManager.removeVoxel(position);
      }
    });
  },
};
