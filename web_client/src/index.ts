import * as PIXI from 'pixi.js';
import initWasm, { Engine } from './wasm/core_sim_bg';

const TILE_SIZE = 32;

enum UIMode { SELECT, CHOP_WOOD, MINE_ROCK, BUILD_WALL, ZONE_STOCKPILE, CANCEL_STOCKPILE }

const main = async () => {
    const app = new PIXI.Application({ width: window.innerWidth, height: window.innerHeight, backgroundColor: 0x050510, resolution: window.devicePixelRatio || 1 });
    document.body.appendChild(app.view as HTMLCanvasElement);

    PIXI.Assets.add('spritesheet', 'assets/spritesheet.json');
    
    // Use the correctly named file to avoid cache collisions
    PIXI.Assets.add('dirt_tiles', 'assets/dirt_tiles.png');

    let sheet: any, char1Json: any, dirtTexAsset: any;
    try { sheet = await PIXI.Assets.load('spritesheet'); } catch(e) { console.error('Failed to load spritesheet', e); }
    try { dirtTexAsset = await PIXI.Assets.load('dirt_tiles'); } catch(e) { console.error('Failed to load dirt_tiles', e); dirtTexAsset = PIXI.Texture.WHITE; }
    try {
        const res = await fetch('assets/Pawn/character_1.json');
        char1Json = await res.json();
    } catch(e) { console.error('Failed to load character_1.json', e); }
    
    const pawnTextures: Record<string, PIXI.Texture> = {};
    if (char1Json && char1Json.views) {
        for (const view of ['front', 'side', 'back']) {
            if (char1Json.views[view]) {
                // sort layers by z value just in case
                char1Json.views[view].sort((a: any, b: any) => a.z - b.z);
                for (const layerDef of char1Json.views[view]) {
                    const key = `${view}_${layerDef.layer}`;
                    PIXI.Assets.add(key, layerDef.path);
                    try {
                        pawnTextures[key] = await PIXI.Assets.load(key);
                    } catch(e) {
                         console.error('Failed to load pawn texture', key, e);
                         pawnTextures[key] = PIXI.Texture.WHITE;
                    }
                }
            }
        }
    }
    
    const textures = sheet ? sheet.textures : {};

    // Slice the new dirt tilemap safely, fallback to a white square if missing
    const dirtBaseTexture = dirtTexAsset ? dirtTexAsset.baseTexture : PIXI.Texture.WHITE.baseTexture;
    const DIRT_TILE_PX = 64;
    const DIRT_COLS = 4;
    const DIRT_ROWS = 4;
    const dirtTextures: PIXI.Texture[] = [];
    for (let row = 0; row < DIRT_ROWS; row++) {
        for (let col = 0; col < DIRT_COLS; col++) {
            const rect = new PIXI.Rectangle(col * DIRT_TILE_PX, row * DIRT_TILE_PX, DIRT_TILE_PX, DIRT_TILE_PX);
            dirtTextures.push(new PIXI.Texture(dirtBaseTexture, rect));
        }
    }

    // Seeded hash — deterministic per (x,y) for consistent randomisation across redraws
    const tileRng = (x: number, y: number) => {
        let h = (x * 374761393 + y * 668265263) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return Math.abs(h % dirtTextures.length);
    };

    await initWasm();
    const engine = new Engine();

    const worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);

    // Use a plain Container for the background so sub-textures work correctly.
    // After the first draw we bake it into a RenderTexture for GPU efficiency.
    const backgroundLayer = new PIXI.Container();
    worldContainer.addChild(backgroundLayer);
    
    const zoneLayer = new PIXI.Graphics();
    worldContainer.addChild(zoneLayer);
    
    const pathLayer = new PIXI.Graphics();
    worldContainer.addChild(pathLayer);
    
    const entityLayer = new PIXI.Container();
    worldContainer.addChild(entityLayer);
    
    const uiLayer = new PIXI.Graphics();
    worldContainer.addChild(uiLayer);

    const screenOverlay = new PIXI.Graphics();
    screenOverlay.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    app.stage.addChild(screenOverlay);

    const spriteCache = new Map<number, PIXI.Container>();
    
    const interpolateColor = (color1: number, color2: number, factor: number) => {
        const r1 = (color1 >> 16) & 0xff, g1 = (color1 >> 8) & 0xff, b1 = color1 & 0xff;
        const r2 = (color2 >> 16) & 0xff, g2 = (color2 >> 8) & 0xff, b2 = color2 & 0xff;
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));
        return (r << 16) | (g << 8) | b;
    };

    let selectedPawnIds = new Set<number>();
    let contextMenuTargetId: number | null = null;
    let contextMenuForceType: number = 0; 

    document.getElementById('btn-close-inspect')?.addEventListener('click', () => {
        selectedPawnIds.clear();
        document.getElementById('pawn-inspect-panel')!.style.display = 'none';
        spriteCache.forEach(w => { const s = w.getChildByName("pawn-select-box"); if (s) s.visible = false; });
    });

    // UI Tab toggle
    document.getElementById('tab-bio')?.addEventListener('click', () => {
        document.getElementById('sub-bio')!.style.display = 'block';
        document.getElementById('sub-needs')!.style.display = 'none';
        document.getElementById('tab-bio')?.classList.add('active-tab');
        document.getElementById('tab-needs')?.classList.remove('active-tab');
    });
    document.getElementById('tab-needs')?.addEventListener('click', () => {
        document.getElementById('sub-needs')!.style.display = 'block';
        document.getElementById('sub-bio')!.style.display = 'none';
        document.getElementById('tab-needs')?.classList.add('active-tab');
        document.getElementById('tab-bio')?.classList.remove('active-tab');
    });

    // Context Menu Logic
    document.getElementById('ctx-cancel')?.addEventListener('click', () => { document.getElementById('context-menu')!.style.display = 'none'; });
    document.getElementById('ctx-prioritize')?.addEventListener('click', () => {
        document.getElementById('context-menu')!.style.display = 'none';
        selectedPawnIds.forEach(pawnId => {
            if (contextMenuTargetId !== null) engine.command_force_job(pawnId, contextMenuTargetId, contextMenuForceType);
        });
    });

    const updateSpeeds = (activeBtnId: string, speed: number) => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active-mode'));
        document.getElementById(activeBtnId)?.classList.add('active-mode');
        engine.set_time_scale(speed);
    };
    document.getElementById('btn-speed-0')?.addEventListener('click', () => updateSpeeds('btn-speed-0', 0.0));
    document.getElementById('btn-speed-1')?.addEventListener('click', () => updateSpeeds('btn-speed-1', 1.0));
    document.getElementById('btn-speed-2')?.addEventListener('click', () => updateSpeeds('btn-speed-2', 2.0));
    document.getElementById('btn-speed-4')?.addEventListener('click', () => updateSpeeds('btn-speed-4', 4.0));

    let currentMode = UIMode.SELECT;
    const setMode = (mode: UIMode, text: string) => {
        currentMode = mode;
        document.getElementById('mode-indicator')!.innerText = `Mode: ${text}`;
        document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active-mode'));
    };

    document.getElementById('btn-cancel')?.addEventListener('click', () => setMode(UIMode.SELECT, 'SELECT'));
    document.getElementById('btn-chop')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).classList.add('active-mode'); setMode(UIMode.CHOP_WOOD, 'CHOP WOOD'); });
    document.getElementById('btn-mine')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).classList.add('active-mode'); setMode(UIMode.MINE_ROCK, 'MINE ROCK'); });
    document.getElementById('btn-build-wall')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).classList.add('active-mode'); setMode(UIMode.BUILD_WALL, 'BUILD WALL'); });
    document.getElementById('btn-zone')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).classList.add('active-mode'); setMode(UIMode.ZONE_STOCKPILE, 'ZONE STOCKPILE'); });
    document.getElementById('btn-cancel-zone')?.addEventListener('click', (e) => { (e.currentTarget as HTMLElement).classList.add('active-mode'); setMode(UIMode.CANCEL_STOCKPILE, 'CANCEL ZONE'); });

    let isDraggingSelection = false;
    let isRightClickPanning = false;
    let rightClickStart = { x: 0, y: 0 };
    let rightClickMoved = false;
    let dragStartPointGlobal = { x: 0, y: 0 };
    let dragStartPointLocal = { x: 0, y: 0 };
    let panStartPoint = { x: 0, y: 0 };

    app.stage.eventMode = 'static';
    app.stage.hitArea = new PIXI.Rectangle(0, 0, window.innerWidth, window.innerHeight);

    document.body.addEventListener('contextmenu', e => e.preventDefault());

    app.stage.on('pointerdown', (e) => {
        document.getElementById('context-menu')!.style.display = 'none';

        if (e.button === 2) { // Right Click = Pan (drag) or Context Menu (tap)
            isRightClickPanning = true;
            rightClickMoved = false;
            rightClickStart = { x: e.global.x, y: e.global.y };
            panStartPoint = { x: e.global.x, y: e.global.y };
            return;
        } else if (e.button === 0) {
            isDraggingSelection = true;
            dragStartPointGlobal = { x: e.global.x, y: e.global.y };
            dragStartPointLocal = worldContainer.toLocal(e.global);
        }
    });

    app.stage.on('pointermove', (e) => {
        if (isRightClickPanning) {
            const dx = e.global.x - panStartPoint.x;
            const dy = e.global.y - panStartPoint.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) rightClickMoved = true;
            worldContainer.x += dx;
            worldContainer.y += dy;
            panStartPoint = { x: e.global.x, y: e.global.y };
            return;
        }

        if (isDraggingSelection) {
            uiLayer.clear();
            const currentLocal = worldContainer.toLocal(e.global);
            const rectX = Math.min(dragStartPointLocal.x, currentLocal.x);
            const rectY = Math.min(dragStartPointLocal.y, currentLocal.y);
            const rectW = Math.abs(currentLocal.x - dragStartPointLocal.x);
            const rectH = Math.abs(currentLocal.y - dragStartPointLocal.y);

            uiLayer.beginFill(0x00ff00, 0.2);
            uiLayer.lineStyle(2, 0x00ff00, 0.8);
            uiLayer.drawRect(rectX, rectY, rectW, rectH);
            uiLayer.endFill();
        }
    });

    app.stage.on('pointerup', (e) => {
        if (e.button === 2) {
            isRightClickPanning = false;
            // If it was a tap (not a drag), don't do anything here — context menu is handled on entities
            return;
        }

        if (isDraggingSelection) {
            isDraggingSelection = false;
            uiLayer.clear();

            const currentLocal = worldContainer.toLocal(e.global);
            const minX = Math.floor(Math.min(dragStartPointLocal.x, currentLocal.x) / TILE_SIZE);
            const maxX = Math.floor(Math.max(dragStartPointLocal.x, currentLocal.x) / TILE_SIZE);
            const minY = Math.floor(Math.min(dragStartPointLocal.y, currentLocal.y) / TILE_SIZE);
            const maxY = Math.floor(Math.max(dragStartPointLocal.y, currentLocal.y) / TILE_SIZE);

            if (currentMode === UIMode.SELECT) {
                if (!e.shiftKey) selectedPawnIds.clear();
                let newlySelected = 0;
                spriteCache.forEach((wrapper, id) => {
                    if (id < 1000) {
                        const px = wrapper.x + TILE_SIZE/2; const py = wrapper.y + TILE_SIZE/2;
                        const rX1 = Math.min(dragStartPointLocal.x, currentLocal.x);
                        const rX2 = Math.max(dragStartPointLocal.x, currentLocal.x);
                        const rY1 = Math.min(dragStartPointLocal.y, currentLocal.y);
                        const rY2 = Math.max(dragStartPointLocal.y, currentLocal.y);
                        if (px > rX1 && px < rX2 && py > rY1 && py < rY2) {
                            selectedPawnIds.add(id);
                            newlySelected++;
                        }
                    }
                });
                
                if (newlySelected === 0 && Math.abs(dragStartPointLocal.x - currentLocal.x) < 5) selectedPawnIds.clear();
                
                if (selectedPawnIds.size > 0) document.getElementById('pawn-inspect-panel')!.style.display = 'block';
                else document.getElementById('pawn-inspect-panel')!.style.display = 'none';

            } else {
                if (currentMode === UIMode.CHOP_WOOD) engine.command_batch_chop(minX, minY, maxX, maxY);
                if (currentMode === UIMode.MINE_ROCK) engine.command_batch_mine(minX, minY, maxX, maxY);
                if (currentMode === UIMode.ZONE_STOCKPILE) engine.command_create_stockpile(minX, minY, maxX, maxY);
                if (currentMode === UIMode.CANCEL_STOCKPILE) engine.command_cancel_stockpile(minX, minY, maxX, maxY);
                if (currentMode === UIMode.BUILD_WALL) engine.command_build_wall(minX, minY);
            }
        }
    });
    
    app.stage.on('pointerupoutside', () => { isDraggingSelection = false; isRightClickPanning = false; uiLayer.clear(); });

    // WASD Keyboard Camera Panning
    document.addEventListener('keydown', (e) => {
        const panSpeed = 30;
        if (e.key === 'w' || e.key === 'W') worldContainer.y += panSpeed;
        if (e.key === 's' || e.key === 'S') worldContainer.y -= panSpeed;
        if (e.key === 'a' || e.key === 'A') worldContainer.x += panSpeed;
        if (e.key === 'd' || e.key === 'D') worldContainer.x -= panSpeed;
    });

    document.body.addEventListener('wheel', (e) => {
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = worldContainer.scale.x * zoomDelta;
        if (newScale >= 0.3 && newScale <= 3.0) {
            const pointerX = e.clientX; const pointerY = e.clientY;
            const worldPos = { x: (pointerX - worldContainer.x) / worldContainer.scale.x, y: (pointerY - worldContainer.y) / worldContainer.scale.y };
            worldContainer.scale.set(newScale, newScale);
            worldContainer.x = pointerX - worldPos.x * newScale; worldContainer.y = pointerY - worldPos.y * newScale;
        }
    }, {passive: true});

    worldContainer.x = window.innerWidth / 2 - (25 * TILE_SIZE);
    worldContainer.y = window.innerHeight / 2 - (25 * TILE_SIZE);

    let timeAccumulator = 0;
    const TICK_RATE = 1000 / 10; 
    let mapDrawn = false;

    const isStone = (tiles: Float32Array, offset: number, w: number, h: number, x: number, y: number) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return true;
        return tiles[offset + y * w + x] === 2;
    };

    app.ticker.add(() => {
        timeAccumulator += app.ticker.elapsedMS;

        if (timeAccumulator >= TICK_RATE) {
            engine.tick(TICK_RATE / 1000.0);
            timeAccumulator -= TICK_RATE;
            
            const floatArr = engine.get_render_buffer();
            const globalTime = floatArr[0];
            const width = floatArr[1];
            const height = floatArr[2];
            
            const numTiles = width * height;
            const tilesOffset = 3;
            const zonesOffset = 3 + numTiles;
            
            const day = Math.floor(globalTime / 24) + 1;
            const hourFloat = globalTime % 24;
            const hour = Math.floor(hourFloat);
            const timeStr = `Day ${day} - ${hour}H`;
            document.getElementById('time-display')!.innerText = timeStr;

            let color = 0xFFFFFF;
            if (hourFloat < 4 || hourFloat > 20) {
                color = 0x333366; 
            } else if (hourFloat >= 4 && hourFloat < 8) {
                color = interpolateColor(0x333366, 0xFFFFFF, (hourFloat - 4) / 4.0);
            } else if (hourFloat >= 16 && hourFloat <= 20) {
                color = interpolateColor(0xFFFFFF, 0x333366, (hourFloat - 16) / 4.0);
            }
            screenOverlay.clear();
            screenOverlay.beginFill(color);
            screenOverlay.drawRect(0, 0, window.innerWidth, window.innerHeight);
            screenOverlay.endFill();
            
            if (!mapDrawn) {
                backgroundLayer.removeChildren();
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const dirtTex = dirtTextures[tileRng(x, y)];
                        const tileSprite = new PIXI.Sprite(dirtTex);
                        tileSprite.width = TILE_SIZE; tileSprite.height = TILE_SIZE;
                        tileSprite.x = x * TILE_SIZE; tileSprite.y = y * TILE_SIZE;
                        backgroundLayer.addChild(tileSprite);
                    }
                }
                mapDrawn = true;
            }

            zoneLayer.clear();
            zoneLayer.beginFill(0x0088ff, 0.3);
            zoneLayer.lineStyle(1, 0x00aaff, 0.5);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (floatArr[zonesOffset + y * width + x] === 1) {
                         zoneLayer.drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
            zoneLayer.endFill();

            let offset = zonesOffset + numTiles;
            const activeIds = new Set<number>();
            
            // Pawns
            const numPawns = floatArr[offset++];
            for(let i = 0; i < numPawns; i++) {
                const id = floatArr[offset++]; const spriteId = floatArr[offset++];
                const px = floatArr[offset++]; const py = floatArr[offset++];
                activeIds.add(id);

                let wrapper = spriteCache.get(id);
                if (!wrapper) {
                    wrapper = new PIXI.Container();
                    (wrapper as any).lastPx = px;
                    (wrapper as any).lastPy = py;
                    (wrapper as any).facing = 'front';

                    const charContainer = new PIXI.Container();
                    charContainer.name = "character-container";
                    // Center pivot so scale.x = -1 flips in-place
                    charContainer.pivot.set(TILE_SIZE/2, TILE_SIZE/2);
                    charContainer.position.set(TILE_SIZE/2, TILE_SIZE/2);
                    
                    const charViews: Record<string, PIXI.Container> = { front: new PIXI.Container(), side: new PIXI.Container(), back: new PIXI.Container() };
                    
                    for (const view of ['front', 'side', 'back']) {
                        const viewContainer = charViews[view];
                        viewContainer.name = view;
                        viewContainer.visible = view === 'front';
                        if (char1Json && char1Json.views && char1Json.views[view]) {
                            for (const layerDef of char1Json.views[view]) {
                                const key = `${view}_${layerDef.layer}`;
                                const spr = new PIXI.Sprite(pawnTextures[key] || PIXI.Texture.WHITE);
                                spr.width = TILE_SIZE; spr.height = TILE_SIZE;
                                viewContainer.addChild(spr);
                            }
                        }
                        charContainer.addChild(viewContainer);
                    }
                    wrapper.addChild(charContainer);
                    
                    wrapper.eventMode = 'static';
                    wrapper.cursor = 'pointer';
                    wrapper.on('pointerdown', (e) => {
                        if (e.button === 0 && currentMode === UIMode.SELECT) {
                            if (!e.shiftKey) selectedPawnIds.clear();
                            selectedPawnIds.add(id);
                            document.getElementById('pawn-inspect-panel')!.style.display = 'block';
                            e.stopPropagation();
                        }
                    });
                    
                    const sel = new PIXI.Graphics();
                    sel.lineStyle(2, 0xffffff);
                    sel.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
                    sel.visible = false;
                    sel.name = "pawn-select-box";
                    wrapper.addChild(sel);

                    entityLayer.addChild(wrapper);
                    spriteCache.set(id, wrapper);
                }
                
                const dx = px - (wrapper as any).lastPx;
                const dy = py - (wrapper as any).lastPy;
                if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
                    if (Math.abs(dx) >= Math.abs(dy)) {
                        (wrapper as any).facing = 'side';
                        const charCont = wrapper.getChildByName("character-container") as PIXI.Container;
                        if (charCont) {
                           charCont.scale.x = dx < 0 ? -1 : 1;
                        }
                    } else {
                        (wrapper as any).facing = dy > 0 ? 'front' : 'back';
                        const charCont = wrapper.getChildByName("character-container") as PIXI.Container;
                        if (charCont) charCont.scale.x = 1;
                    }
                }
                (wrapper as any).lastPx = px;
                (wrapper as any).lastPy = py;

                const charCont = wrapper.getChildByName("character-container") as PIXI.Container;
                if (charCont) {
                    if (spriteId >= 1000.0) {
                        charCont.rotation = Math.PI / 2; // sleeping on side
                        charCont.getChildByName('front')!.visible = false;
                        charCont.getChildByName('back')!.visible = false;
                        charCont.getChildByName('side')!.visible = true;
                    } else {
                        charCont.rotation = 0;
                        const face = (wrapper as any).facing;
                        charCont.getChildByName('front')!.visible = face === 'front';
                        charCont.getChildByName('back')!.visible = face === 'back';
                        charCont.getChildByName('side')!.visible = face === 'side';
                    }
                }

                const sel = wrapper.getChildByName("pawn-select-box") as PIXI.Graphics;
                if (sel) sel.visible = selectedPawnIds.has(id);

                wrapper.x = px * TILE_SIZE; wrapper.y = py * TILE_SIZE;
            }

            // Statics
            const numStatics = floatArr[offset++];
            let globalWood = 0; let globalStone = 0;

            for(let i = 0; i < numStatics; i++) {
                const id = floatArr[offset++]; const staticType = floatArr[offset++]; 
                const px = floatArr[offset++]; const py = floatArr[offset++];
                activeIds.add(id);

                if (staticType === 301 || staticType === 302) {
                    const zx = Math.round(px); const zy = Math.round(py);
                    if (zx >= 0 && zx < width && zy >= 0 && zy < height) {
                        if (floatArr[zonesOffset + zy * width + zx] === 1) {
                            if (staticType === 301) globalWood += 1;
                            if (staticType === 302) globalStone += 1;
                        }
                    }
                }

                let wrapper = spriteCache.get(id);
                if (!wrapper) {
                    wrapper = new PIXI.Container();
                    if (staticType === 201 || staticType === 205) { 
                        let s = new PIXI.Sprite(textures['tree.png'] || PIXI.Texture.WHITE); s.width = TILE_SIZE; s.height = TILE_SIZE; wrapper.addChild(s);
                    } else if (staticType === 202 || staticType === 206) { 
                        let s = new PIXI.Sprite(textures['rock.png'] || PIXI.Texture.WHITE); s.width = TILE_SIZE; s.height = TILE_SIZE; wrapper.addChild(s);
                    } else if (staticType === 401) { 
                        let s = new PIXI.Sprite(textures['wall.png'] || PIXI.Texture.WHITE); s.width = TILE_SIZE; s.height = TILE_SIZE; wrapper.addChild(s);
                    } else if (staticType === 301) { 
                        let s = new PIXI.Sprite(textures['white.png'] || PIXI.Texture.WHITE); s.tint = 0xd2b48c; s.width = TILE_SIZE/2; s.height = TILE_SIZE/4; s.x = TILE_SIZE/4; s.y = TILE_SIZE/2; wrapper.addChild(s);
                    } else if (staticType === 302) { 
                        let s = new PIXI.Sprite(textures['rock.png'] || PIXI.Texture.WHITE); s.width = TILE_SIZE/1.5; s.height = TILE_SIZE/1.5; s.x = TILE_SIZE/6; s.y = TILE_SIZE/6; wrapper.addChild(s);
                    } else if (staticType === 303) {
                        let s = new PIXI.Sprite(textures['food.png'] || PIXI.Texture.WHITE); s.width = TILE_SIZE/1.5; s.height = TILE_SIZE/1.5; s.x = TILE_SIZE/6; s.y = TILE_SIZE/6; wrapper.addChild(s);
                    }
                    
                    const indicator = new PIXI.Sprite(textures['white.png']);
                    indicator.name = "indicator"; indicator.visible = false;
                    indicator.width = TILE_SIZE; indicator.height = TILE_SIZE;
                    wrapper.addChild(indicator);

                    // Setup Right-Click Priority Context Menu Overlay
                    const ctxHit = new PIXI.Graphics();
                    ctxHit.beginFill(0xffffff, 0.001); ctxHit.drawRect(0,0,TILE_SIZE,TILE_SIZE); ctxHit.endFill();
                    ctxHit.eventMode = 'static';
                    ctxHit.on('pointerdown', (e) => {
                        if (e.button === 2 && selectedPawnIds.size > 0 && currentMode === UIMode.SELECT) {
                            contextMenuTargetId = id;
                            contextMenuForceType = (staticType === 201 || staticType === 205) ? 1 : 
                                                   ((staticType === 202 || staticType === 206) ? 2 : 
                                                   (staticType === 303 ? 3 : 4)); 
                            
                            const menu = document.getElementById('context-menu')!;
                            menu.style.display = 'flex';
                            menu.style.left = e.global.x + 'px';
                            menu.style.top = e.global.y + 'px';
                            document.getElementById('ctx-prioritize')!.innerText = `Prioritize ${contextMenuForceType === 1 ? 'Chop' : contextMenuForceType === 2 ? 'Mine' : contextMenuForceType === 3 ? 'Eat' : 'Haul'}`;
                            e.stopPropagation();
                        }
                    });
                    wrapper.addChild(ctxHit);

                    entityLayer.addChild(wrapper);
                    spriteCache.set(id, wrapper);
                }

                const indicator = wrapper.getChildByName("indicator") as PIXI.Sprite;
                if (staticType === 205 || staticType === 206) {
                    indicator.tint = 0xffff00; indicator.alpha = 0.4; indicator.visible = true;
                } else {
                    indicator.visible = false;
                }

                wrapper.x = px * TILE_SIZE; wrapper.y = py * TILE_SIZE;
            }

            const elWood = document.getElementById('val-wood');
            const elStone = document.getElementById('val-stone');
            if (elWood) elWood.innerText = globalWood.toString();
            if (elStone) elStone.innerText = globalStone.toString();

            // Pawn Path Rendering
            pathLayer.clear();
            selectedPawnIds.forEach(pid => {
                const pathStr = engine.get_pawn_target_path(pid);
                if (pathStr !== "null") {
                    const pb = JSON.parse(pathStr);
                    const wrapper = spriteCache.get(pid);
                    if (wrapper) {
                        pathLayer.lineStyle(2, 0xffffff, 0.6);
                        pathLayer.moveTo(wrapper.x + TILE_SIZE/2, wrapper.y + TILE_SIZE/2);
                        pathLayer.lineTo(pb.x * TILE_SIZE + TILE_SIZE/2, pb.y * TILE_SIZE + TILE_SIZE/2);
                        pathLayer.beginFill(0xffffff);
                        pathLayer.drawCircle(pb.x * TILE_SIZE + TILE_SIZE/2, pb.y * TILE_SIZE + TILE_SIZE/2, 4);
                        pathLayer.endFill();
                    }
                }
            });

            // Pawn Top Bar Sync
            const basicPawns = JSON.parse(engine.get_basic_pawn_list());
            const colBar = document.getElementById('colonist-bar')!;
            if (colBar.children.length !== basicPawns.length) {
                colBar.innerHTML = '';
                for(const p of basicPawns) {
                    const btn = document.createElement('div');
                    btn.style.width = '64px'; btn.style.height = '64px';
                    btn.style.background = 'rgba(50,70,90,0.8)';
                    btn.style.border = '2px solid #557788'; btn.style.borderRadius = '4px';
                    btn.style.display = 'flex'; btn.style.flexDirection = 'column';
                    btn.style.alignItems = 'center'; btn.style.justifyContent = 'center';
                    btn.style.cursor = 'pointer'; btn.id = 'col-box-' + p.id;
                    
                    const pIcon = document.createElement('div');
                    pIcon.style.width = '24px'; pIcon.style.height='24px'; pIcon.style.background = p.id===1?'#ff00cc':'#00ccff'; pIcon.style.borderRadius='12px'; pIcon.style.marginBottom='2px';
                    
                    const pName = document.createElement('div');
                    pName.innerText = p.name;
                    pName.style.fontSize = '12px'; pName.style.overflow = 'hidden'; pName.style.textOverflow = 'ellipsis';
                    
                    btn.appendChild(pIcon); btn.appendChild(pName);
                    
                    btn.onclick = (e) => {
                        if (!e.shiftKey) selectedPawnIds.clear();
                        selectedPawnIds.add(p.id);
                        document.getElementById('pawn-inspect-panel')!.style.display = 'block';
                    };
                    colBar.appendChild(btn);
                }
            }
            for(const p of basicPawns) {
                const bx = document.getElementById('col-box-' + p.id);
                if (bx) bx.style.borderColor = selectedPawnIds.has(p.id) ? '#00ff99' : '#557788';
            }

            // Info Panel Polling
            if (selectedPawnIds.size > 0) {
                const primaryId = Array.from(selectedPawnIds)[0];
                const infoStr = engine.get_pawn_info(primaryId);
                if (infoStr !== "{}") {
                    const info = JSON.parse(infoStr);
                    document.getElementById('pawn-name')!.innerText = info.bio.name;
                    document.getElementById('bio-gender')!.innerText = info.bio.gender;
                    document.getElementById('bio-age')!.innerText = info.bio.age.toString();
                    document.getElementById('bio-traits')!.innerText = info.bio.traits.join(", ");
                    document.getElementById('bio-incapable')!.innerText = info.bio.incapable.join(", ");
                    
                    document.getElementById('sk-shooting')!.innerText = info.bio.shooting.toString();
                    document.getElementById('sk-melee')!.innerText = info.bio.melee.toString();
                    document.getElementById('sk-mining')!.innerText = info.bio.mining.toString();
                    document.getElementById('sk-construction')!.innerText = info.bio.construction.toString();
                    document.getElementById('sk-cooking')!.innerText = info.bio.cooking.toString();
                    document.getElementById('sk-plants')!.innerText = info.bio.plants.toString();

                    document.getElementById('pawn-hp')!.innerText = Math.round(info.hp).toString();
                    document.getElementById('pawn-max-hp')!.innerText = Math.round(info.max_hp).toString();
                    document.getElementById('bar-hp')!.style.width = `${Math.max(0, (info.hp/info.max_hp)*100)}%`;
                    
                    document.getElementById('pawn-hunger')!.innerText = Math.round(info.hunger).toString();
                    document.getElementById('pawn-max-hunger')!.innerText = Math.round(info.max_hunger).toString();
                    document.getElementById('bar-hunger')!.style.width = `${Math.max(0, (info.hunger/info.max_hunger)*100)}%`;
                    
                    document.getElementById('pawn-job')!.innerText = info.job;
                } else {
                    selectedPawnIds.delete(primaryId);
                    if (selectedPawnIds.size === 0) document.getElementById('pawn-inspect-panel')!.style.display = 'none';
                }
            }

            spriteCache.forEach((wrapper, id) => {
                if (!activeIds.has(id)) {
                    entityLayer.removeChild(wrapper);
                    wrapper.destroy({ children: true });
                    spriteCache.delete(id);
                    if (selectedPawnIds.has(id)) selectedPawnIds.delete(id);
                }
            });
        }
    });

    window.addEventListener('resize', () => { app.renderer.resize(window.innerWidth, window.innerHeight); app.stage.hitArea = new PIXI.Rectangle(0, 0, window.innerWidth, window.innerHeight); });
};
main().catch(console.error);
