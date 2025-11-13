import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/Addons.js";
import { Level } from "../Level";
import { simpleRaycastMouse } from "../Utils";
import { GameScene } from "../GameScene";
import { TextWidget } from "../widgets/TextWidget";
import { ButtonWidget } from "../widgets/ButtonWidget";
import { IThing, WidgetType, IService } from '../Types';
import { Thing } from "../Thing";
import { ObjectTray } from "./ObjectTray";
import { BasicBoxThing } from "../things/BasicBoxThing";
import { SliderWidget } from "../widgets/SliderWidget";
import { FpsWidget } from "../widgets/FpsWidget";
import { HologramSphere } from "../things/HologramSphere";
import { TextThing } from "../things/TextThing";

/** 
 * This is traditionally called a Level Editor.
 * 
 * Initialize this to allow translation, rotation, and scaling of things in the level.
 * 
 * Save the level then load it for your game.
 */
export class TransformTool implements IService {
  name: string = "TransformTool";
  private level: Level;
  private scene: GameScene;
  private transformControls: TransformControls | null = null;
  private gizmo: THREE.Object3D | null = null;
  private selected: IThing | null = null;
  private hoveredWidget: WidgetType | null = null;
  private translationSnap: number = 1;
  private rotationSnap: number = 15;
  private scaleSnap: number = 0.1;
  private timeOfDay: number = 12;
  private toolTipText: TextWidget | null = null;
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

    this.scene.game.scale.on("resize", () => {
      this.createWidgets();
    });
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
       Thing.copy(this.selected);
      }
    } else if (event.key === "2") {
      this.setMode("translate");
    } else if (event.key === "3") {
      this.setMode("rotate");
    } else if (event.key === "4") {
      this.setMode("scale");
    } else if (event.key === "5" || event.key === "Delete") {
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
    if (translationSnap !== undefined) {
      this.translationSnap = translationSnap;
    } else {
      this.translationSnap = 1;
    }
    if (rotationSnap !== undefined) {
      this.rotationSnap = rotationSnap;
    } else {
      this.rotationSnap = 15;
    }
    if (scaleSnap !== undefined) {
      this.scaleSnap = scaleSnap;
    } else {
      this.scaleSnap = 0.1;
    }
    if (this.transformControls) {
      this.transformControls.setTranslationSnap(this.translationSnap);
      this.transformControls.setRotationSnap(
        THREE.MathUtils.degToRad(this.rotationSnap)
      );
      this.transformControls.setScaleSnap(this.scaleSnap);
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
      this.toolTipText = null;
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
    this.level.widgets.forEach((widget) => {
      widget.dispose();
    });
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

  private setToolTipText(text: string) {
    if (this.toolTipText) {
      this.toolTipText.setText(text);
    }
  }

  private createButtons(){
    const width = this.scene.game.canvas.width;
    const height = this.scene.game.canvas.height;

    this.toolTipText = new TextWidget(this.level, {
      name: "toolTip",
      text: '',
      x: 10,
      y: height - 30,
      style: { font: '16px Arial', color: '#ffffff' }
    });

    new FpsWidget(this.level, {
      name: "fpsText",
      text: "",
      x: 10,
      y: 10,
      style: { font: "24px Arial", color: "#ffffff" },
    });
    
    new TextWidget(this.level, {
      name: "transform instructions",
      text: 'Controls:\n1. Duplicate\n2. Translate\n3. Rotate\n4. Scale\n5. Delete\n9. Reset\n0. Export',
      x: 10,
      y: 50,
      style: { font: '16px Arial', color: '#ffffff' }
    });

    new ButtonWidget(this.level, {
      name: "Duplicate",
      texture: 'duplicate',
      x: width - 60,
      y: 50,
      pixelPerfect: false,
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
      },
      onClick: (widget: WidgetType) => {
        if (this.selected) {
          Thing.copy(this.selected);
        }
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
      }
    });

    new ButtonWidget(this.level, {
      name: "Translate",
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
      name: "Rotate",
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
      name: "Scale",
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
      name: "Delete",
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
      name: "Reload",
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
      name: "Save",
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

    new SliderWidget(this.level, {
      name: "Translation\nSnap",
      text: `${this.translationSnap}`,
      initialValue: this.translationSnap,
      x: 220,
      y: 50,
      width: 100,
      min: 0.05,
      max: 1,
      step: 0.05,
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
      text: `${this.rotationSnap}`,
      initialValue: this.rotationSnap,
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
      text: `${this.scaleSnap}`,
      initialValue: this.scaleSnap,
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
      this.translationSnap,
      this.rotationSnap,
      this.scaleSnap
    );

    new SliderWidget(this.level, {
      name: "Time of Day",
      text: `${this.timeOfDay}`,
      initialValue: this.timeOfDay,
      x: 670,
      y: 50,
      width: 100,
      min: 0,
      max: 24,
      step: 0.1,
      onChange: (value: number) => {
        this.timeOfDay = value;
        this.level.weather.setTimeOfDay(this.timeOfDay);
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
    this.level.weather.setTimeOfDay(this.timeOfDay);

    new ButtonWidget(this.level, {
      name: "Toggle Weather",
      x: width - 60,
      y: 550,
      pixelPerfect: false,
      texture: 'toggle_weather',
      onClick: (widget: WidgetType) => {
        this.level.weather.toggle();
      },
      onHover: (widget: WidgetType) => {
        this.hoveredWidget = widget;
        this.level.getOrbitControls().setEnabled(false);
      },
      onOut: (widget: WidgetType) => {
        this.hoveredWidget = null;
        this.level.getOrbitControls().setEnabled(true);
      }
    });

  }

  /** Create the object tray for the transform tool, add custom things here. Ensure objects are exposed globally for saving and loading. */
  private createObjectTray() {
    new ObjectTray(this.level, {
      name: "object tray",
      items: [
        {
          name: "Cube",
          type: "cube",
          icon: "cube-icon",
          class: BasicBoxThing,
          params: []
        },
        {
          name: "Hologram Sphere",
          type: "hologramSphere",
          icon: "cube-icon",
          class: HologramSphere,
          params: []
        },
        {
          name: "Text Thing",
          type: "textThing",
          icon: "cube-icon",
          class: TextThing,
          params: ["This is a text thing!"]
        }
      ]
    });
  }

  /** Create all widgets for the TransformTool */
  createWidgets() {
    this.clearWidgets();
    this.createButtons();
    this.createObjectTray();
  }

  /** Update the transform tool, called from level update */
  update(time: number, dt: number, args: any) {
    const slider: SliderWidget | undefined = this.level.widgets.get("Time of Day") as SliderWidget;
    if (slider) {
      const timeOfDay = this.level.weather.getTimeOfDay();
      slider.setSliderValue(timeOfDay);
      slider.setText(`${timeOfDay.toFixed(1)}`);
    }
    const mousePos = this.scene.input.activePointer;
    if (this.hoveredWidget && this.hoveredWidget.props && this.toolTipText && this.toolTipText.gameObject) {
      const textWidth = this.toolTipText.gameObject.width;
      const textHeight = this.toolTipText.gameObject.height;
      this.toolTipText.gameObject.setPosition(mousePos.x - textWidth, mousePos.y - textHeight + 25);
      this.toolTipText.gameObject.setDepth(1000);
      this.setToolTipText(this.hoveredWidget.props.name || '');
    } else {
      this.setToolTipText('');
    }
  }
}