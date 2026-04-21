📱 Project Post-fate Odyssey: Master Game Design Document
Studio: JDS Studio
Target Platform: Mobile Web Browser (Strictly optimized for iOS Safari)
Genre: Sci-Fi Colony Simulator (Lite)
Status: Architecture Blueprint (SSOT)
1. Hardware & Performance Targets
To ensure the game is universally playable, v1.0 must not push the mobile GPU to its limit. We are utilizing the CPU heavily, but keeping the rendering lightweight.
 * Minimum Device: iPhone 11 (or Android equivalent with ~4GB RAM).
 * Frame & Tick Rate: Strictly capped at 30fps rendering to prevent battery drain. 10 TPS (Ticks Per Second) for the WASM simulation loop.
 * Memory Ceiling: Total canvas and texture RAM must never exceed 150MB.
2. The "Split-Brain" Architecture (Tech Stack)
 * The Brain (Logic & Simulation): Rust compiled to WebAssembly (WASM). Runs entirely in a background Web Worker (Headless) using a strict Entity Component System (ECS).
 * The Eyes (Rendering & Input): TypeScript / PixiJS (Highly optimized 2D WebGL). Main Browser Thread.
 * The Bridge: Communicates strictly via a flat Float32Array (e.g., [EntityID, SpriteID, X, Y, Rotation, StatusFlags]). No JSON serialization.
3. Core Systems & Simulation Depth (Uncompromised)
The game will retain the full depth of a Post-fate Odyssey-style simulation. The Rust backend allows us to calculate these arrays with minimal overhead.
 * Pawn Skills (12 Disciplines): Ranging from 0-20 with Passion modifiers. Includes Shooting, Melee, Construction, Mining, Cooking, Crafting, Artistic, Plants, Animals, Medical, Intellectual, and Social.
 * Trait System: Pawns spawn with 1-3 static modifiers affecting personality, physical capabilities, or work speed.
 * Granular Health & Anatomy: Tracks individual body parts (Head, Torso, Limbs, Organs) and damage types (Gunshot, Crush, Burn), dynamically applying movement or manipulation penalties.
 * Thermodynamics: Room-based calculation. Enclosed polygons track heat. Impacted by active heaters, coolers, wall insulation, and seasonal biome fluctuations.
4. Core Systems: Psychology, Items & Infrastructure
 * Psychology & Mood Matrix:
   * Primary Needs: Food, Rest, Recreation.
   * Secondary Needs: Beauty (5-tile radius scan), Comfort, Space (room size tracking).
   * Mental Breaks: Triggered when aggregate Mood hits thresholds. Forces AI states (e.g., Sad Wander, Berserk). High mood yields Inspirations (e.g., Work Frenzy).
 * Item Economy & Crafting:
   * Quality System: Crafted weapons, apparel, and furniture span 7 tiers (Awful to Legendary), multiplying stats based on the crafter's skill.
   * Degradation: Unroofed, outdoor items lose HP iteratively until destroyed.
   * Apparel Layers: Skin Layer (Shirts/Pants) and Outer Layer (Dusters/Armor). Provides dual functionality: Armor (Sharp/Blunt) and Thermal Insulation.
 * Buildings & Power Grid:
   * Production: Workbenches utilizing a "Bill" queue system (e.g., "Do X times" or "Do until you have X").
   * Power Graph: A continuously calculated node-graph connecting Conduits, Generators (Solar, Wood), Consumers (Heaters, Benches), and Batteries. WASM recalculates instantly upon conduit construction/destruction.
5. Environment, Economy, and Ecosystem
 * Terrains & Biomes:
   * Tiles: Dirt (100% walk/100% fertility), Rich Soil (140% fertility), Sand (slow walk/low fertility), Mud (very slow walk/0 fertility - defensive), Stone (minable/smoothable).
   * Biomes (v1.0): Temperate Forest, Arid Shrubland, Boreal Forest.
 * Resource Economy:
   * Mined/Extracted: Steel, Plasteel, Components, Stone Chunks (Granite for HP, Marble for Beauty).
   * Harvested/Farmed: Wood, Rice (fast/low yield), Corn (slow/high yield), Cotton (for cloth), Healroot.
   * Animal Products: Meat, Leather, Wool, Milk, Eggs.
 * Animals & Wildlife:
   * Livestock: Muffalo (pack animal, wool, milk), Chicken (eggs).
   * Pets/Utility: Husky (hauls/rescues), Cat (provides nuzzle mood buff).
   * Wildlife: Timber Wolf/Grizzly Bear (predators), Hare/Deer (prey).
   * AI States: Wander, Flee, Manhunter (attack).
6. Asset Standardization & UI
 * Tile Map Specs: Base resolution of 32x32 pixels per tile.
 * Sprite Atlases: Maximum texture size is strictly 1024x1024 pixels.
 * Pawn Construction: 32x48 pixel modular sprites. Layered rendering across three directional facings (South, North, East).
 * Touch UI: Minimum touch target size of 48x48 device-independent pixels.
