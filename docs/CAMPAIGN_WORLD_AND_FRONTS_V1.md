# Campaign World and Front Simulation — Design v1
Status: PROPOSED, pending user approval. Godot 4 Windows-first.

## Topic 1: Map hierarchy
Country -> strategic region -> province -> continuous local terrain. Political borders are data overlays, not impassable physical walls. Every province tracks legal owner, military controller and security independently. Armies use continuous world coordinates. Provinces aggregate tax, recruitment, infrastructure and industry. Regions aggregate climate, logistics administration and theater command. Stable geographic IDs tie strategic map to RTS/FPS. Do not create a second battle-world state when zooming in.

## Topic 2: Front formation
Fronts are emergent from opposing deployed formations and terrain, not merely a painted province boundary. Formation order has objective, assigned frontage, reserves, posture, time, confidence and command origin. Engagements begin from real detection, line of sight, weapons reach and opposing maneuver. Artillery, engineers, reconnaissance, reserves and logistics operate across neighboring engagements. Each formation's manpower, shells, fuel, injuries and morale persist across all map modes. Strategic aggregates update distant fronts; tactical simulation owns active engagement resolution; never double-apply losses.

## Topic 3: Logistics
Transport graph with rail, road, water and ports. Supply demand by unit and operation, flow limited by bottlenecks, train/vehicle stock, damaged bridges, weather and interdiction. Units have local reserves. Recalculate graph after meaningful events, not every frame. Rail junction capture can force offensive pause. Engineer repair, depot building and bridge demolition are tactical actions with strategic consequences.

## Topic 4: Industrial economy
Resource extraction -> processing -> civilian and military factories -> equipment stockpiles -> transport -> formations. Population and workforce are regional aggregates. Factories have production methods, input needs, throughput, wear, and conversion delays. Wartime mobilization trades consumer output for military output and increases unrest. No individual consumer simulation.

## Topic 5: Diplomacy and country AI
Each state tracks diplomacy, military access, trade agreements, war goals, neutrality, intelligence, political stability, and mobilization. AI strategic planning uses objectives and known information; no omniscient knowledge. Minor states participate in trade, supply, border politics and war even without complete FPS assets. Additional nations need canon/timeline review before their borders or leaders are locked.

## Topic 6: Military command
National HQ -> theater -> army -> corps -> division -> battalion -> squad. Commanders have traits and initiative. Orders travel through communications with latency, interception, disruption and acknowledgment. Standing orders continue when disconnected. Local commanders react to tactical danger. FPS player possession does not give instant direct control of all distant units.

## Topic 7: Campaign clock and progression
One authoritative simulation clock. World strategic systems tick at lower cadence; active local combat at fixed tactical tick; visual interpolation independent. Research is staged: science -> prototype -> trials -> manufacture -> doctrine. Equipment needs physical delivery and training. Weather, seasons, fatigue, replacement pools and infrastructure damage create operational pacing.

## Topic 8: Performance and Godot implementation
Chunked 3D terrain and independent 2D overlay map. Stable world-space coordinates with origin shifting. Active battles use individual AI and physics within bounded local bubbles; remote fights aggregate into cohorts with deterministic state reconciliation. Event-driven AI and graph recalculation. Target maximum equivalent to Verdun scale as a benchmark goal, not a validated result.

## Cross-layer invariants
1. Same formation and equipment IDs across strategy/RTS/FPS.
2. Sum of surviving soldiers + casualties + missing/captured reconciles against initial and replacement strength.
3. Supplies consumed only once, regardless of view transitions.
4. Command knowledge constrained by actual reports.
5. Save/load reproduces same world and outstanding orders.
6. Every nation's mage equipment and combat restrictions remain distinct; American mage apparatus excluded.
