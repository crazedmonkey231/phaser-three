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
  private thumb: Phaser.GameObjects.Arc | undefined;
  constructor(level: Level, props: ISliderWidgetProps) {
    super(level, props);
  }

  create(scene: GameScene): void {
    const { x, y, width } = this.props;
    const trackHeight = 8;
    const thumbRadius = 12;
    this.gameObject = scene.add.container(x, y).setScrollFactor(0);

    const text = scene.add.text(width / 2, -25, this.props.text, { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5).setStroke('#000000', 4);
    const name = scene.add.text(width / 2, 32, this.props.name, { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5).setStroke('#000000', 4);
    const track = scene.add.rectangle(0, 0, width, trackHeight, 0x888888).setOrigin(0, 0.5);
    this.thumb = scene.add.circle(0, 0, thumbRadius, 0xffffff).setStrokeStyle(2, 0x000000).setOrigin(0.5);
    // const thumb = scene.add.image(0, 0, 'add').setDisplaySize(thumbRadius * 4, thumbRadius * 4).setOrigin(0.5);
    this.gameObject.add([text, name, track, this.thumb]);
  }

  setupInput(): void {
    if (!this.gameObject || !this.thumb) return;
    const { width, min, max, step, initialValue, onChange } = this.props;
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
    this.thumb.x = valueToPosition(currentValue);
    this.thumb.setInteractive({
      draggable: true,
      useHandCursor: true,
      hitArea: new Phaser.Geom.Circle(0, 0, 20)
    });

    this.thumb.on('dragstart', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      // optional: add visual feedback for drag start
    });

    this.thumb.on('dragend', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      // optional: add visual feedback for drag end
    });

    this.thumb.on('pointerover', () => {
      this.thumb!.setFillStyle(0xdddddd);
      this.thumb!.setScale(1.1);
      if (this.props.onHover) {
        this.props.onHover(this);
      }
    });

    this.thumb.on('pointerout', () => {
      this.thumb!.setFillStyle(0xffffff);
      this.thumb!.setScale(1);
      if (this.props.onOut) {
        this.props.onOut(this);
      }
    });

    this.thumb.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      dragX = Phaser.Math.Clamp(dragX, 0, width);
      this.thumb!.x = dragX;
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