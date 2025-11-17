import { GameScene } from "./GameScene";

// Utility functions for creating and managing UI widgets in Phaser

export interface IStyle {
  fillColor?: number;
  strokeColor?: number;
  strokeWidth?: number;
  scale?: number;
}

export interface ITextStyle extends Phaser.Types.GameObjects.Text.TextStyle {}

export interface IButtonStyle extends IStyle {
  cornerRadius?: number;
  pixelPerfect?: boolean;
}

// --
// -- Slider Widget --
// --

/** Track style options for the slider */
export interface ISliderTrackStyle extends IStyle {
  height?: number;
}

/** Thumb style options for the slider */
export interface ISliderThumbStyle extends IStyle {
  type: "circle" | "rectangle";
  radius?: number;
  width?: number;
  height?: number;
}

/** Parameters for creating a slider widget */
export interface ISliderParams {
  label: string;
  x: number;
  y: number;
  width: number;
  value: number;
  min: number;
  max: number;
  step: number;
  trackStyle?: ISliderTrackStyle;
  thumbStyle?: ISliderThumbStyle;
  hoverStyle?: IStyle;
  clickStyle?: IStyle;
  onStart?: (value: number) => void;
  onChange: (value: number) => void;
  onOut?: (value: number) => void;
  onClick?: (value: number) => void;
  onClickEnd?: (value: number) => void;
}

/** Interface representing a slider widget */
export interface ISlider {
  track: Phaser.GameObjects.Rectangle;
  thumb: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
  setValue(value: number): void;
  dispose(): void;
}

/** Create a slider widget in the given scene with the specified parameters */
export function createSlider(
  scene: GameScene,
  sliderParams: ISliderParams
): ISlider {
  const {
    x,
    y,
    width,
    value,
    min,
    max,
    step,
    trackStyle,
    thumbStyle,
    hoverStyle,
    clickStyle,
    onStart,
    onChange,
    onOut: onEnd,
    onClick,
    onClickEnd,
  } = sliderParams;

  const trackHeight = trackStyle?.height ?? 8;
  const trackColor = trackStyle?.fillColor ?? 0x888888;
  const trackStrokeColor = trackStyle?.strokeColor ?? 0x000000;
  const trackStrokeWidth = trackStyle?.strokeWidth ?? 1;

  const thumbRadius = thumbStyle?.radius ?? 12;
  const thumbWidth = thumbStyle?.width ?? thumbRadius * 2;
  const thumbHeight = thumbStyle?.height ?? thumbRadius * 2;
  const thumbColor = thumbStyle?.fillColor ?? 0xffffff;
  const thumbStrokeColor = thumbStyle?.strokeColor ?? 0x000000;
  const thumbStrokeWidth = thumbStyle?.strokeWidth ?? 2;

  const track = scene.add
    .rectangle(x, y, width, trackHeight, trackColor)
    .setStrokeStyle(trackStrokeWidth, trackStrokeColor)
    .setOrigin(0, 0.5)
    .setScrollFactor(0);

  let thumb: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
  if (thumbStyle?.type === "rectangle") {
    thumb = scene.add
      .rectangle(x, y, thumbWidth, thumbHeight, thumbColor)
      .setStrokeStyle(thumbStrokeWidth, thumbStrokeColor)
      .setOrigin(0.5)
      .setScrollFactor(0);
  } else {
    thumb = scene.add
      .circle(x, y, thumbRadius, thumbColor)
      .setStrokeStyle(thumbStrokeWidth, thumbStrokeColor)
      .setOrigin(0.5)
      .setScrollFactor(0);
  }

  const slider: ISlider = {
    track,
    thumb,
    setValue(value: number) {
      const clampedValue = Phaser.Math.Clamp(value, min, max);
      const steppedValue = min + Math.round((clampedValue - min) / step) * step;
      const clampedSteppedValue = Phaser.Math.Clamp(steppedValue, min, max);
      const newX = ((clampedSteppedValue - min) / (max - min)) * width;
      thumb.x = x + newX;
    },
    dispose() {
      track.destroy();
      thumb.destroy();
    },
  };

  slider.setValue(value);

  thumb.setInteractive({ draggable: true });

  if (onStart) {
    thumb.on("dragstart", () => {
      onStart(value);
    });
  }

  if (onEnd) {
    thumb.on("dragend", () => {
      onEnd(value);
    });
  }

  thumb.on("drag", (pointer: Phaser.Input.Pointer, dragX: number) => {
    const localX = Phaser.Math.Clamp(dragX - x, 0, width);
    const newValue = min + (localX / width) * (max - min);
    slider.setValue(newValue);
    onChange(newValue);
  });

  thumb.on("pointerover", () => {
    if (hoverStyle?.fillColor !== undefined) {
      thumb.setFillStyle(hoverStyle.fillColor);
    }
    if (hoverStyle?.scale !== undefined) {
      thumb.setScale(hoverStyle.scale);
    }
  });

  thumb.on("pointerout", () => {
    thumb.setFillStyle(thumbColor);
    thumb.setScale(1);
  });

  thumb.on("pointerdown", () => {
    if (clickStyle?.fillColor !== undefined) {
      thumb.setFillStyle(clickStyle.fillColor);
    }
    if (clickStyle?.scale !== undefined) {
      thumb.setScale(clickStyle.scale);
    }
    if (onClick) {
      onClick(value);
    }
  });

  thumb.on("pointerup", () => {
    thumb.setFillStyle(thumbColor);
    thumb.setScale(1);
    if (onClickEnd) {
      onClickEnd(value);
    }
  });

  return slider;
}

