import { Level } from "../Level";
import { TextWidget, ITextWidgetProps } from "./TextWidget";

// A widget to display FPS
export class FpsWidget extends TextWidget {
  constructor(level: Level, props: ITextWidgetProps) {
    super(level, props);
  }

  update(time: number, dt: number, args: any): void {
    if (!this.gameObject || !this.level) return;
    super.update(time, dt, args);
    this.setText(`FPS: ${this.level.getGameScene().game.loop.actualFps} `);
  }
}