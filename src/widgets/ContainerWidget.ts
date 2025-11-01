// Container widget for holding other widgets
import { GameScene } from '../GameScene';
import { Level } from '../Level';
import { IWidgetProps } from '../Types';
import { Widget } from '../Widget';


// Container widget for holding other widgets
export class ContainerWidget extends Widget<Phaser.GameObjects.Container, IWidgetProps> {
  constructor(level: Level, props: IWidgetProps) {
    super(level, props);
  }

  create(scene: GameScene): void {
    const { x = 0, y = 0 } = this.props;
    this.gameObject = scene.add.container(x, y).setScrollFactor(0);
  }

  dispose() {
    super.dispose();
  }
}
