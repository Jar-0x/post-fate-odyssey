📊 Post-fate Odyssey - Development Progress Tracker

Single Source of Truth for Project Status & Antigravity Orchestration

✅ COMPLETED / CURRENTLY SUPPORTED (v0.4: Gameplay Polish)

**Engine & Rendering:**
- **Base Web/Canvas**: Live using Webpack & Rust WASM.
- **Camera Controls**: Right-click drag to pan (with tap-vs-drag detection for context menus), WASD keyboard panning, mouse scroll zoom. Mobile-friendly — no mouse3 required.
- **Optimized Pipeline**: Offline Sprite Atlas via `pack-sprites.js`. WebGL ParticleContainer tilemaps for terrain.
- **Day/Night Cycle**: Tripled duration (1 in-game hour = 3 real seconds). Smooth ambient tinting transitions at dawn/dusk.
- **Time Controls**: Bottom-right HUD with `[||] [>] [>>] [>>>]` speed controls. Clock displays simplified `Day X - XH` format.

**Simulation & Core Data:**
- **Split-Brain Architecture**: Headless ECS Engine at 10 TPS, communicating via flat Float32Array bridge.
- **SSOT Data Injection**: `build.rs` compiles `traits.csv` & `animals.csv` into static arrays at compile time.
- **Clock & Survival Needs**: Reduced hunger decay rate (~0.5/s). Slower starvation damage (~3.0/s). Pawns now **interrupt non-forced jobs** to find food when hunger drops below 35 — they will not starve while busy working.
- **Auto-Eating with Job Interruption**: Pawns actively scan for nearest `FoodResource`, drop current hauling/building tasks, and rush to eat. Only `Forced` (player-ordered) jobs are exempt from interruption.
- **Stockpile System**: One item per tile limit enforced. Items snap to tile grid on placement. Hauling AI automatically finds empty stockpile tiles. **Cancel Zone** tool removes stockpile designations.

**UI Integration & UX (Odyssey Authentic):**
- **Colonist Bar**: Top-center horizontal strip with clickable portraits + names. Multi-selection via Shift+Click or drag box.
- **Bio & Needs Tab Panel**: Bottom-left inspector with Bio tab (Gender, Age, Traits, Incapable, Skills grid) and Needs tab (HP bar, Hunger bar, current Job).
- **Right-Click Context Menu**: Tap right-click on interactable entities while pawns are selected → "Prioritize Chop/Mine/Eat/Haul".
- **Path Intent Lines**: White projection lines from selected pawns to their movement targets.
- **Cancel Zone Tool**: 🚫 button in bottom bar to drag-remove stockpile designations.

---

🎯 TARGETING NEXT (Sprint 2: Infrastructure & Power)

1. **Room Detection Algorithm**
   - **Architecture Target**: `core_sim/src/`
   - **Agent Task**: Flood-fill to detect enclosed wall polygons → "Room" structs with ambient metrics.

2. **Power Grid Graph**
   - **Architecture Target**: `core_sim/src/`
   - **Agent Task**: Generators → Conduits → Consumers via ECS graph connectivity.

---

⏳ QUEUEING / BACKLOG (Future Sprints)

**Sprint 3: Psychology & Visual Overhauls**
- Colony Wealth calculations.
- Mood Matrix (Needs, Beauty, Space).
- Replace dot pawns with 32x48 layered modular sprites per GDD.

**Sprint 4: The AI Storyteller**
- Event Queue, Wanderer Joins, Basic Pirate Raids.

**Sprint 5: Granular Mechanics**
- Room Temperature equalization.
- Localized Health system (body parts, bleeding, triage).
