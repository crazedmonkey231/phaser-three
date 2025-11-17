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
import { OrbitParticles } from "../things/OrbitParticles";
import { createTextButton, ITextButton } from '../WidgetUtils';


/** 
 * This is a Level Editor.
 * 
 * Initialize this to allow translation, rotation, and scaling of things in the level.
 * 
 * Save the level then load it for your game.
 */
export class Editor implements IService {
  name: string = "Editor";
  private level: Level;
  private scene: GameScene;
  private transformControls: TransformControls | null = null;
  private gizmo: THREE.Object3D | null = null;
  private enabled: boolean = true;
  private selected: IThing | null = null;
  private hoveredWidget: any = null;
  private translationSnap: number = 1;
  private rotationSnap: number = 15;
  private scaleSnap: number = 0.1;
  private toolTipText: TextWidget | null = null;
  private headerButtons: ITextButton[] = [];
  private sliders: SliderWidget[] = [];
  private objectTray: ObjectTray | null = null;
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
    this.setSnap(
      params.translationSnap || this.translationSnap,
      params.rotationSnap || this.rotationSnap,
      params.scaleSnap || this.scaleSnap
    );

    this.createHud();

    this.scene.game.scale.on("resize", () => {
      this.createHud();
    });
  }

  setSelected(thing: IThing | null, multiSelect: boolean = false) {
    if (!this.enabled) return;
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

  setTransformToolEnabled(enabled: boolean) {
    if (this.transformControls) {
      this.transformControls.enabled = enabled;
      this.level.getOrbitControls().setEnabled(enabled);
    }
  }

  disableTransformTool() {
    this.setTransformToolEnabled(false);
    this.level.getOrbitControls().setEnabled(false);
  }

  enableTransformTool() {
    this.setTransformToolEnabled(true);
    this.level.getOrbitControls().setEnabled(true);
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
      this.objectTray = null;
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
    this.level.widgets.clear();
    this.headerButtons.forEach((button) => {
      button.dispose();
    });
    this.headerButtons = [];
    this.sliders.forEach((slider) => {
      slider.dispose();
    });
    this.sliders = [];
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

  setToolTipText(text: string) {
    if (this.toolTipText) {
      this.toolTipText.setText(text);
    }
  }

  clearToolTipText() {
    if (this.toolTipText) {
      this.toolTipText.setText('');
    }
  }

  private createHud(){
    this.clearWidgets();
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
      x: 30,
      y: 25,
      style: { font: "24px Arial", color: "#ffffff" },
    });

    const headerButtonNames = ["Toggle", "Weather", "Duplicate", "Translate", "Rotate", "Scale", "Delete", "Reset", "Export"];
    const headerButtons: ITextButton[] = [];
    const buttonWidth = 120;
    const buttonHeight = 30;
    const buttonStartX = 75;
    const buttonStartY = 100;

    const getExtraInfo = (btn: string) => {
      switch (btn) {
        case "Weather":
          return this.level.weather.getEnabled() ? ': ON' : ': OFF';
        case "Toggle":
          return this.transformControls?.enabled ? ': ON' : ': OFF';
        default:
          return '';
      }
    };

    headerButtonNames.forEach((btn, index) => {
      const textButton: ITextButton = createTextButton(this.scene, {
        label: btn,
        x: buttonStartX,
        y: buttonStartY + index * (buttonHeight + 10),
        width: buttonWidth,
        height: buttonHeight,
        hoverStyle: { 
          fillColor: 0xaaaaaa,
          scale: 1.1
        },
        clickStyle: { 
          fillColor: 0x333333,
          scale: 0.85
        },
        onHover: () => {
          this.setToolTipText(btn + getExtraInfo(btn));
          this.setTransformToolEnabled(false);
          this.hoveredWidget = btn;
        },
        onOut: () => {
          this.setToolTipText('');
          this.setTransformToolEnabled(this.enabled);
          this.hoveredWidget = null;
        },
        onClick: () => {
          switch (btn) {
            case "Toggle":
              this.enabled = !this.enabled;
              this.setTransformToolEnabled(this.enabled);
              if (!this.enabled) {
                this.onDeselect();
              }
              break;
            case "Weather":
              this.level.weather.toggle();
              break;
            case "Duplicate":
              if (this.selected) {
                Thing.copy(this.selected);
              }
              break;
            case "Translate":
              this.setMode("translate");
              break;
            case "Rotate":
              this.setMode("rotate");
              break;
            case "Scale":
              this.setMode("scale");
              break;
            case "Delete":
              this.deleteSelectedThing();
              break;
            case "Reset":
              this.reload();
              break;
            case "Export":
              this.level.exportJson();
              break;
          }
          this.setToolTipText(btn + getExtraInfo(btn));
        }
      });
      headerButtons.push(textButton);
    });
    this.headerButtons = headerButtons;

    const sliders: SliderWidget[] = [];
    const sliderNames = ["Time of Day", "Translation Snap", "Rotation Snap", "Scale Snap"];
    const sliderWidth = 175;
    const sliderStartX = 165;
    const sliderStartY = 50;

    sliderNames.forEach((name, index) => {
      let value = 0;
      let min = 0;
      let max = 0;
      let step = 0;
      switch (name) {
        case "Time of Day":
          value = this.level.weather.getTimeOfDay();
          min = 0;
          max = 24;
          step = 0.1;
          break;
        case "Translation Snap":
          value = this.translationSnap;
          min = 0.1;
          max = 10;
          step = 0.1;
          break;
        case "Rotation Snap":
          value = this.rotationSnap;
          min = 1;
          max = 90;
          step = 1;
          break;
        case "Scale Snap":
          value = this.scaleSnap;
          min = 0.01;
          max = 1;
          step = 0.01;
          break;
      }
      const slider = new SliderWidget(this.level, {
        name: name,
        label: name + ': ' + value.toFixed(2),
        x: sliderStartX + index * (sliderWidth + 30),
        y: sliderStartY,
        width: sliderWidth,
        value: value,
        min: min,
        max: max,
        step: step,
        trackStyle: { fillColor: 0x555555 },
        thumbStyle: { type: "rectangle", fillColor: 0xaaaaaa },
        hoverStyle: { fillColor: 0xcccccc, scale: 1.15 },
        clickStyle: { fillColor: 0x333333 },
        onHover: () => {
          this.setToolTipText(name);
          this.disableTransformTool();
          this.hoveredWidget = name;
        },
        onOut: () => {
          this.setToolTipText('');
          this.setTransformToolEnabled(this.enabled);
          this.hoveredWidget = null;
        },
        onClick: () => {
          this.setTransformToolEnabled(false);
        },
        onClickEnd: () => {
          this.setTransformToolEnabled(this.enabled);
        },
        onChange: (newValue: number) => {
          switch (name) {
            case "Time of Day":
              this.level.weather.setTimeOfDay(newValue);
              slider.setText(`Time of Day: ${newValue.toFixed(2)}`);
              break;
            case "Translation Snap":
              this.translationSnap = newValue;
              slider.setText(`Translation Snap: ${newValue.toFixed(2)}`);
              this.setSnap(this.translationSnap, this.rotationSnap, this.scaleSnap);
              break;
            case "Rotation Snap":
              this.rotationSnap = newValue;
              slider.setText(`Rotation Snap: ${newValue.toFixed(2)}`);
              this.setSnap(this.translationSnap, this.rotationSnap, this.scaleSnap);
              break;
            case "Scale Snap":
              this.scaleSnap = newValue;
              slider.setText(`Scale Snap: ${newValue.toFixed(2)}`);
              this.setSnap(this.translationSnap, this.rotationSnap, this.scaleSnap);
              break;
          }
        }
      });
      sliders.push(slider);
    });
    this.sliders = sliders;

    this.createObjectTray();
  }

  /** Create the object tray for the transform tool, add custom things here. Ensure objects are exposed in the Defs. */
  private createObjectTray() {
    if (this.objectTray) {
      this.objectTray.dispose();
    }
    this.objectTray = new ObjectTray(this.level, {
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
        },
        {
          name: "Orbit Particles",
          type: "orbitParticles",
          icon: "cube-icon",
          class: OrbitParticles,
          params: []
        }
      ]
    });
  }

  /** Update the transform tool, called from level update */
  update(time: number, dt: number, args: any) {
    const slider = this.sliders.find(s => s.props.name === "Time of Day");
    if (slider) {
      const timeOfDay = this.level.weather.getTimeOfDay();
      slider.getSlider()?.setValue(timeOfDay);
      slider.setText(`Time of Day: ${timeOfDay.toFixed(2)}`);
    }
    const mousePos = this.scene.input.activePointer;
    if (this.toolTipText && this.toolTipText.gameObject) {
      const textWidth = this.toolTipText.gameObject.width;
      const textHeight = this.toolTipText.gameObject.height;
      this.toolTipText.gameObject.setPosition(mousePos.x - textWidth / 2, mousePos.y - textHeight - 5);
      this.toolTipText.gameObject.setDepth(1000);
    }
  }

  /** Save the editor state to a JSON object */
  toJsonObject() {
    return {
      enabled: this.enabled,
      translationSnap: this.translationSnap,
      rotationSnap: this.rotationSnap,
      scaleSnap: this.scaleSnap,
    };
  }

  /** Load the editor state from a JSON object */
  fromJsonObject(json: any) {
    this.enabled = json.enabled;
    this.setTransformToolEnabled(this.enabled);
    this.setSnap(json.translationSnap, json.rotationSnap, json.scaleSnap);
  }
}