import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/Addons.js";
import { Level } from "../Level";
import { simpleRaycastMouse } from "../Utils";
import { GameScene } from "../GameScene";
import { TextWidget } from "../widgets/TextWidget";
import { ButtonWidget } from "../widgets/ButtonWidget";
import { IThing, WidgetType } from "../Types";
import { Thing } from "../Thing";
import { ObjectTray } from "./ObjectTray";
import { BasicBoxThing } from "../things/BasicBoxThing";
import { SliderWidget } from "../widgets/SliderWidget";

/** 
 * This is traditionally called a Level Editor.
 * 
 * Initialize this to allow translation, rotation, and scaling of things in the level.
 * 
 * Save the level then load it for your game.
 */
export class TransformTool {
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

  setSelected(thing: IThing | null, multiSelect: boolean = false) {
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
    this.setSelected(firstThing, multiselect);
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
      this.deleteSelectedThing();
    } else if (event.key === "9") {
      this.reload();
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
        THREE.MathUtils.degToRad(rotationSnap || 15)
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

  deleteSelectedThing() {
    if (this.selected) {
      this.level.removeThing(this.selected, true);
      this.onDeselect();
    }
  }

  reload() {
    this.detach();
    this.level.removeAllThings();
    this.level.create();
  }

  private createButtons(){
    this.clearWidgets();
    new TextWidget(this.level, {
      name: "transform instructions",
      text: 'Controls:\n1. Duplicate\n2. Translate\n3. Rotate\n4. Scale\n5. Delete\n9. Reset\n0. Export',
      x: 10,
      y: 50,
      style: { font: '16px Arial', color: '#ffffff' }
    });

    const width = this.scene.game.canvas.width;
    new ButtonWidget(this.level, {
      name: "duplicate button",
      texture: 'duplicate',
      x: width - 60,
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

    new ButtonWidget(this.level, {
      name: "translate button",
      texture: 'translate',
      x: width - 60,
      y: 130,
      pixelPerfect: false,
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
      },
      onClick: (widget: WidgetType) => {
        this.setMode("translate");
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
      }
    });

    new ButtonWidget(this.level, {
      name: "rotate button",
      texture: 'rotate',
      x: width - 60,
      y: 200,
      pixelPerfect: false,
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
      },
      onClick: (widget: WidgetType) => {
        this.setMode("rotate");
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
      }
    });

    new ButtonWidget(this.level, {
      name: "scale button",
      texture: 'scale',
      x: width - 60,
      y: 270,
      pixelPerfect: false,
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
      },
      onClick: (widget: WidgetType) => {
        this.setMode("scale");
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
      }
    });

    new ButtonWidget(this.level, {
      name: "delete button",
      texture: 'delete',
      x: width - 60,
      y: 340,
      pixelPerfect: false,
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
      },
      onClick: (widget: WidgetType) => {
        this.deleteSelectedThing();
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
      }
    });

    new ButtonWidget(this.level, {
      name: "reload button",
      texture: 'reload',
      x: width - 60,
      y: 410,
      pixelPerfect: false,
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
      },
      onClick: (widget: WidgetType) => {
        this.reload();
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
      }
    });

    new ButtonWidget(this.level, {
      name: "save button",
      texture: 'save',
      x: width - 60,
      y: 480,
      pixelPerfect: false,
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
      },
      onClick: (widget: WidgetType) => {
        this.level.exportJson();
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
      }
    });

    const initialTranslationSnap = 1;
    const initialRotationSnap = 15;
    const initialScaleSnap = 1;

    new SliderWidget(this.level, {
      name: "Translation\nSnap",
      text: `${initialTranslationSnap}`,
      initialValue: initialTranslationSnap,
      x: 220,
      y: 50,
      width: 100,
      min: 0.1,
      max: 10,
      step: 0.1,
      onChange: (value: number) => {
        this.setSnap(value, undefined, undefined);
      },
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
        this.level.getOrbitControls().setEnabled(false);
      },
      onClick: (widget: WidgetType) => {
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
        this.level.getOrbitControls().setEnabled(true);
      }
    });

    new SliderWidget(this.level, {
      name: "Rotation\nSnap",
      text: `${initialRotationSnap}`,
      initialValue: initialRotationSnap,
      x: 370,
      y: 50,
      width: 100,
      min: 1,
      max: 180,
      step: 1,
      onChange: (value: number) => {
        this.setSnap(undefined, value, undefined);
      },
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
        this.level.getOrbitControls().setEnabled(false);
      },
      onClick: (widget: WidgetType) => {
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
        this.level.getOrbitControls().setEnabled(true);
      }
    });

    new SliderWidget(this.level, {
      name: "Scale\nSnap",
      text: `${initialScaleSnap}`,
      initialValue: initialScaleSnap,
      x: 520,
      y: 50,
      width: 100,
      min: 0.1,
      max: 10,
      step: 0.1,
      onChange: (value: number) => {
        this.setSnap(undefined, undefined, value);
      },
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
        this.level.getOrbitControls().setEnabled(false);
      },
      onClick: (widget: WidgetType) => {
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
        this.level.getOrbitControls().setEnabled(true);
      }
    });

    this.setSnap(
      initialTranslationSnap,
      initialRotationSnap,
      initialScaleSnap
    );
  }

  /** Create the object tray for the transform tool, add custom things here */
  private createObjectTray() {
    new ObjectTray(this.level, {
      name: "object tray",
      items: [
        {
          name: "Cube",
          type: "cube",
          icon: "cube-icon",
          class: BasicBoxThing
        }
      ]
    });
  }

  /** Create all widgets for the TransformTool */
  createWidgets() {
    this.createButtons();
    this.createObjectTray();
  }
}