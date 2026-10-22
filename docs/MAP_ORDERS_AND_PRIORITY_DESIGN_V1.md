# Map, Orders, Territory, Interiors and Workflow Decisions V1
2026-10-22. DESIGN SPECIFICATION, NOT IMPLEMENTATION STATUS. Preserve existing map/code until inspected.

## Scope and current user-described baseline
- Youjo Senki-only alternate 1920s Europe, Windows-first Godot 4 grand-strategy/RTS/FPS hybrid.
- User reports that a substantial European map exists, with nations containing a few large provinces each; finer map details are not yet established. Do not infer which systems are actually coded.
- Geographic cells are irregular and differ in physical area and outline. Tactical geographic cutouts correspond to the footprint of their parent cell. Preserve existing nation/province and cell architecture; do not rebuild the map to satisfy this spec.

## Visual map target
- Historical general-staff atlas aesthetic: subdued parchment, olive terrain, blue-gray rivers and seas, relief for mountains, differentiated forests/farmland, period railway and road symbology, restrained labels and readable military counters.
- Nation tint is translucent over geographic terrain; political borders more prominent than thin administrative province borders. A handful of large provinces per nation remain administratively useful.
- High-level labels: nations, province names, capitals, important rail junctions and large formations; progressive detail reveals towns, roads, trenches, buildings, squads and soldiers. Avoid clutter and labels overlapping.
- Continuous camera presentation from European strategic map through nation, province, geographic sector/cell, settlement, neighborhood/street, building exterior and unit/FPS. These are conceptual detail bands, NOT mandatory separate scenes, map copies or loading screens.
- Suggested UI map modes: political, military control, logistics/transport, economy/industry, intelligence. Overlays shift emphasis while retaining terrain readability. Tactical camera can hide political decorations.
- Distinct visual layers: legal/political borders, actual military control boundary, active contact/frontline, planned defensive line, offensive arrows, disputed ground, last-known enemy contacts. A player-drawn line is an ORDER, not instant territorial ownership.
- Terrain and important infrastructure features retain world-space identity across strategic and tactical views. Geographic cell borders are streaming partitions and never automatically victory boundaries.

## Geography hierarchy and streaming
Europe/world -> nation -> large province -> geographic sector/cell -> settlement/local terrain -> neighborhood/street -> building/exterior/interior. Nation/province are administrative containers; roads, rivers, battles, cities and structures can cross their boundaries. Streaming cells are independently shaped and sized and need not align with administrative polygons.
- Keep one authoritative persistent world coordinate/feature identity, and derive level-of-detail views from it. Stream adjacent terrain when crossing a cell edge. Do not duplicate casualties, damage, inventory or structure state when changing view.
- Objective count depends on actual geographic and military features, NOT cell size or an arbitrary fixed number of capture points.

## Military territory, fronts and victory
- A cell is territory to traverse, occupy, defend or bypass, not an isolated match to win. Cells and provinces may be partially occupied/contested.
- Store separately: legal ownership; physical occupation/control of ground; ability to secure/operate routes and administer area; hostile influence/contestation. Artillery denial and airborne scouting alone do not capture ground.
- The military control boundary follows the outer edge of reliably held ground, including through province and cell interiors. An ACTIVE frontline is the subset with enemy contact/threat; quiet control borders need not be active fronts.
- Frontline and contested pockets update from troop presence, local defensibility, sustained supply and enemy activity; use scalable/adaptive spatial summaries for quiet areas and detailed control in active battlefields. Do not snap fronts to administrative or streaming borders.
- Mission success is separate from territorial control: capture and hold rail junction plus approaches; establish bridgehead; break defense; delay enemy; evacuate forces; raid depot; cut supply; withdraw intact. Opposing sides can both partly meet objectives. No generic capture-60%-of-tile win rule.
- Tactical combat consequences (bridge destroyed, village occupied, formation routed) persist and update higher-level transport, territory and operations.