// --
// -- Button Widget --
// --

/** Button widget parameters */
export interface IButtonParams {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style?: IButtonStyle;
  hoverStyle?: IStyle;
  clickStyle?: IStyle;
  textStyle?: ITextStyle;
  onHover?: () => void;
  onOut?: () => void;
  onClick?: () => void;
  onClickEnd?: () => void;
}

export interface IButton {
  dispose(): void;
}

/** Button widget interface */
export interface ITextButton extends IButton {
  text: Phaser.GameObjects.Text;
  background: Phaser.GameObjects.Rectangle;
  setText(newText: string): void;
}

/** Create an image button widget in the given scene with the specified parameters */
export interface IImageButton extends IButton {
  image: Phaser.GameObjects.Image;
  setTexture(key: string): void;
}

/** Utility function to create a button widget */
export function createTextButton(
  scene: GameScene,
  buttonParams: IButtonParams
): ITextButton {
  const {
    label,
    x,
    y,
    width,
    height,
    style,
    hoverStyle,
    clickStyle,
    textStyle,
    onHover,
    onOut: onHoverEnd,
    onClick,
    onClickEnd,
  } = buttonParams;

  const fillColor = style?.fillColor ?? 0x007bff;
  const strokeColor = style?.strokeColor ?? 0x0056b3;
  const strokeWidth = style?.strokeWidth ?? 2;
  const cornerRadius = style?.cornerRadius ?? 4;
  const pixelPerfect = style?.pixelPerfect ?? false;

  const background = scene.add
    .rectangle(x, y, width, height, fillColor)
    .setStrokeStyle(strokeWidth, strokeColor)
    .setRounded(cornerRadius)
    .setOrigin(0.5)
    .setScrollFactor(0);

  const text = scene.add
    .text(x, y, label, textStyle)
    .setOrigin(0.5)
    .setScrollFactor(0);

  const button: ITextButton = {
    text,
    background,
    setText(newText: string) {
      text.setText(newText);
    },
    dispose() {
      background.destroy();
      text.destroy();
    },
  };

  background.setInteractive({ pixelPerfect: pixelPerfect });


  background.on("pointerover", () => {
    if (hoverStyle?.fillColor !== undefined) {
      background.setFillStyle(hoverStyle.fillColor);
    }
    if (hoverStyle?.scale !== undefined) {
      background.setScale(hoverStyle.scale);
    }
    if (onHover) {
      onHover();
    }
  });

  background.on("pointerout", () => {
    background.setFillStyle(fillColor);
    background.setScale(1);
    if (onHoverEnd) {
      onHoverEnd();
    }
  });


  background.on("pointerdown", () => {
    if (clickStyle?.fillColor !== undefined) {
      background.setFillStyle(clickStyle.fillColor);
    }
    if (clickStyle?.scale !== undefined) {
      background.setScale(clickStyle.scale);
    }
    if (onClick) {
      onClick();
    }
  });

  background.on("pointerup", () => {
    background.setFillStyle(fillColor);
    background.setScale(1);
    if (onClickEnd) {
      onClickEnd();
    }
  });

  return button;
}

export function createImageButton(
  scene: GameScene,
  texture: string,
  buttonParams: IButtonParams
): IImageButton {
  const {
    x,
    y,
    width,
    height,
    style,
    hoverStyle,
    clickStyle,
    onHover,
    onOut: onHoverEnd,
    onClick,
    onClickEnd,
  } = buttonParams;

  const image = scene.add
    .image(x, y, texture)
    .setDisplaySize(width, height)
    .setOrigin(0.5)
    .setScrollFactor(0);

  const button: IImageButton = {
    image,
    setTexture(key: string) {
      image.setTexture(key);
    },
    dispose() {
      image.destroy();
    },
  };
  
  image.setInteractive({ pixelPerfect: style?.pixelPerfect ?? false });

  if (hoverStyle) {
    image.on("pointerover", () => {
      if (hoverStyle.fillColor !== undefined) {
        image.setTint(hoverStyle.fillColor);
      }
      if (hoverStyle.scale !== undefined) {
        image.setScale(hoverStyle.scale);
      }
      if (onHover) {
        onHover();
      }
    });

    image.on("pointerout", () => {
      image.clearTint();
      image.setScale(1);
      if (onHoverEnd) {
        onHoverEnd();
      }
    });
  }

  if (clickStyle) {
    image.on("pointerdown", () => {
      if (clickStyle.fillColor !== undefined) {
        image.setTint(clickStyle.fillColor);
      }
      if (clickStyle.scale !== undefined) {
        image.setScale(clickStyle.scale);
      }
      if (onClick) {
        onClick();
      }
    });

    image.on("pointerup", () => {
      image.clearTint();
      image.setScale(1);
      if (onClickEnd) {
        onClickEnd();
      }
    });
  }

  return button;
}
