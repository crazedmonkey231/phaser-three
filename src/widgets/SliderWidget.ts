// Slider widget for adjusting values
import { GameScene } from "../GameScene";
import { Level } from "../Level";
import { IWidgetProps } from "../Types";
import { Widget } from "../Widget";
import {
  createSlider,
  IStyle,
  ISlider,
  ISliderThumbStyle,
  ISliderTrackStyle,
} from "../WidgetUtils";

export interface ISliderWidgetProps extends IWidgetProps {
  label: string;
  x: number;
  y: number;
  width: number;
  value: number;
  min: number;
  max: number;
  step: number;
  trackStyle: ISliderTrackStyle;
  thumbStyle: ISliderThumbStyle;
  hoverStyle: IStyle;
  clickStyle: IStyle;
  onChange: (value: number) => void;
  onHover?: () => void;
  onOut?: () => void;
  onClick?: () => void;
  onClickEnd?: () => void;
}

export class SliderWidget extends Widget<
  Phaser.GameObjects.Container,
  ISliderWidgetProps
> {
  private slider: ISlider | null = null;
  private labelText: Phaser.GameObjects.Text | null = null;
  constructor(level: Level, props: ISliderWidgetProps) {
    super(level, props);
  }

  getSlider(): ISlider | null {
    return this.slider;
  }

  create(scene: GameScene): void {
    const {
      x,
      y,
      width,
      value,
      label,
      min,
      max,
      step,
      trackStyle,
      thumbStyle,
      hoverStyle,
      clickStyle,
      onChange,
    } = this.props;
    this.slider = createSlider(this.level.gameScene, {
      label: label,
      x: x,
      y: y,
      width: width,
      value: value,
      min: min,
      max: max,
      step: step,
      trackStyle: trackStyle,
      thumbStyle: thumbStyle,
      hoverStyle: hoverStyle,
      clickStyle: clickStyle,
      onChange: onChange,
      onHover: this.props.onHover,
      onOut: this.props.onOut,
      onClick: this.props.onClick,
      onClickEnd: this.props.onClickEnd,
    });
    this.labelText = scene.add
      .text(x, y - 35, label, { 
        fontSize: "16px", 
        fontFamily: "Arial",
        color: "#000000ff"
      })
      .setStroke("#ffffffff", 2)
      .setOrigin(0);

    this.gameObject = scene.add.container(0, 0, [
      this.slider.track,
      this.slider.thumb,
      this.labelText,
    ]);
  }

  setText(newText: string): void {
    if (this.labelText) {
      this.labelText.setText(newText);
    }
  }

  setupInput(): void {}
}
