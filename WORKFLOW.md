# Executable Development Workflow — Youjo Senki
Version 1.0 — 2026-10-22. Read docs/MODEL_CONTEXT_ARCHIVE.md FIRST. This workflow is a target operating procedure, not evidence an autonomous run or game build has occurred.

## Mission
Build a demonstrably functional Windows Godot 4 game by vertical-slice milestones. Prioritize runnable integration over disconnected documents/assets. One world, independently playable zoom layers, seamless persistent state, delegated AI. Never claim completion without executed tests and build artifacts.

## Start-up for any coding agent
1. Read AGENTS.md, docs/MODEL_CONTEXT_ARCHIVE.md, WORKFLOW.md, docs/GRAND_STRATEGY_REFERENCE_RESEARCH_V1.md, docs/CAMPAIGN_WORLD_AND_FRONTS_V1.md.
2. Inspect actual repository tree, project.godot, installed Godot version and available build/test tools. Distinguish legacy TypeScript from target Godot.
3. Create docs/IMPLEMENTATION_STATUS.md if absent; record what really runs, blockers, and next tasks.
4. Build a dependency-ordered backlog from milestone gates below; pick highest-priority unblocked task.
5. Before coding define inputs/outputs, owned files, tests, and integration contract. Never mark unexecuted tests passing.
6. Implement, run headless Godot import/parse and tests where available, commit in small increments, and update status.
7. On each approved design change update archive + workflow + status/backlog + affected tests together. Log changes and adjust task priorities.
8. Repeat while budget/time/tool access permits; if blocked, document reproducible error and work on another unblocked task. End with a clear handoff.

## Architecture invariants
- One authoritative clock and persistent world-state IDs, independent of render camera.
- Every layer has distinct UI/AI/orders; zoom changes presentation/detail, not battle truth.
- Command authority and communications apply even when FPS player opens a strategic screen.
- Delegation/standing orders keep unattended formations functional.
- State reconciliation across detailed/aggregate simulation conserves personnel, ammunition, equipment, control and infrastructure.
- Windows desktop Godot 4 target; no Android work.
- Nation-specific apparatus and research; no American mage flight equipment.

## Priority gates (each must have a runnable demo and tests)
P0 — Boot: clean Godot project imports/starts on Windows, main menu and save/load stub, automated headless startup test.
P1 — Persistent world: region/province graph, 3D terrain placeholder, political overlay, simulation clock, serialization, selection and zoom controls. Test save/reload identity.
P2 — Layered command vertical slice: WORLD -> THEATER -> OPERATIONAL -> RTS -> SQUAD/FPS and back; shared entity IDs, camera transitions, layer-specific UI, order dispatch, delegation. Test no state reset on zoom and other fronts continue moving.
P3 — Combat: two opposing formations, cover, damage, morale, one mage apparatus prototype, tactical AI and FPS possession. Test casualties/ammo reconcile after switching detail levels.
P4 — Operational logistics: rail hubs, supplies, order delays, reserve reinforcements, artillery. Test destroying bridge affects supply and tactical effectiveness.
P5 — National systems: four unique mage apparatus behavior profiles, national templates, research DAG, production and equipment deliveries. Test each nation mechanically differs and tech is not instantly deployed.
P6 — Campaign: multiple fronts, diplomacy/economy simplified, weather, map modes, campaign saves, AI strategy. Test multi-front simulation during FPS.
P7 — Optimization and release: instrument profiler, stress tests ramping toward Verdun-scale target, Windows export, packaged build, repeatable smoke tests. Do not claim Verdun performance until measured.

## Agent responsibilities
Coordinator: priorities, contracts, merge conflict resolution, scope and milestone gates.
World-state agent: simulation clock, IDs, persistence, state reconciliation.
Map/UI agent: terrain, overlays, zoom/navigation, layer interfaces.
Command/AI agent: hierarchy, communication, standing orders, delegation.
Combat agent: squads, suppression, ballistics, mage flight, possession.
Economy/research agent: factories, logistics, national research, equipment.
QA/integrator: test harness, automated smoke tests, build, regression and profiling.
Canon/assets agent: national accuracy, licenses, provenance and import checks.
Agents must coordinate through committed interface contracts and handoff notes, not assumed inter-agent memory. Parallelize only non-overlapping ownership; integrator serializes merges.

## Required artifacts for each task
Code/data/assets + exact changed paths; test command and result; dependencies and interface notes; status updated; commit hash. On failure record stack trace and minimal repro. Any artifact referenced must exist. Avoid placeholder claims.

## Completion definition
A person can clone repository, install documented Godot 4 version, run a documented command, start game, choose nation, issue world-level order, zoom into active battlefield and FPS, return to map, observe persistent consequences and unattended AI, save/load, and export a Windows executable. All milestone smoke tests run successfully. Full-world content and Verdun benchmark are separately measurable scope; do not promise unattended multi-day success without runtime, credentials, compute and supervision.

## Autonomous agent prompt
'Operate as the project coordinator for this repository. Read AGENTS.md, docs/MODEL_CONTEXT_ARCHIVE.md and WORKFLOW.md. Inspect actual project state. Implement the highest-priority unblocked milestone in Godot 4 Windows-first. Delegate bounded nonconflicting tasks if supported, integrate and test continuously, update archive/workflow/status on approved new design decisions, commit working increments, and keep iterating until completion criteria or resource limits. Never claim tests or builds you did not run. Report blockers and reproducible next steps.'


## Current design-priority overlay (2026-10-22)
The priority gates above describe runnable milestones and are not evidence of implementation. For the latest feature sequencing, geographic-cell treatment, military-control logic, mission/order contracts and interior deferral, read docs/MAP_ORDERS_AND_PRIORITY_DESIGN_V1.md. Preserve the user-reported existing Europe/nation/few-large-provinces map; inspect before modifying. First integrated operational loop: issue capture order -> delegated movement/combat -> local ground control/frontline changes -> cross-zoom persistence -> save/load. Interiors remain TODO, not a blocker.

## Refactoring and replacement policy (approved 2026-10-22)
Agents MAY rewrite, refactor, migrate, or remove existing code, data pipelines, map systems, scenes, and assets when inspection shows they are obsolete, incompatible with approved architecture, redundant, broken, or materially obstruct the next milestone. 'Preserve existing work' means avoid unnecessary destruction, NOT a prohibition on replacing outdated implementations. Before major rewrites: inspect dependencies and behavior; document the reason, replacement contract, migration/state compatibility needs, and regression tests; preserve useful features and data where practical; implement and validate the replacement incrementally; update affected documentation/status. Do not preserve obsolete code solely because it already exists. Do not rewrite functional systems without a clear benefit. Design decisions remain authoritative, but implementation is replaceable.
