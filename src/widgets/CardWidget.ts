// A card widget used in deck building games
import * as THREE from "three";
import { IWidgetProps, ICard, RarityColors, CardStyles } from "../Types";
import { Widget } from "../Widget";
import { Level } from "../Level";

export interface ICardWidgetProps extends IWidgetProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  card: ICard;
  isShopItem?: boolean;
  getEnergy?: () => number;
  onUse: (newEnergy: number, widget: CardWidget) => void;
}

export class CardWidget extends Widget<
  Phaser.GameObjects.Container,
  ICardWidgetProps
> {
  originalPosition: THREE.Vector2 | null = null;
  level: Level;
  costText: Phaser.GameObjects.Text | null = null;
  constructor(level: Level, props: ICardWidgetProps) {
    super(level, props);
    this.originalPosition = new THREE.Vector2(props.x, props.y);
    this.level = level;
    const scene = this.level.getGameScene();
    const {
      x,
      y,
      card,
      width = 150,
      height = 200,
    } = this.props as ICardWidgetProps;

    const background = scene.add
      .rectangle(0, 0, width, height, 0xffffff)
      .setOrigin(0.5, 0.5)
      .setRounded(16)
      .setStrokeStyle(4, 0xffffff);
    const titleText = scene.add
      .text(0, -height / 2 + 10, card.title, { 
        fontFamily: "Segoe UI", 
        fontSize: "14px", 
        color: "#ffffffff", 
        fontStyle: "bold", 
        stroke: "#000000", 
        strokeThickness: 2
      })
      .setOrigin(0.5, 0);
    const descriptionText = scene.add
      .text(-width / 2 + 10, -height / 2 + 50, card.description, {
        fontFamily: "Segoe UI",
        fontSize: "14px",
        color: "#ffffffff",
        stroke: "#000000",
        strokeThickness: 2,
        fontStyle: "bold",
        wordWrap: { width: width - 20 },
      })
      .setOrigin(0, 0);
    const effectDescription = scene.add
      .text(0, -height / 2 + 70, card.effectDescription, {
        fontFamily: "Segoe UI",
        fontSize: "12px",
        color: "#ffffffff",
        stroke: "#000000",
        strokeThickness: 2,
        fontStyle: "bold",
        wordWrap: { width: width - 20 },
      })
      .setOrigin(0.5, 0);
    const energyCostIcon = scene.add.image(-width / 2 + 20, height / 2 - 30, "energy").setOrigin(0.5, 0.5).setScale(0.5);
    this.costText = scene.add
      .text(-width / 2 + 50, height / 2 - 40, `${card.cost}`, {
        fontFamily: "Segoe UI",
        fontSize: "18px",
        color: "#ffffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0);
    const container = scene.add
      .container(x, y, [background, titleText, descriptionText, effectDescription, this.costText, energyCostIcon])
      .setScrollFactor(0);

    let rarityColor = RarityColors[card.rarity];

    background.postFX.addGradient(rarityColor, rarityColor - 0x222222, 1);
    background.postFX.addBloom(rarityColor, 1.0, 1.0, 0.05, 1.0, 1.0);

    let isFoil = false;
    if (card.type === CardStyles.FOIL) {
      isFoil = true;
    }
    if (isFoil) {
      background.postFX.addShine(0.5, 0.5, 1);
    }

    this.gameObject = container;

    // Enable interactivity
    container.setSize(width, height);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
      draggable: true,
    });
    container.on("drag", (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      // Drag handling logic can be added here
      container.setDepth(1000); // Bring to front while dragging
      // container.x = dragX;
      // container.y = dragY;
      // sync position with a bit of drag effect
      container.x += (dragX - container.x) * 0.3;
      container.y += (dragY - container.y) * 0.3;
      // add a little sway effect
      container.rotation = (dragX - pointer.downX) * 0.001;
      scene.tweens.killTweensOf(container); // Stop any ongoing tweens
    });
    container.on("dragend", (pointer: Phaser.Input.Pointer) => {
      console.log("Card drag ended");
      container.setDepth(0);
      if (this.props.getEnergy) {
        const energy = this.props.getEnergy();
        if (energy! >= this.props.card.cost) {
          // Use the card
          scene.tweens.killTweensOf(container);
          const newEnergy = energy - this.props.card.cost;
          this.props.onUse(newEnergy, this);
        }
      }
    });

    this.setupInput();
  }

  update(): void {
    // Optional update logic for the card widget

  }
}
