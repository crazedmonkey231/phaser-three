import * as THREE from 'three';
import { Capsule, Octree } from 'three/examples/jsm/Addons.js';
import { Level } from './Level';
import { GameScene } from './GameScene';
import { NONE } from 'phaser';

/** Service interface */
export interface IService {
  name: string;
  update(time: number, delta: number, args: any): void;
  dispose(): void;
  toJsonObject?(): any;
  fromJsonObject?(json: any): void;
}

/** Transform interface */
export interface ITransform {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

/** XYZ interface */
export interface XYZ {
  x: number;
  y: number;
  z: number;
}

/** Inventory item interface */
export interface Item {
  name: string;
  price: number;
  icon: string;
}

/** Inventory interface */
export interface Inventory {
  items: Array<Item>;
}

/** Gameplay tags for entities */
export const GameplayTags = {
  Player: 'player',
  Enemy: 'enemy',
  NPC: 'npc',
  Collectible: 'collectible',
  Obstacle: 'obstacle',
  Interactive: 'interactive',
  Projectile: 'projectile',
  Ally: 'ally',
  Boss: 'boss',
  Environment: 'environment',
} as const;

/** Type representing all possible gameplay tags */
export type GameplayTag = typeof GameplayTags[keyof typeof GameplayTags];

/** Damage types enumeration */
export const DamageTypes = {
  Physical: "physical",
  Fire: "fire",
  Ice: "ice",
  Lightning: "lightning",
};

/** Damage interface */
export interface IDamage {
  amount: number;
  type: keyof typeof DamageTypes;
  source?: IThing;
}

/** Supported collider shapes */
export type ColliderShape = THREE.Box3 | THREE.Sphere | Capsule;

/** Collider interface for handling collisions between things */
export interface ICollisionHandler {
  name: string;
  thingsA: Set<IThing>;
  thingsB: Set<IThing>;
  onCollision: (thingA: IThing, thingB: IThing) => void; // Callback when a bounding box collision is detected
}

/** Interface for all things in the game */
export interface IThing extends IService {
  level: Level;
  name: string;
  type: string;
  group: THREE.Group;
  alive: boolean;
  timeAlive: number;
  gameplayTags: Set<GameplayTag>;
  tags: Set<string>;
  collider: ColliderShape | undefined;
  velocity: THREE.Vector3 | undefined;
  speed: number | undefined;
  health: number | undefined;
  data: any;
  create(): void;
  respawn(position: THREE.Vector3): void;
  update(time: number, dt: number, args: any): void;
  addTag(tag: string): void;
  addGameplayTag(tag: GameplayTag): void;
  removeTag(tag: string): void;
  removeGameplayTag(tag: GameplayTag): void;
  kill(dispose: boolean): void;
  dispose(): void;
  toJsonObject(): any;
  // optional
  onUpdate?(time: number, dt: number, args: any): void;
  syncCollider?(): void;
  resolveCollision?(octree: Octree): void;
  damage?(damage: IDamage): void;
  interact?(thing: IThing): void;
}

/** Widget type with generic props */
export type WidgetType = IWidget<Phaser.GameObjects.GameObject, IWidgetProps>;

/** Widget props interface */
export interface IWidgetProps {
  name: string;
  x?: number;
  y?: number;
  onClick?: (widget: WidgetType) => void;
  onHover?: (widget: WidgetType) => void;
  onOut?: (widget: WidgetType) => void;
}

/** Interface for widgets */
export interface IWidget<TGameObject extends Phaser.GameObjects.GameObject = Phaser.GameObjects.GameObject, TProps extends IWidgetProps = IWidgetProps> extends IService {
  gameObject: TGameObject | undefined;
  props: TProps | undefined;
  level: Level;
  create(scene: GameScene): void;
  resize?(): void;
  getGameObject(): Phaser.GameObjects.GameObject | undefined;
  getValue(): any;
  setValue(value: any): void;
  setupInput(): void;
  setText(newText: string): void;
  setImage(textureKey: string): void;
  setFocus(newFocus: boolean): void;
  addChild(widget: WidgetType): boolean;
  removeChild(widget: WidgetType): boolean;
}

/** Rarity types enumeration */
export const RarityTypes = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary",
} as const;
export type RarityType = typeof RarityTypes[keyof typeof RarityTypes];

/** Color mapping for rarity types */
export const RarityColors: Record<RarityType, number> = {
  [RarityTypes.COMMON]: 0xcccccc,
  [RarityTypes.UNCOMMON]: 0x00ff00,
  [RarityTypes.RARE]: 0x0088ff,
  [RarityTypes.EPIC]: 0xff00ff,
  [RarityTypes.LEGENDARY]: 0xffa500,
};

/** Card types enumeration */
export const CardStyles = {
  NORMAL: "normal",
  FOIL: "foil",
} as const;
export type CardType = typeof CardStyles[keyof typeof CardStyles];

/** Card effect types enumeration */
export const EffectTypes = {
  NONE: "none",
  DEFAULT: "default",
} as const;
export type EffectType = typeof EffectTypes[keyof typeof EffectTypes];

/** Probability mapping for card effect types */
export const EffectProbabilities: Record<EffectType, number> = {
  [EffectTypes.NONE]: 0.5,
  [EffectTypes.DEFAULT]: 0.5,
};

/** Card Effect interface */
export interface ICardEffect {
  type: EffectType;
  applyEffect(level: Level): void;
}

/** Card interface */
export interface ICard {
  id: string;
  title: string;
  description: string;
  effectDescription: string;
  cost: number;
  rarity: RarityType;
  type: CardType;
  effect: ICardEffect;
}