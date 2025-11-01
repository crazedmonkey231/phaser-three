// Shop widget
import { GameScene } from '../GameScene';
import { Level } from '../Level';
import { Item, IWidgetProps } from '../Types';
import { Widget } from '../Widget';

// Props for the ShopWidget
export interface IShopWidgetProps extends IWidgetProps {
  items: Array<Item>;
  choices: number;
  x: number;
  y: number;
  getGold?: () => number;
  onPurchase?: (gold: number, item: Item) => void;
}

// A simple shop widget displaying items for sale
export class ShopWidget extends Widget<Phaser.GameObjects.Container, IShopWidgetProps> {
  constructor(level: Level, props: IShopWidgetProps) {
    super(level, props);
  }

  create(scene: GameScene): void {
    const { items, x, y, choices, getGold, onPurchase } = this.props as IShopWidgetProps;
    const container = scene.add.container(x, y);
    let offsetY = 0;
    const randomItems = Phaser.Utils.Array.Shuffle(items).slice(0, choices);
    randomItems.forEach(item => {
      const icon = scene.add.image(0, offsetY, item.icon).setOrigin(0, 0);
      const text = scene.add.text(50, offsetY, `${item.name}: $${item.price}`, { fontSize: '16px', color: '#fff' });
      container.add(icon);
      container.add(text);
      offsetY += 30;
      icon.setInteractive().on('pointerdown', () => {
        if (getGold) {
          const gold = getGold();
          if (gold >= item.price) {
            // Deduct gold and purchase item
            console.log(`Purchased item: ${item.name} for $${item.price}`);
            icon.setInteractive(false);
            icon.destroy();
            text.destroy();
            if (onPurchase) {
              onPurchase(gold - item.price, item);
            }
            if (container.length === 0) {
              this.dispose();
              return;
            }
          } else {
            console.log(`Not enough gold to purchase: ${item.name}`);
          }
        }
      });
    });
    this.gameObject = container;
  }

  dispose(): void {
    super.dispose();
  }
}