## Hierarchical order management
- Three human-facing order tiers: STRATEGIC INTENT (capture city, defend front, secure rail corridor); OPERATIONAL (advance axis, hold river, artillery preparation, coordinated H-hour); TACTICAL (suppress, move to trench, intercept mages).
- Ordinary orders require few controls: objective, target, risk posture, autonomy. Optional advanced settings: priority, timing, limits, rules of engagement, supply constraints, contingencies and coordination. Easy to issue, sophisticated to execute, optional micromanagement.
- One persistent order identity/lifecycle: issued -> transmission -> received/acknowledged -> staff planning -> executing -> completed/failed/superseded/cancelled. Include issuer, authorized recipient, command scope, target, issue time, priority, constraints, parent/child orders, status, acknowledgment and reports.
- Staff translates higher-level mission into appropriate subordinate tasks, not blindly cloning orders. Communication delays, broken links, stale intelligence, standing orders, local initiative and commander traits affect execution. Officers can act within granted authority; direct player possession overrides relevant delegated micro-behavior without erasing the parent operation.
- Conflicting orders resolved through explicit authority, scope, supersession and safe local survival reactions; retain audit/report history for meaningful orders, not every animation or pathfinding step.
- AI staff can automatically detect threatened fronts, assign sectors, reposition reserves and report exceptions. Player may draw desired defense/offense lines that commanders attempt to establish.
- Save meaningful mission/order objects and aggregated outcomes, not an enormous persistent tree of per-soldier action commands.

## Buildings and interiors: DEFERRED
- Near-term: exterior building objects integrated into existing geographic cells; persistent stable building IDs, ownership, damage, occupants, cover/defense, entrances. Abstract garrison/occupation can precede room navigation.
- Interior rendering, loading method and interior/exterior transition are TODO / DEFERRED; do NOT lock seamless interiors, instanced scenes or any specific rendering approach now. Future design may use simplified, instanced or selective seamless interiors sharing authoritative building state.
- Do not refactor terrain streaming or delay the military vertical slice to implement interiors.

## Development workflow priorities (targets, not assertions of completion)
P0: Inspect and preserve actual map implementation; establish authoritative world state, coordinate consistency, persistent IDs, simulation clock and save/load across geographic cells.
P1: Hierarchical orders, command authority, dispatch, basic delegation and one end-to-end capture/defend mission.
P2: Ground occupation, contested areas, calculated frontlines, mission objectives/results independent of province/cell edges.
P3: Cross-cell formation movement and combat with persistent casualties, damage and control.
P4: Automated officers and standing orders with trait-influenced planning, local initiative, reserve and exception management.
P5: Physical supply/transport graph, inventory, capacity, shipments, damage and rerouting, integrated into operations (lay data contracts early even if richer logistics comes later).
P6: Tactical RTS/FPS control of the same battle state while other fronts continue.
P7: Economy, recruitment, production, national mage equipment/doctrine and campaign systems.
P8: Intelligence, diplomacy, expanded national mechanics, optimization and measurable Verdun-scale stress targets.
DEFERRED: Interior rendering and navigation; no required implementation until prioritized later.
Priority numbering indicates desired dependency/order, not completed work; reconcile with boot/build/test gates in WORKFLOW.md.

## First acceptance milestone: operational loop
On the existing European map: select an Imperial formation -> issue capture-location order -> authorized staff receives/plans -> formation moves across relevant geographic boundaries -> opposing force engages -> objective and occupied ground update -> visible front shifts -> zoom in/out preserves state -> save/reload preserves results -> other fronts continue simulating. Test both small and large irregular cells and partially occupied provinces. Implement only after inspecting actual repository state.

## Open design questions
Exact control-field resolution, visual zoom thresholds, precise officer planning heuristics, command latency models, structure-interior approach, historical data provenance for local details, and performance budgets remain to be determined. Do not claim they are implemented.
