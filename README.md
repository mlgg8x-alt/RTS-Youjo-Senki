# Youjo Senki — Grand Strategy / RTS / FPS (Godot migration)

**Current status: Desktop-first Godot replacement in progress.** This repository previously held the TypeScript/Android prototype, which remains temporarily for reference. **It is not the target game.**

## Target game
Persistent alternate-1920s Youjo Senki world with real-time grand strategy, operational command, tactical RTS and first-person soldier/mage control. Windows desktop first; Android integration has been dropped.

## Current Godot files
- `godot/project.godot` — initial Godot 4 project
- `godot/scenes/main.tscn` — minimal 3D entry scene
- `docs/DESKTOP_GODOT_MIGRATION.md` — architecture, design decisions, agent workflow and migration gates

## Mage equipment
Empire propulsion, Entente flying skis, François Republic mechanical horse, and Albish Commonwealth broom/speeder. GLB prototypes and motion specifications are held in the v2.1 design/asset archive pending import.

## Run
Open the `godot/` folder in Godot 4. This is an initial scene scaffold, **not yet the full strategy game**.

## Legacy
The existing `src/`, `scripts/`, `artifacts/` and Android build pipeline are legacy material and should not be used for new development. They will be removed only after the replacement is verified.
