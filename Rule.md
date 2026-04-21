# General Capabilities and Rules for Agents

This document tracks the best practices, agent identities, and skills for Post-fate Odyssey.

## Best Practices
1. Agents should follow the folder structure guidelines defined below.
2. Code should be optimized for a mobile browser experience (touch-friendly, lightweight, responsive, performance-aware).
3. Temporary tools should be sandboxed in `TempApp` or `TempFiles`.

## Folder Structure
- **TempApp**: Workspace used to install and verify applications, specifically isolated environments like test compilers, specific libraries, or sandbox environments.
- **TempFiles**: Temporary folder to store temporary files or artifacts created during operations.
- **bin**: The main directory for the app/website development. All primary source code and application builds reside here.

## Agent Identities and Skills

To professionally develop Post-fate Odyssey for a mobile browser environment, our AI agent team consists of specialized roles with very specific skill sets:

### 1. Game Systems & Logic Agent
**Role**: Core Engine Architect.
Responsible for the underlying game engine, performance architecture, and core data manipulations.
**Required Skills**:
- **ECS Architecture**: Deep expertise in Entity-Component-System design to handle thousands of concurrent entities efficiently.
- **Performance Optimization**: Advanced knowledge of garbage collection mitigation, bitwise operations, and memory management in modern JavaScript/TypeScript.
- **Algorithms**: Mastery in optimized A* and Dijkstra pathfinding on 2D grids, spatial hashing, and collision mapping.
- **Concurrency**: Utilization of Web Workers to offload heavy calculations (AI, pathfinding) from the main UI thread.

### 2. UI/UX Front-End Agent
**Role**: Mobile Interface Director.
Responsible for translating complex game mechanics into clear, responsive, and mobile-friendly touch interfaces.
**Required Skills**:
- **Mobile-First CSS/HTML**: Building lightweight, flexible, and responsive panels that fit varying mobile screen ratios.
- **Touch & Gesture APIs**: Implementing smooth multi-touch gestures (pinch-to-zoom, panning, long-press) natively in the browser.
- **State Management**: Handling complex UI state dynamically, ensuring menus feel snappy and immediate without expensive DOM reflows.
- **Visual Hierarchy**: Designing clear overlays to display dense information (stats, inventories) easily on small screens.

### 3. AI & Behavior Scripter Agent
**Role**: "Storyteller" & Pawn AI Scripter.
Responsible for crafting lifelike behaviors for colonists and running the overarching game director (Storyteller).
**Required Skills**:
- **Behavior Trees & FSMs**: Building modular logic for pawns to evaluate needs, prioritize jobs, and execute tasks autonomously.
- **Dynamic Event Generation**: Developing logic that monitors player progress, wealth, and time to generate dynamic events (raids, eclipses, traders) balancing the difficulty.
- **Pawn Sociology & Tuning**: Tuning psychological and physical needs systems (hunger, mood, interpersonal relations) against available resources in the game economy.

### 4. Art, Audio & Rendering Agent
**Role**: Asset Coordinator & Graphics Programmer.
Responsible for rendering the game world and optimizing all media.
**Required Skills**:
- **Canvas/WebGL Rendering**: Direct and highly-optimized drawing to HTML5 `<canvas>` or utilizing WebGL for high-performance 60 FPS rendering on mobile devices.
- **Asset Pipeline Optimization**: Creating and managing sprite sheets, compressing images, and ensuring assets are lazy-loaded to prevent massive initial downloads.
- **Procedural Generation**: Algorithmically generating map terrain, biomes, and noise maps to create unique environments without shipping huge static files.

### 5. QA Testing & Profiling Agent
**Role**: Reliability & Performance Engineer.
Responsible for ensuring the game doesn't crash mobile browsers and handles extended play sessions smoothly.
**Required Skills**:
- **Browser Profiling**: Advanced profiling to trace frame drops, pinpoint bottlenecks, and aggressively hunt down memory leaks.
- **Cross-Platform Verification**: Ensuring feature-parity and smooth gameplay across iOS/Safari and Android/Chrome.
- **Automated Validation**: Writing test scripts for core logic paths to ensure robust game state integrity through save/load cycles and heavy late-game simulations.
