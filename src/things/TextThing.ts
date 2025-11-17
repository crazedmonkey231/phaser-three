import * as THREE from "three";
import { Level } from "../Level";
import { Thing } from "../Thing";
import { loadText3D } from "../ThingUtils";

/** Example subclass of Thing using a 3d flat text mesh */
export class TextThing extends Thing {
  constructor(level: Level, name: string = "textThing", type: string = "TextThing", text: string = "Hello World") {
    super(level, name, type);
    this.data.text = text; // Store the text in the data object so it can be saved and used for later use in create()
  }

  create(): void {
    const params = {
      fontFile: "helvetiker_regular.typeface.json",
      size: 0.3,
      color: 0xffffff,
      outlineColor: 0x000000,
    }
    loadText3D(this.data.text, params).then((model: THREE.Mesh) => {
      this.group.add(model);
    });
  }

  update(time: number, dt: number): void {}
}