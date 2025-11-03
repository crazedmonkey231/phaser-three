// This widget displays text on the screen
import { GameScene } from "../GameScene";
import { Level } from "../Level";
import { IWidgetProps, WidgetType } from "../Types";
import { Widget } from "../Widget";

export interface IButtonWidgetProps extends IWidgetProps {
  texture: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  pixelPerfect?: boolean;
  scaleX?: number;
  scaleY?: number;
  hoverSound?: Howl;
  clickSound?: Howl;
  outSound?: Howl;
  onClick?: (widget: WidgetType) => void;
  onHover?: (widget: WidgetType) => void;
  onOut?: (widget: WidgetType) => void;
}

export class ButtonWidget extends Widget<
  Phaser.GameObjects.Image,
  IButtonWidgetProps
> {
  constructor(level: Level, props: IButtonWidgetProps) {
    super(level, props);
  }

  create(scene: GameScene): void {
    const { texture, x, y, width, height, onHover, onClick, onOut } =
      this.props;
    this.gameObject = scene.add.image(x, y, texture).setScrollFactor(0);
    if (width && height) {
      (this.gameObject as Phaser.GameObjects.Image).setDisplaySize(
        width,
        height
      );
    }
  }

  setupInput(): void {
    if (!this.gameObject) return;
    const { onHover, onClick, onOut } = this.props;
    const scene = this.level.getGameScene();
    this.gameObject.setInteractive({ pixelPerfect: this.props.pixelPerfect ?? true });

    // Add hover effect
    this.gameObject.on("pointerover", () => {
      scene.tweens.add({
        targets: this.gameObject,
        scaleX: this.props.scaleX ?? 1.25,
        scaleY: this.props.scaleY ?? 1.25,
        duration: 80,
      });
      if (onHover) onHover(this);
      if (this.props.hoverSound) {
        this.props.hoverSound.play();
      }
    });

    // Add click effect
    this.gameObject.on("pointerdown", () => {
      this.gameObject?.setTintFill(0xffffff);
      scene.tweens.add({
        targets: this.gameObject,
        alpha: 0.5,
        duration: 100,
        yoyo: true,
        ease: 'Power1',
        onComplete: () => {
          this.gameObject?.clearTint();
        },
      });
      scene.tweens.chain({
        targets: this.gameObject,
        tweens: [
          {
            rotation: -0.5,
            yoyo: true,
            ease: 'Power1',
            duration: 65,
          },
          {
            scaleX: this.props.scaleX ? this.props.scaleX * 1.5 : 1.5,
            scaleY: this.props.scaleY ? this.props.scaleY * 1.5 : 1.5,
            yoyo: true,
            ease: 'Power1',
            duration: 65,
          },
        ],
      });
      if (onClick) onClick(this);
      if (this.props.clickSound) {
        this.props.clickSound.play();
      }
    });

    // Add out effect
    this.gameObject.on("pointerout", () => {
      scene.tweens.add({
        targets: this.gameObject,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 80,
      });
      if (onOut) onOut(this);
      if (this.props.outSound) {
        this.props.outSound.play();
      }
    });
  }

  dispose() {
    super.dispose();
  }
}
