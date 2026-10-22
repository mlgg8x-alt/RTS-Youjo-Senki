# Youjo Senki — Desktop Godot Migration

Status: Migration initiated. The legacy TypeScript/Android code remains in the repository until the Godot replacement is validated.

## Project contract
- Platform: Windows desktop first. Android APK, touch-first UI, and Android SDK pipeline are retired from the target architecture.
- Engine: Godot 4, 3D persistent world simulation.
- Modes: strategic world map, operational command, tactical RTS, and soldier/mage FPS possession, sharing authoritative state.
- Scope: Youjo Senki alternate 1920s world; no crossover universes.
- Simulation target: Battle of Verdun as maximum battle scale, with simulation LOD and event-driven updates.
- Communications: hierarchical orders, transmission delays, acknowledgments, standing orders, and imperfect information.
- Soldier AI: autonomy, suppression, morale, cohesion, persistent casualties, and commander succession.
- Mage systems: automatic passive Mage Shell; manually activated active defense; normal six-axis flight is baseline, boost drains mana; injury affects concentration and formula stability.
- Nation-specific flight devices: Empire leg/body propulsion; Entente flying skis; François Republic mechanical horses; Albish Commonwealth broom/speeder. No American equipment in active roster.
- Flight assets: four prototype GLB blockouts, movement profiles and animation-channel data are in the separately packaged model-context archive v2.1, pending repository import.

## Agent workflow
1. Read this contract and CURRENT_STATE before a task.
2. Retrieve only domain-relevant design specs; never assume a proposal is locked.
3. Use one coordinator to assign nonoverlapping tasks; specialist agents own movement, combat, strategy, assets, and performance.
4. Implement changes on task branches, with explicit file ownership and integration contracts.
5. Run headless Godot import/tests and simulation invariants before merging.
6. Have an independent QA agent inspect regressions, state consistency, and performance.
7. Update decisions, current-state handoff, and asset provenance after each approved merge.

## Migration gates
1. Establish importable Godot 4 project.
2. Import and validate four 3D flight apparatus GLBs, then build actual animation tracks.
3. Implement six-direction mage flight, boost, passive shell, and active barrier.
4. Integrate soldier AI and orders into one authoritative world state.
5. Build progressive world-map → RTS → FPS views.
6. Benchmark Verdun-scale simulation on Windows.

Do not claim the migration is complete until the existing Android implementation is replaced and the Godot project has passed its acceptance tests.
