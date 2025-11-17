import { GameScene } from "./GameScene";
import { Level } from "./Level";
import { IWidgetProps, IWidget, WidgetType } from "./Types";


// Base widget class
export class Widget<TGameObject extends Phaser.GameObjects.GameObject, TProps extends IWidgetProps> implements IWidget {
  name: string = "Widget";
  gameObject: TGameObject | undefined;
  props: TProps = {} as TProps;
  level: Level;
  constructor(level: Level, props?: TProps) {
    this.gameObject = undefined;
    this.props = props || ({} as TProps);
    this.level = level;
    this.name = this.props.name || "Widget_" + Math.floor(Math.random() * 10000);
    setTimeout(() => {
      const scene = level.getGameScene();
      this.create(scene);
      if (!this.gameObject) {
        return;
      }
      this.setupInput();
      scene.add.existing(this.gameObject);
      level.widgets.set(this.name, this);
    }, 0);
  }

  create(scene: GameScene): void { }
  update(timer: number, delta: number, args: any) { }
  resize?(): void;

  setupInput() {
    if (!this.gameObject) return;
    const { onHover, onClick, onOut } = this.props;
    if (onOut || onHover || onClick) {
      this.gameObject.setInteractive();
      if (onHover) {
        this.gameObject.on('pointerover', () => {
          onHover(this);
        });
      }
      if (onClick) {
        this.gameObject.on('pointerup', () => {
          onClick(this);
        });
      }
      if (onOut) {
        this.gameObject.on('pointerout', () => {
          onOut(this);
        });
      }
    }
  }

  setText(newText: string) {
    if (this.gameObject) {
      (this.gameObject as any).setText(newText);
    }
  }

  setImage(textureKey: string) {
    if (this.gameObject) {
      (this.gameObject as any).setTexture(textureKey);
    }
  }

  setFocus(newFocus: boolean) {
    if (this.gameObject) {
      if (newFocus) {
        ((this.gameObject as any).node as any).focus();
      } else {
        ((this.gameObject as any).node as any).blur();
      }
    }
  }

  private isValidWidget(widget: WidgetType): { isValid: boolean; gameObject: Phaser.GameObjects.GameObject | undefined } {
    const gameObject = widget.getGameObject();
    const isValid = gameObject !== undefined && this.gameObject !== undefined;
    return { isValid, gameObject };
  }

  addChild(widget: WidgetType): boolean {
    const { isValid, gameObject } = this.isValidWidget(widget);
    if (!isValid) return false;
    if ((this.gameObject as any).add) {
      (this.gameObject as any).add(gameObject);
    }
    return true;
  }

  removeChild(widget: WidgetType): boolean {
    const { isValid, gameObject } = this.isValidWidget(widget);
    if (!isValid) return false;
    if ((this.gameObject as any).remove) {
      (this.gameObject as any).remove(gameObject);
    }
    return true;
  }
  
  getGameObject() {
    return this.gameObject;
  }

  getValue() {
    if (this.gameObject) {
      return (this.gameObject as any).node ? (this.gameObject as any).node.value : undefined;
    }
  }

  setValue(value: any) {
    if (this.gameObject) {
      if ((this.gameObject as any).node) {
        (this.gameObject as any).node.value = value;
      }
    }
  }

  dispose() {
    if (this.gameObject) {
      this.level.widgets.delete(this.name);
      this.gameObject.off('pointerdown');
      this.gameObject.off('pointerover');
      this.gameObject.off('pointerout');
      this.gameObject.destroy();
      this.gameObject = null as any;
      this.props = null as any;
      this.level = null as any;
    }
  }

  toJsonObject(): any {
    return {
      name: this.name,
      props: this.props
    };
  }
}
