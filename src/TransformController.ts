import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/Addons.js";
import { Level } from "./Level";
import { simpleRaycastMouse } from "./Utils";
import { GameScene } from "./GameScene";
import { TextWidget } from "./widgets/TextWidget";
import { ButtonWidget, IButtonWidgetProps } from "./widgets/ButtonWidget";
import { IThing, WidgetType } from "./Types";
import { Thing } from "./Thing";

/** Controller for TransformControls to manipulate objects in the scene */
export class TransformController {
  private level: Level;
  private scene: GameScene;
  private transformControls: TransformControls | null = null;
  private gizmo: THREE.Object3D | null = null;
  private widgets: Map<string, WidgetType> = new Map();
  private selected: IThing | null = null;
  private hoveredWidget: WidgetType | null = null;
  constructor(level: Level, params: any = {}) {
    this.level = level;
    this.scene = level.getGameScene();

    // transform controls
    this.transformControls = new TransformControls(
      level.camera,
      this.scene.game.canvas
    );
    this.setSpace("world");

    // disable orbit controls when dragging
    this.transformControls.addEventListener("dragging-changed", (event) => {
      level.getOrbitControls().setEnabled(!event.value);
    });

    // mouse click raycast
    this.scene.input.on("pointerdown", (event: any) => {
      if (this.transformControls?.dragging || this.hoveredWidget || event.button !== 0) return;
      const mousePos = new THREE.Vector2(
        (event.downX / window.innerWidth) * 2 - 1,
        -(event.downY / window.innerHeight) * 2 + 1
      );
      const intersects = simpleRaycastMouse(level, level.camera, mousePos, 1000);
      if (intersects && intersects.size > 0) {
        this.onPointerDown(event, intersects);
      } else {
        this.onDeselect();
      }
    });

    this.scene.input.on("pointermove", (event: any) => {
      if (!this.selected) return;
      // console.log("pointer move", event.isDown);
    });

    // keydown events
    this.scene.input.keyboard?.on('keydown', (event: any) => {
      this.onKeyDown(event);
    });

    // set initial params
    if (params.translationSnap || params.rotationSnap || params.scaleSnap) {
      this.setSnap(
        params.translationSnap,
        params.rotationSnap,
        params.scaleSnap
      );
    }

    this.createWidgets();
  }

  private onSelect(thing: IThing | null, multiSelect: boolean = false) {
    if (this.transformControls && this.level && thing) {
      this.transformControls.attach(thing.group);
      this.gizmo = this.transformControls.getHelper();
      this.level.add(this.gizmo);
      this.selected = thing;
      this.level.postprocess.setOutlineSelectedObjects([thing.group]);
    }
  }

  private onDeselect() {
    if (this.transformControls) {
      if (this.transformControls.dragging) return;
      this.transformControls.detach();
      if (this.gizmo && this.level) {
        this.level.remove(this.gizmo);
        this.gizmo = null;
      }
      this.selected = null;
      this.level.postprocess.setOutlineSelectedObjects([]);
    }
  }

  private onPointerDown(event: PointerEvent, intersects: Set<IThing>) {
    const multiselect = event.ctrlKey || event.metaKey;
    const firstThing = intersects.values().next().value;
    if (!firstThing) {
      this.onDeselect();
      return;
    }
    this.onSelect(firstThing, multiselect);
  }

  private onKeyDown(event: KeyboardEvent) {
    const multiselect = event.ctrlKey || event.metaKey;
    if (!this.level) return;
    if (event.key === "1") {
      if (this.selected) {
        this.level.addThing(Thing.copy(this.selected));
      }
    } else if (event.key === "2") {
      this.setMode("translate");
    } else if (event.key === "3") {
      this.setMode("rotate");
    } else if (event.key === "4") {
      this.setMode("scale");
    } else if (event.key === "5") {
      if (this.selected) {
        this.detach();
        this.level.removeThing(this.selected, true);
        this.selected = null;
      }
    } else if (event.key === "9") {
      this.detach();
      this.level.removeAllThings();
      this.level.create();
    } else if (event.key === "0") {
      this.level.exportJson();
    }
  }

  attach(object: THREE.Object3D) {
    this.transformControls?.attach(object);
  }

  detach() {
    this.transformControls?.detach();
  }

  setMode(mode: "translate" | "rotate" | "scale") {
    this.transformControls?.setMode(mode);
  }

  setSnap(translationSnap?: number, rotationSnap?: number, scaleSnap?: number) {
    if (this.transformControls) {
      this.transformControls.setTranslationSnap(translationSnap || 1);
      this.transformControls.setRotationSnap(
        rotationSnap || THREE.MathUtils.degToRad(15)
      );
      this.transformControls.setScaleSnap(scaleSnap || 0.1);
    }
  }

  setEnabled(enabled: boolean) {
    if (this.transformControls) {
      this.transformControls.enabled = enabled;
    }
  }

  setSpace(space: "world" | "local") {
    this.transformControls?.setSpace(space);
  }

  getObject() {
    return this.transformControls?.object;
  }

  dispose() {
    if (this.transformControls) {
      this.clearWidgets();
      this.scene.input?.off('pointerdown');
      this.scene.input.keyboard?.off('keydown');
      this.transformControls.detach();
      this.gizmo?.parent?.remove(this.gizmo);
      this.gizmo = null;
      this.transformControls.dispose();
      this.transformControls = null;
      this.selected = null;
      this.level = null as any;
    }
  }

  getControls() {
    return this.transformControls;
  }

  clearWidgets() {
    this.widgets.forEach((widget) => {
      widget.dispose();
    });
    this.widgets.clear();
  }

  createWidgets() {
    this.clearWidgets();
    const text = 'Controls:\n1. Duplicate\n2. Translate\n3. Rotate\n4. Scale\n5. Delete\n9. Reset\n0. Export'
    new TextWidget(this.level, {
      name: "transform instructions",
      text: text,
      x: 10,
      y: 35,
      style: { font: '16px Arial', color: '#ffffff' }
    });

    new ButtonWidget(this.level, {
      name: "duplicate button",
      texture: 'add',
      x: 150,
      y: 50,
      pixelPerfect: false,
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
      },
      onClick: (widget: WidgetType) => {
        if (this.selected) {
          this.level.addThing(Thing.copy(this.selected));
        }
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
      }
    });
  }
}