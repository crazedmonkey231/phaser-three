import { GameScene } from "../GameScene";
import { Level } from "../Level";
import { IWidgetProps } from "../Types";
import { Widget } from "../Widget";
import { Thing } from "../Thing"; 

export interface IObjectTrayItem {
  name: string;
  type: string;
  icon: string;
  class: typeof Thing;
}

export interface IObjectTrayProps extends IWidgetProps {
  items?: IObjectTrayItem[];
}

/** ObjectTray class for managing objects in the editor
 * Holds buttons for dragging configured objects into the level.
 */
export class ObjectTray extends Widget<Phaser.GameObjects.Container, IObjectTrayProps> {
  constructor(level: Level, props: IObjectTrayProps) {
    super(level, props);
  }

  create(scene: GameScene): void {
    super.create(scene);
    const width = this.level.gameScene.game.canvas.width as number;
    const height = this.level.gameScene.game.canvas.height as number;
    const containerHeight = 100;
    this.props.x = 0;
    this.props.y = height - containerHeight;
    this.gameObject = scene.add.container(this.props.x, this.props.y).setScrollFactor(0);
    const background = scene.add.rectangle(0, 0, width, containerHeight, 0x222222, 0.8).setOrigin(0, 0);
    this.gameObject.add(background);
    // Add buttons for each item
    if (this.props.items) {
      const buttonSize = 64;
      this.props.items.forEach((item, index) => {
        const x = 50 + index * (buttonSize + 10);
        const y = containerHeight / 2;
        const button = scene.add.image(x, y, item.icon).setOrigin(0, 0.5).setInteractive();
        button.setOrigin(0.5, 0.5);
        button.setDisplaySize(buttonSize, buttonSize);
        button.on('pointerover', () => {
          button.setScale(1.25);
        });
        button.on('pointerout', () => {
          button.setScale(1);
        });
        button.on('pointerdown', () => {
          // Logic to add the item to the level goes here
          const newThing = new item.class(this.level, item.name, item.type);
          newThing.group.position.set(0, 0, 0); // Set initial position
          this.level.addThing(newThing);
          button.setTintFill(0xffffff);
          this.level.gameScene.tweens.add({
            targets: button,
            rotation: -0.25,
            duration: 100,
            ease: 'Cubic.easeOut',
            yoyo: true,
            onComplete: () => {
              button.clearTint();
            }
          });
        });
        this.gameObject?.add(button);
      });
    }
  }

  dispose() {
    super.dispose();
    // Additional disposal logic for the ObjectTray can go here
  }
}