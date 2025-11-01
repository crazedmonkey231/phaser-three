// This is a text input widget
import { GameScene } from '../GameScene';
import { Level } from '../Level';
import { IWidgetProps } from '../Types';
import { Widget } from '../Widget';

export interface ITextInputWidgetProps extends IWidgetProps {
  placeholder?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class TextInputWidget extends Widget<Phaser.GameObjects.DOMElement, ITextInputWidgetProps> {
  constructor(level: Level, props: ITextInputWidgetProps) {
    super(level, props);
  }

  create(scene: GameScene) {
    const inputElement = {
      element: 'input',
      type: 'text',
      style: {
        width: `${this.props.width}px`,
        height: `${this.props.height}px`,
        fontSize: '16px',
        padding: '4px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
      },
      placeholder: this.props.placeholder || ''
    }
    const domElement = scene.add.dom(this.props.x, this.props.y, inputElement.element, inputElement.style);
    (domElement.node as HTMLInputElement).placeholder = inputElement.placeholder;
    domElement.setOrigin(0.5, 0.5);
    this.gameObject = domElement;

    this.gameObject.setInteractive({ useHandCursor: true });
    this.gameObject.on('pointerdown', () => {
      this.props?.onClick?.(this);
    });

    this.gameObject.on('pointerover', () => {
      this.props?.onHover?.(this);
      this.setFocus(true);
    });

    this.gameObject.on('pointerout', () => {
      this.props?.onOut?.(this);
      this.setFocus(false);
      console.log('Input value:', this.getValue());
    });
  }

  update(timer: number, delta: number) {
    // Update logic if needed
  }
}