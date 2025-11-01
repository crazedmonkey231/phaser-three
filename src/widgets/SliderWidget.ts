// Slider widget for adjusting values
import { GameScene } from '../GameScene';
import { Level } from '../Level';
import { IWidgetProps } from '../Types';
import { Widget } from '../Widget';

export interface ISliderWidgetProps extends IWidgetProps {
  text: string;
  x: number;
  y: number;
  width: number;
  min: number;
  max: number;
  initialValue: number;
  step?: number;
  onChange?: (value: number) => void;
}

export class SliderWidget extends Widget<Phaser.GameObjects.Container, ISliderWidgetProps> {
  constructor(level: Level, props: ISliderWidgetProps) {
    super(level, props);
  }

  create(scene: GameScene): void {
    const { x, y, width, min, max, step, initialValue, onChange } = this.props;
    const trackHeight = 8;
    const thumbRadius = 12;
    this.gameObject = scene.add.container(x, y).setScrollFactor(0);

    const text = scene.add.text(width / 2, -25, this.props.text, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    const track = scene.add.rectangle(0, 0, width, trackHeight, 0x888888).setOrigin(0, 0.5);
    const thumb = scene.add.circle(0, 0, thumbRadius, 0xffffff).setStrokeStyle(2, 0x000000).setOrigin(0.5);
    // const thumb = scene.add.image(0, 0, 'add').setDisplaySize(thumbRadius * 4, thumbRadius * 4).setOrigin(0.5);
    this.gameObject.add([text, track, thumb]);

    const valueToPosition = (value: number) => {
      return ((value - min) / (max - min)) * width;
    };
    const positionToValue = (position: number) => {
      let value = min + (position / width) * (max - min);
      if (step) {
        value = Math.round(value / step) * step;
      }
      // round to avoid floating point precision issues
      value = Math.round(value * 100000) / 100000;
      return Phaser.Math.Clamp(value, min, max);
    };
    let currentValue = initialValue;
    thumb.x = valueToPosition(currentValue);
    thumb.setInteractive({ draggable: true });

    thumb.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      dragX = Phaser.Math.Clamp(dragX, 0, width);
      thumb.x = dragX;
      currentValue = positionToValue(dragX);
      if (onChange) {
        onChange(currentValue);
        this.setText(`${currentValue}`);
      }
    });
  }

  setText(newText: string): void {
    if (!this.gameObject) return;
    const textObject = this.gameObject.list[0] as Phaser.GameObjects.Text;
    textObject.setText(newText);
  }
}