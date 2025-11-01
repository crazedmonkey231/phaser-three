import * as THREE from "three";
import { ICard } from "../Types";
import { CardWidget } from "../widgets/CardWidget";
import { Level } from "../Level";

export interface IHandSlot {
  position: THREE.Vector2;
  card: CardWidget | null;
}

/** Deck class, manages the card deck, hand, and discard pile. */
export class Deck {
  cards: ICard[];
  hand: IHandSlot[] = [];
  discardPile: ICard[] = [];
  handSize: number = 5;
  energy: number = 3;
  deckPosition: THREE.Vector2 = new THREE.Vector2(900, 320);
  discardPosition: THREE.Vector2 = new THREE.Vector2(900, 230);
  cardStartPosition: THREE.Vector2 = new THREE.Vector2(150, 605);
  cardSize: THREE.Vector2 = new THREE.Vector2(100, 140);
  private created: boolean = false;
  constructor(
    cards: ICard[],
    handSize: number = 5,
    energy: number = 3,
    deckPosition?: THREE.Vector2,
    discardPosition?: THREE.Vector2,
    cardStartPosition?: THREE.Vector2,
    cardSize?: THREE.Vector2
  ) {
    this.cards = cards;
    this.handSize = handSize;
    this.energy = energy;
    this.deckPosition = deckPosition || this.deckPosition;
    this.discardPosition = discardPosition || this.discardPosition;
    this.cardStartPosition = cardStartPosition || this.cardStartPosition;
    this.cardSize = cardSize || this.cardSize;
    // create hand slots
    for (let i = 0; i < this.handSize; i++) {
      const x = this.cardStartPosition.x + i * (this.cardSize.x + 10);
      const y = this.cardStartPosition.y;
      this.hand.push({ position: new THREE.Vector2(x, y), card: null });
    }
  }

  clearDeck(): void {
    this.discardHand();
    this.cards = [];
    this.discardPile = [];
    this.created = false;
  }

  createDeck(): void {
    if (this.created) {
      this.shuffle();
      return;
    }
    this.cards = [];
    this.shuffle();
    this.created = true;
  }

  reshuffle(): void {
    this.cards = this.cards.concat(this.discardPile);
    this.discardPile = [];
    this.shuffle();
  }

  drawCards(count: number, level: Level): void {
    for (let i = 0; i < count; i++) {
      if (this.hand.every((slot) => slot.card !== null)) {
        console.log("Hand is full, cannot draw more cards.");
        return;
      }
      if (this.cards.length === 0) {
        this.reshuffle();
      }
      const card = this.draw();
      if (card) {
        console.log(`Drew card: ${card.title}`);
        const emptySlot = this.hand.find((slot) => slot.card === null);
        if (emptySlot) {
          emptySlot.card = this.createCardWidget(
            card,
            emptySlot.position.x,
            emptySlot.position.y,
            this.hand.indexOf(emptySlot),
            level
          );
        }
      }
    }
  }

  draw(): ICard {
    if (this.cards.length === 0) {
      this.reshuffle();
    }
    return this.cards.pop() as ICard;
  }

  discard(card: CardWidget): void {
    if (card) {
      card.gameObject!.disableInteractive();
      this.hand.forEach((slot) => {
        if (slot.card === card) {
          slot.card = null;
        }
      });
      this.discardPile.push(card.props.card);
      console.log(`Discarded ${card.props.card.title}`);
      card.dispose();
    }
  }

  discardHand(): void {
    this.hand.forEach((slot) => {
      if (slot.card) {
        this.discard(slot.card);
      }
    });
  }

  drawHand(level: Level): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.drawCards(this.handSize, level);
        resolve();
      }, 500);
    });
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  updateAllCards(): void {
    this.hand.forEach((slot) => {
      slot.card?.update();
    });
  }

  createCardWidget(
    card: ICard,
    x: number,
    y: number,
    idx: number,
    level: Level
  ): CardWidget {
    const newCard = new CardWidget(level, {
      name: card.title,
      x: this.deckPosition.x,
      y: this.deckPosition.y,
      card: card,
      getEnergy: () => this.energy,
      onUse: (newEnergy: number, widget: CardWidget) => {
        level.audioMgr.playTrack("button_click");
        this.energy = newEnergy;
        const card = widget.props.card;
        const effect = card.effect;
        this.discard(widget);
        this.shiftCardPositions(level, idx);
        effect.applyEffect(level);
      },
      onHover(widget) {
        level.audioMgr.playTrack("button_hover");
        level.gameScene.tweens.chain({
          targets: widget.gameObject,
          loops: -1,
          tweens: [
            {
              scale: 1.1,
              duration: 60,
              ease: "Power2",
            },
            {
              rotation: 0.05,
              duration: 60,
              ease: "Bounce.easeInOut",
              yoyo: true,
            },
            {
              rotation: -0.05,
              duration: 60,
              ease: "Bounce.easeInOut",
              yoyo: true,
            },
          ],
        });
      },
      onClick(widget) {
        level.audioMgr.playTrack("button_click");
      },
      onOut(widget) {
        level.gameScene.tweens.add({
          targets: widget.gameObject,
          scale: 1,
          duration: 200,
          ease: "Power2",
        });
      },
    });
    level.gameScene.tweens.chain({
      targets: newCard.gameObject,
      loops: -1,
      tweens: [
        {
          targets: newCard.gameObject,
          x: x,
          y: y,
          duration: 100 + idx * 100,
          ease: "Quartic.Out",
          onStart: () => {
            if (newCard.gameObject) {
              newCard.gameObject.setInteractive(false);
            }
          },
          onComplete: () => {
            level.audioMgr.playTrack("button_click");
            newCard.originalPosition = new THREE.Vector2(x, y);
          },
        },
        {
          rotation: 0.2,
          duration: 30 + idx * 20,
          ease: "Bounce.easeInOut",
          yoyo: true,
        },
        {
          rotation: -0.2,
          duration: 30 + idx * 20,
          ease: "Bounce.easeInOut",
          yoyo: true,
        },
        {
          scale: 1.1,
          duration: 30 + idx * 20,
          ease: "Bounce.easeInOut",
          yoyo: true,
          onComplete: () => {
            if (newCard.gameObject) {
              try {
                newCard.gameObject.setInteractive(true);
              } catch (error) {
                console.error("Error setting interactive:", error);
              }
            }
          },
        },
      ],
    });
    return newCard;
  }

  shiftCardPositions(level: Level, startIdx: number): void {
    // shift cards to the left if there is an empty slot
    for (let i = startIdx; i < this.hand.length - 1; i++) {
      if (this.hand[i].card === null && this.hand[i + 1].card !== null) {
        const cardToShift = this.hand[i + 1].card!;
        this.hand[i]!.card = cardToShift;
        this.hand[i + 1]!.card = null;
        // Animate the card to the new position
        const targetX = this.hand[i].position.x;
        const targetY = this.hand[i].position.y;
        cardToShift.originalPosition = new THREE.Vector2(targetX, targetY);
        level.gameScene.tweens.chain({
          targets: cardToShift.gameObject,
          loops: -1,
          tweens: [
            {
              x: targetX,
              y: targetY,
              duration: 100,
              ease: "Power2",
            },
            {
              rotation: 0.05,
              duration: 80 + i * 20,
              ease: "Bounce.easeInOut",
              yoyo: true,
            },
            {
              rotation: -0.05,
              duration: 80 + i * 20,
              ease: "Bounce.easeInOut",
              yoyo: true,
            },
          ],
        });
      }
    }
  }
}
