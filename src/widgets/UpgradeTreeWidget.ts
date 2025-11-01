// Upgrade tree widget for displaying and managing upgrades
import { GameScene } from '../GameScene';
import { Level } from '../Level';
import { IWidgetProps } from '../Types';
import { Widget } from '../Widget';

// Example usage:
// let upgradePoints = 5000;
// const nodes = [
//   {
//     id: "upgrade1",
//     name: "Upgrade 1",
//     description: "Description for Upgrade 1",
//     cost: 100,
//     prerequisites: [],
//     unlocked: false,
//     x: 10,
//     y: 100,
//     tier: 1,
//   },
//   {
//     id: "upgrade2",
//     name: "Upgrade 2",
//     description: "Description for Upgrade 2",
//     cost: 200,
//     prerequisites: [],
//     unlocked: false,
//     x: 10,
//     y: 200,
//     tier: 1,
//   },
//   {
//     id: "upgrade3",
//     name: "Upgrade 3",
//     description: "Description for Upgrade 3",
//     cost: 300,
//     prerequisites: ["upgrade1", "upgrade2"],
//     unlocked: false,
//     x: 200,
//     y: 150,
//     tier: 2,
//   },
// ];
// widgets.set(
//   "upgrade tree",
//   new UpgradeTreeWidget(baseScene, {
//     x: 10,
//     y: 100,
//     getUpgradePoints: () => upgradePoints,
//     nodes: nodes,
//     onPurchase: (newPoints, upgradeNode) => {
//       if (upgradeNode) {
//         console.log(`Purchased: ${upgradeNode.name}`);
//         upgradePoints = newPoints;
//         console.log(`Remaining Upgrade Points: ${upgradePoints}`);
//         console.log("Current Nodes State:", nodes);
//       }
//     },
//   })
// );

export interface UpgradeNode {
  x: number;
  y: number;
  id: string;
  name: string;
  description: string;
  cost: number;
  tier: number;
  prerequisites: string[];
  unlocked: boolean;
}

export interface IUpgradeTreeWidgetProps extends IWidgetProps {
  nodes: UpgradeNode[];
  getUpgradePoints: () => number;
  onPurchase: (newPoints: number, upgradeNode: UpgradeNode | null) => void;
}

// Upgrade tree widget for displaying and managing upgrades
export class UpgradeTreeWidget extends Widget<Phaser.GameObjects.Container, IUpgradeTreeWidgetProps> {
  constructor(level: Level, props: IUpgradeTreeWidgetProps) {
    super(level, props);

  }

  create(scene: GameScene): void {
    const lines: Map<string, Phaser.GameObjects.Line[]> = new Map();
    const { x = 0, y = 0 } = this.props;
    const container = scene.add.container(x, y).setScrollFactor(0);
    this.gameObject = container;

    // Draw prerequisite lines first
    this.props.nodes.forEach(node => {
      node.prerequisites.forEach((prereqId, index) => {
        // draw lines to prerequisites
        const prereqNode = this.props.nodes.find(n => n.id === prereqId);
        if (prereqNode) {
          const color = node.unlocked ? 0x00ff00 : 0xff0000;
          const line = scene.add.line(0, 0, node.x + 50, node.y + 10, prereqNode.x + 50, prereqNode.y + 10, color).setOrigin(0, 0);
          line.setLineWidth(3);
          container.add(line);
          lines.set(node.id, [...(lines.get(node.id) || []), line]);
        }
      });
    });

    // Draw nodes on top of lines
    this.props.nodes.forEach(node => {
      // Create visual representation for each upgrade node
      const nodeText = scene.add.text(node.x, node.y, node.name, { font: '16px Arial', color: node.unlocked ? '#00ff00' : '#ff0000' });
      nodeText.setInteractive();

      nodeText.on('pointerdown', () => {
        const points = this.props.getUpgradePoints();
        const hasPrerequisites = node.prerequisites.every(prereqId => {
          const prereqNode = this.props.nodes.find(n => n.id === prereqId);
          return prereqNode ? prereqNode.unlocked : false;
        });
        if (hasPrerequisites && !node.unlocked && points >= node.cost) {
          node.unlocked = true;
          console.log(`Upgrade purchased: ${node.name}, ${lines.get(node.id)?.length}`);
          lines.get(node.id)?.forEach(line => {
            line.setStrokeStyle(5, 0x00ff00);
          });
          nodeText.setColor('#00ff00');
          this.props.onPurchase(points - node.cost, node);
        } else {
          this.props.onPurchase(points, null);
        }
      });

      container.add(nodeText);
      const nodeDescription = scene.add.text(node.x, node.y + 20, node.description, { font: '12px Arial', color: '#ffffff' });
      container.add(nodeDescription);
      const nodeCost = scene.add.text(node.x, node.y + 40, `Cost: ${node.cost}`, { font: '12px Arial', color: '#ffffff' });
      container.add(nodeCost);
      const nodeTier = scene.add.text(node.x, node.y + 60, `Tier: ${node.tier}`, { font: '12px Arial', color: '#ffffff' });
      container.add(nodeTier);

    });
  }

  dispose() {
    super.dispose();
  }
}