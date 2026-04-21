# Pawn Sprite Sheet Structure & Assembly Guide

## Overview
This document outlines the structure, layer hierarchy, and naming conventions for the pawn sprite assets in this directory. The rendering system uses a modular layer approach (similar to *Post-fate Odyssey*) to composite characters dynamically.

- **Base Resolution:** `512x512` pixels per sprite part.
- **Assembly Method:** Parts must be stacked perfectly on top of each other (aligned at 0,0) using the Z-Index (Sub-Offset) defined below. Lower numbers are drawn first (background), and higher numbers are drawn last (foreground).

## File Naming Convention
Files in this asset folder follow a strict naming convention to ensure automated parsers and AI agents can accurately identify them:

**Format:**
`<Angle>_<Layer Name>_<ID>.<extension>`

**Parameters:**
- `Angle`: The facing direction of the pawn (e.g., `South` [Front], `North` [Back], `East` [Right]).
- `Layer Name`: The exact category of the layer (mapped to the hierarchy table below). *Note: Spaces and special characters in layer names are usually stripped or CamelCased (e.g., `ApparelMiddle` instead of `Apparel: Middle`).*
- `ID`: The specific identifier, variant, or item name for that part (e.g., `01`, `02`, `03`, `04`).

**Examples:**
- `Back_Body_01.png`
- `Side_Hair_04.png`
- `Front_Shell_99.png`

---

## Layer Hierarchy (Z-Index / Sub-Offset)

When assembling a full pawn, gather all required components for the requested `<Angle>`, then composite/stack them in **ascending order** based on their Sub-Offset value.

| Sub-Offset (Z-Index) | Layer Name | Partition | Description |
| :--- | :--- | :--- | :--- |
| **0.000** | Body | Body | The base "naked" sprite of the pawn (Thin, Fat, Hulk, etc.). |
| **0.002** | TattoosSkin | Body | Body tattoos or skin genes (e.g., fur skin, scales). |
| **0.004** | Outfit | Body | Underwear, t-shirts, and pants. |
| **0.006** | ApparelMiddle | Body | Flak vests, formal vests, or corsets. |
| **0.008** | Shell | Body | Dusters, parkas, and power armor suits. |
| **0.010** | Head | Head | The actual face and head shape. |
| **0.012** | Facial | Head | Eyes, mouth, and facial tattoos/genes. |
| **0.014** | Beard | Head | Facial hair (added in the Ideology/Biotech era). |
| **0.016** | Hair | Head | The primary hair sprite. |
| **0.018** | Headgear | Head | Hats, helmets, and crowns. |
| **0.020** | Weapons | N/A | Drafted weapons, thought bubbles, and "Zzz" sleeping icons. |

---

## Instructions for AI Agents / Parsing Scripts

1. **Canvas Setup:** Create a `512x512` transparent canvas.
2. **Layer Selection:** Based on the requested pawn's loadout and viewing `<Angle>`, select the corresponding asset files.
3. **Sorting:** Map each selected file's `<Layer Name>` to the `Sub-Offset` table above. Sort the files from lowest offset (`0.000`) to highest offset (`0.020`).
4. **Compositing:** Overlay each sprite consecutively onto the canvas using standard alpha blending. Do not apply positional offsets (X/Y)—the assets are pre-aligned within their 512x512 bounds.
5. **Skipping Layers:** If a pawn lacks an item for a specific layer (e.g., no Headgear, no Beard), simply omit that layer from the composition pipeline.
