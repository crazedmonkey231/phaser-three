import { BasicBoxThing } from "./things/BasicBoxThing";
import { WaterPlane } from "./things/WaterPlane";
import { WaterPBR } from "./things/WaterPBR";
import { HologramSphere } from "./things/HologramSphere";

/** 
 * A registry of all the things that can be created in the game, used for deserialization and dynamic creation of things by name.
 * This is a simple mapping of string names to classes. You can add new things here as you create them.
 * 
 * Replaces the globalThis approach for deserialization. Things are saved by 'constructor.name', and looked up here when loading from JSON.
 */
export const Defs: Record<string, any> = {
  "BasicBoxThing": BasicBoxThing,
  "WaterPlane": WaterPlane,
  "WaterPBR": WaterPBR,
  "HologramSphere": HologramSphere,
}