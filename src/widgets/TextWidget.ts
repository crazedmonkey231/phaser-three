// This widget displays text on the screen
import { GameScene } from '../GameScene';
import { Level } from '../Level';
import { IWidgetProps } from '../Types';
import { Widget } from '../Widget';

export interface ITextWidgetProps extends IWidgetProps {
  text: string;
  x: number;
  y: number;
  style?: Phaser.Types.GameObjects.Text.TextStyle;
}

export class TextWidget extends Widget<Phaser.GameObjects.Text, ITextWidgetProps> {
  constructor(level: Level, props: ITextWidgetProps) {
    super(level, props);
  }

  create(scene: GameScene): void {
    const { text, x, y, style } = this.props as ITextWidgetProps;
    this.gameObject = scene.add.text(x, y, text, style).setScrollFactor(0).setStroke('#000000', 4);
  }

  dispose() {
    super.dispose();
  }
}