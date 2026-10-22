# Youjo Senki — Canonical Model Context Archive
Version 3.0 — 2026-10-22. Source of truth for decisions; synchronize WORKFLOW.md and AGENTS.md when modifying.

## Project identity
Godot 4 Windows-first 3D grand-strategy / operational / tactical RTS / squad / FPS hybrid set ONLY in Youjo Senki alternate 1920s. Do not mix in crossover universes. Legacy Android/TypeScript code is not the target. Verdun-scale combat is an upper bound for architecture/performance, not an achieved benchmark.

## LOCKED: One persistent war, layered control
Zoom continuum: WORLD (country, diplomacy, research, economy) -> THEATER (fronts, armies, supply) -> OPERATIONAL (divisions, battalions, artillery, objectives) -> TACTICAL RTS (companies, squads, cover, formations) -> SQUAD/INDIVIDUAL FPS (soldiers and mages). Each layer has its own UI, interaction model, delegated AI and simulation fidelity; they function independently while sharing ONE authoritative persistent world and simulation clock. Zooming does not launch separate battle instances or reset state. Lower-level actions update higher-level outcomes; higher-level orders influence lower-level behavior only via actual command hierarchy and communication. Zoom does not confer authority or omniscience. Player can inspect other layers without leaving ground level where authority/communication permits. Distant formations use aggregate simulation, near formations detailed; deterministic reconciliation prevents duplicate deaths or supplies. Delegated AI keeps all other fronts and squads active when player changes layer.

## LOCKED: National identity and flight
Active mage apparatus: Empire body/leg-mounted propulsion and computation orb; Entente flying skis; François Republic mechanical flying horses; Albish Commonwealth mounted broom/speeder apparatus. Do NOT introduce Unified States/American mage flight apparatus into active roster. Nation-specific flight handling, animations, upgrade trees, weapon firing arcs and doctrine; player camera may look freely but weapons obey apparatus-specific firing constraints. Empire has true dogfighting advantage, full normal-speed six-axis flight including backward/sideways, auto-upright stabilization unless intentional aerobatics. Normal flight has negligible mana cost; boost continuously consumes mana and carries inertia. Passive Mage Shell automatically maintained in combat; active defensive barrier manually triggered. Mana, concentration, injury and shock are separate. Locational injuries only for active FPS character; aggregate wounds elsewhere. Type 95 quad-core exceptional/story-locked, not generic research upgrade.

## LOCKED: Military design
National historically grounded templates with extensive customization. Hierarchy national HQ -> theater -> army -> corps -> division -> battalion -> company -> squad -> individual. Persistent formations and soldiers as fidelity requires, equipment stockpiles, recruits/training, replacement flow, veterancy, morale, suppression, fatigue, command succession. Realistic order transmission latency/acknowledgment, local initiative, standing orders and fog of war. No instantaneous FPS-to-world control.

## PROPOSED: Strategic/economic systems
Country -> region -> province -> local terrain; legal ownership vs military control vs security. Rails, roads, hubs, depots, ports, bottleneck-based supply; industry with regional workforce, resources, production methods, stockpiles and physical equipment delivery. National research dependency graph: science -> prototype -> field trial -> production -> doctrine adoption; distinct Empire, Entente, François and Albish branches. Strategic background countries may exist without complete tactical asset roster; validate canon timeline.

## Asset and legal rules
Original or appropriately licensed assets only. Reference other games for mechanics, not copied proprietary textures, models, code or maps. Archive documents are not proof that GLB models exist. Verify repository files and engine import before claiming assets integrated.

## Decision governance
LOCKED = user-approved; PROPOSED = discussion/implementation candidate; DEFERRED = future. Every new decision requires updating this archive, workflow priorities, relevant acceptance tests, and change log in the SAME change set. Do not silently rewrite locked decisions. Preserve explicit unresolved questions. References: docs/GRAND_STRATEGY_REFERENCE_RESEARCH_V1.md and docs/CAMPAIGN_WORLD_AND_FRONTS_V1.md.

## LOCKED PRIORITY: Supply and transport
Supply inventory and transport capacity are distinct, authoritative and shared across all command layers. Physical shipments, constrained routes, hubs, civilian competition and infrastructure disruption determine delivery; no instant reinforcement or ammunition teleportation. Detailed proposed contract: docs/SUPPLY_TRANSPORT_ARCHITECTURE_V1.md. Implement graph/inventory/shipments early and test cross-layer bridge destruction.

## LOCKED PRIORITY: Automated staff and player delegation
The player sets intent, priorities and restrictions while AI staff handles routine logistics, transport, recruitment, planning and subordinate tactical execution. Per-scope auto/supervised/manual modes; manual does not freeze subordinate execution. Alerts are filtered by significance; command authority, delays and imperfect knowledge apply. Lore research and detailed proposed mechanics: docs/LORE_AND_DELEGATED_STAFF_V1.md. Separate official canon from secondary interpretation.
