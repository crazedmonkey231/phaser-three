# Phaser Three Starter Project code named **Orbitwork**

A simple starter project that combines the power of **Three.js** for 3D graphics with **Phaser** for 2D game objects, creating a hybrid 2D/3D game development environment.

## Features

### 3D Support (Three.js)
- **3D "Things"**: Create and manage 3D objects using Three.js
- Full 3D scene management with lighting, materials, and shaders
- First-person player controller for 3D navigation
- Collision detection and physics integration
- Voxel-based world generation and editing

### 2D Support (Phaser)
- **2D "GameObjects"**: Traditional Phaser game objects for UI and 2D gameplay elements
- Widget system for UI components (buttons, sliders, text inputs, etc.)
- Audio management for music and sound effects
- Particle effects and post-processing

### Level Editor
- Built-in level editor for creating and modifying game levels
- Object placement and transformation tools
- Save/load level functionality with JSON serialization
- Template and voxel-based level types

### Additional Features
- TypeScript support for better development experience
- Vite for fast development and building
- Modular architecture with extensible "Thing" system
- Weather effects and environmental systems
- Custom shaders and materials

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the provided localhost URL

## Project Structure

- `src/` - Main source code
  - `things/` - 3D objects and entities
  - `scenes/` - Game scenes including the level editor
  - `widgets/` - UI components
  - `levels/` - Level management and templates
  - `shaders/` - Custom GLSL shaders
  - `material/` - Custom Three.js materials
  - `editor/` - Custom Editor module
  - `misc/` - Regular classes
  - `object3D/` - Regular Three.js objects
  - `voxel/` - Custom voxel module

- `public/` - Static assets
  - `textures/` - Image assets and sprites
  - `models/` - 3D model files
  - `audio/` - Sound effects and music
  - `levels/` - Level definition files

This project serves as a foundation for games that require both 2D UI elements and 3D world interaction, perfect for first-person games with rich user interfaces or 3D worlds with 2D overlays.

## Itch Ready
1. Build project:
   ```bash
   npm run build
   ```
2. Then take all files inside of the `dist` and zip them.
3. Upload zip to itch for web game.
