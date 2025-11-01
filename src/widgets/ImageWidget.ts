// This widget displays text on the screen
import { GameScene } from '../GameScene';
import { Level } from '../Level';
import { IWidgetProps } from '../Types';
import { Widget } from '../Widget';

export interface IImageWidgetProps extends IWidgetProps {
  texture: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export class ImageWidget extends Widget<Phaser.GameObjects.Image, IImageWidgetProps> {
  constructor(level: Level, props: IImageWidgetProps) {
    super(level, props);
  }

  create(scene: GameScene): void {
    const { texture, x, y, width, height } = this.props as IImageWidgetProps;
    this.gameObject = scene.add.image(x, y, texture).setScrollFactor(0);
    if (width && height) {
      (this.gameObject as Phaser.GameObjects.Image).setDisplaySize(width, height);
    }
  }

  dispose() {
    super.dispose();
  }
}