7. Security & Monetization
 * Validation Loop: Client sends deterministic input logs. A headless server replays the inputs for validation before saving critical states.
 * Economy (v1.0): Core loop is free. Monetization via a "Cloud Save Subscription".
 * Gacha System (Future): Players earn or buy "Cryo-Tokens" to extract or unlock pre-generated Pawns with legacy stats from a persistent server database.
8. The AI Storyteller & Random Events
Operates on a "Wealth Scaling" formula (Threat points scale with colony item/building/pawn value). Mobile CPU optimization: Late-game raids spawn higher-tier enemies, not mass quantities, to prevent pathfinding bottlenecks.
 * Threats: Standard Raid, Sapper Raid, Drop Pod Assault, Manhunter Pack.
 * Environmental: Solar Flare, Eclipse, Toxic Fallout, Cold Snap / Heat Wave.
 * Biological: Disease, Crop Blight.
 * Opportunities: Orbital/Caravan Traders, Wanderer Joins, Escape Pod Crash, Resource Meteorite.
PART 2: ENTITY MANIFEST & PROGRESSION
9. Structures & Furniture Specifications
The material used fundamentally changes the entity's ECS stats.
Walls (1x1 Tile):
 * Wooden Wall: Cost: 5 Wood. HP: 150. Flammability: 100%. Build Time: Fast. (Early game shelter).
 * Steel Wall: Cost: 5 Steel. HP: 300. Flammability: 20%. Build Time: Medium.
 * Granite Wall: Cost: 5 Granite Blocks. HP: 510. Flammability: 0%. Build Time: Slow. (Late-game perimeter defense).
 * Marble Wall: Cost: 5 Marble Blocks. HP: 360. Flammability: 0%. Beauty: +1. (Used for bedrooms and dining rooms).
Beds (1x2 Tiles):
 * Sleeping Spot: Cost: Free. Rest Effectiveness: 75%. Comfort: Awful.
 * Wooden/Steel Bed: Cost: 30 Wood/Steel. Rest Effectiveness: 100%. Comfort: Normal.
 * Stone Bed: Cost: 30 Stone Blocks. Rest Effectiveness: 90%. Comfort: Poor. (Note: Stone beds are terrible for sleeping; only use if desperate).
 * Hospital Bed: Cost: 40 Steel, 5 Components. Rest Effectiveness: 105%. Bonus: +10% Medical Tend Quality.
10. Production Stations (Workbenches)
 * Crafting Spot: 1x1. Cost: Free. Power: None. Crafts: Short Bows, Clubs, Shivs.
 * Butcher Table: 2x1. Cost: 30 Wood/Steel. Power: None. Crafts: Converts animal corpses into Raw Meat and Leather. (Hidden stat: Causes cleanliness debuff in room).
 * Campfire: 1x1. Cost: 20 Wood. Power: Burns Wood. Crafts: Simple Meals. Provides heat.
 * Stonecutter Table: 2x1. Cost: 30 Wood/Steel. Power: None. Crafts: Converts Stone Chunks (Mined) into Stone Blocks (Used for walls).
 * Electric Stove: 2x1. Cost: 80 Steel, 2 Components. Power: 350W. Crafts: Simple, Fine, and Lavish Meals safely.
 * Tailor Bench: 2x1. Cost: 50 Wood/Steel, 2 Components. Power: 120W. Crafts: Parkas, Dusters, Shirts from Leather/Cotton.
 * Machining Table: 2x1. Cost: 150 Steel, 3 Components. Power: 210W. Crafts: Firearms, Flak Armor. Breaks down dead mechanoids.
 * Fabrication Bench: 2x2. Cost: 200 Steel, 20 Plasteel, 2 Advanced Components. Power: 250W. Crafts: Advanced Components, Bionic Limbs, Power Armor.
11. The Research Tree Flow
Intellectual pawns generate "Research Points" at a Research Bench.
 * Tier 1: Neolithic (Requires: Nothing)
   * Stonecutting: Unlocks Stonecutter Table (Vital for fireproof bases).
   * Complex Furniture: Unlocks Beds and Dressers.
   * Complex Clothing: Unlocks Tailor Bench and Parkas/Dusters.
 * Tier 2: Industrial (Requires: Simple Research Bench - 50 Wood/Steel)
   * Electricity: Unlocks Wood Generators, Conduits.
   * Air Conditioning: Unlocks Coolers (Essential for food freezers).
   * Batteries: Unlocks power storage.
   * Machining: Unlocks Machining table for basic firearms.
 * Tier 3: Advanced (Requires: Hi-Tech Research Bench - 150 Steel, 10 Components)
   * Microelectronics: Unlocks Orbital Trade Beacons and Comms Console.
   * Gunsmithing & Blowback Operation: Unlocks Assault Rifles and Heavy SMGs.
   * Medicine Production: Unlocks crafting Industrial Medicine from Healroot + Neutroamine.
 * Tier 4: Spacer (Requires: Multi-Analyzer attached to Hi-Tech Bench)
   * Fabrication: Unlocks Bionics and Component crafting.
   * Cryptosleep Technology: Unlocks Ancient Caskets (The Meta-Progression extraction point).
