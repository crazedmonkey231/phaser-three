import * as THREE from "three";

// Texture atlas settings
const tilePixelSize = 16;
const atlasTextureWidth = 256;
const atlasTextureHeight = 64;
const atlasColumns = atlasTextureWidth / tilePixelSize;
const atlasRows = atlasTextureHeight / tilePixelSize;

// Atlas configuration
export const blockTypes = {
  AIR: 0,
  GRASS: 1,
};

const blockFaceTiles: Record<number, BlockFaceConfig> = {
  [blockTypes.GRASS]: {
    top: { x: 7, y: 0 },
    bottom: { x: 7, y: 2 },
    side: { x: 7, y: 1 },
  },
};

// Atlas UV mapping
type BlockFace = "top" | "bottom" | "side";
interface AtlasTile {
  x: number;
  y: number;
}
type BlockFaceConfig = Record<BlockFace, AtlasTile>;
const defaultBlockTile: BlockFaceConfig = blockFaceTiles[blockTypes.GRASS];

function resolveFace(faceIndex: number): BlockFace {
  if (faceIndex === 2) return "top";
  if (faceIndex === 3) return "bottom";
  return "side";
}

export function setFaceUVs(
  geometry: THREE.PlaneGeometry,
  blockType: number,
  faceIndex: number
) {
  const face = resolveFace(faceIndex);
  const tileConfig = blockFaceTiles[blockType] ?? defaultBlockTile;
  const tile = tileConfig[face] ?? tileConfig.side ?? defaultBlockTile.side;
  const uMin = tile.x / atlasColumns;
  const uMax = (tile.x + 1) / atlasColumns;
  const vMax = 1 - tile.y / atlasRows;
  const vMin = 1 - (tile.y + 1) / atlasRows;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  uv.setXY(0, uMin, vMin);
  uv.setXY(1, uMax, vMin);
  uv.setXY(2, uMin, vMax);
  uv.setXY(3, uMax, vMax);
  uv.needsUpdate = true;
}