12. Craftable Items & Weapons Specs
How players equip their pawns for survival.
Weapons:
 * Short Bow: Damage: Low. Range: Short. Acquisition: Crafting Spot (Wood).
 * Revolver: Damage: Medium. Range: Medium. Cooldown: Fast. Acquisition: Machining Table (Steel, Components).
 * Assault Rifle: Damage: Medium (3-burst). Range: Long. Acquisition: Machining Table (Steel, Components).
 * Charge Rifle: Damage: High (Armor Piercing). Range: Medium. Acquisition: Fabrication Bench (Plasteel, Advanced Components).
Apparel & Armor:
 * Tribalwear: Insulation: Poor. Armor: 0%. Acquisition: Crafting spot (Leather/Cloth).
 * Parka: Insulation: Excellent (Cold). Armor: Low. Acquisition: Tailor Bench.
 * Duster: Insulation: Excellent (Heat). Armor: Medium. Acquisition: Tailor Bench.
 * Flak Vest: Insulation: None. Armor: High (Protects Torso/Heart/Lungs). Acquisition: Machining Table (Steel, Cloth, Components). Movement speed penalty: -0.12 c/s.
PART 3: PROJECT MANAGEMENT & PIPELINE
13. Data Management & Project Structure
To maintain clean architecture and empower human review, all numerical game data must be isolated from the source code. The AI agents must adhere to the following project structure and compilation rules.
The CSV Pipeline (Single Source of Truth)
 * Rule: Hardcoding entity stats (e.g., weapon damage, animal move speed, construction costs) in Rust or TypeScript is strictly forbidden.
 * Format: All definitions must exist as .csv files stored in a dedicated /data folder, categorized by entity type. These files serve as the Single Source of Truth (SSOT) allowing human game designers to balance the game via spreadsheet software.
 * Compilation Rule (No Release): A Rust build script (build.rs) will parse these .csv files at compile time and bake them directly into static arrays within the WASM binary.
 * Security: The raw .csv files are never released to the public/ folder or served to the client browser. They exist strictly in the development environment.
Standardized Folder Tree & CSV Categorization
Agents must initialize and maintain the repository according to this strict layout. The /data/ folder is divided into exactly five main categories: Pawns, Plants, Resources, Gear, and Structures.
Post_fate_Odyssey_Project/
├── data/                    # SSOT Game Data (DO NOT RELEASE)
│   ├── pawns/               # Biological Entities & Modifiers
│   │   ├── traits.csv       # e.g., ID, Name, WorkSpeedMod, MoodBase, Description
│   │   ├── backgrounds.csv  # e.g., ID, Title, DisabledWorkTypes, SkillOffsets
│   │   └── animals.csv      # e.g., ID, Species, BaseHP, MoveSpeed, HungerRate, AttackDmg
│   │
│   ├── plants/              # Flora & Agriculture
│   │   ├── crops.csv        # e.g., ID, Name, GrowDays, Yield, OptimalTemp
│   │   └── wild_trees.csv   # e.g., ID, Name, WoodYield, ChopTime, Beauty
│   │
│   ├── resources/           # Stackable Economy Items
│   │   ├── raw.csv          # e.g., ID, Name, StackLimit, MarketValue, Flammability (Steel, Wood)
│   │   ├── manufactured.csv # e.g., ID, Name, StackLimit, MarketValue (Components, Medicine)
│   │   └── food.csv         # e.g., ID, Name, Nutrition, RotDays, JoyBonus (Meals, Meat)
│   │
│   ├── gear/                # Equippable Items
│   │   ├── weapons.csv      # e.g., ID, Type(Ranged/Melee), Damage, Range, Cooldown, ArmorPen
│   │   └── apparel.csv      # e.g., ID, Layer, ColdInsulation, HeatInsulation, ArmorSharp
│   │
│   └── structures/          # Placed Grid Entities
│       ├── buildings.csv    # e.g., ID, SizeX, SizeY, BaseHP, PowerDraw, MaterialCost
│       └── furniture.csv    # e.g., ID, Comfort, Beauty, RestEffectiveness
│
├── core_sim/                # The Rust WASM Brain
│   ├── src/                 # ECS Engine Logic
│   ├── build.rs             # Script to bake ../data/**/*.csv into WASM at compile time
│   └── Cargo.toml
│
├── web_client/              # The TypeScript / PixiJS Eyes
│   ├── src/                 # Rendering and Input Logic
│   ├── assets/              # Dev art folders (pre-packed)
│   ├── package.json
│   └── webpack.config.js    # Bundler config
│
└── public/                  # Final Release Directory (What goes to the server)
    ├── index.html
    ├── bundle.js            # Compiled TS/JS renderer
    ├── core_sim_bg.wasm     # Compiled Rust binary (CSV data is baked inside)
    └── assets/              # Packed 1024x1024 spritesheets (copied via build tool)

