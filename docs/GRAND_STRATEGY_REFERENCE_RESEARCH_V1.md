# Grand Strategy Systems Research — Reference Adaptation v1.0
Date: 2026-10-22
Status: PROPOSED architecture; not yet implemented. Windows-first Godot 4. No Android. No third-party proprietary art copied.

## References and adaptation boundaries
- Hearts of Iron IV: province/state overlays, national research, military production, railway hubs, train/truck/port logistics and vulnerable supply routes. Sources: https://devtrackers.gg/heartsofiron/p/360fc4aa-dev-diary-supply-a-first-look and https://store.steampowered.com/news/posts/?appids=394360&enddate=1631106048&feed=steam_community_announcements
- Victoria 3: goods, industrial buildings, workforce and selectable production methods. Source: https://www.youtube.com/watch?v=K3dJb4TZNQE
- Crusader Kings III: commander traits and personal relationships as design inspiration (do not reproduce interface/assets).
- Total War / WARNO: formations, tactical unit cards, suppression and reconnaissance as design inspiration (not code).
- Godot GridMap: grid-based 3D placement, sparse octants: https://docs.godotengine.org/en/4.6/classes/class_gridmap.html
- Godot MultiMeshInstance3D: repeated 3D decorations and distant units: https://docs.godotengine.org/en/4.6/classes/class_multimeshinstance3d.html
All mechanics below are original adaptation proposals. Use licensed/CC0 assets only; verify each asset's license and attribution before import.

## Authoritative simulation architecture
One deterministic authoritative world model. Distinct presentation modes: strategic world map -> operational theater -> tactical RTS -> soldier/mage FPS. Camera zoom must not instantiate an independent parallel battle simulation. Entity IDs and persistent order/ammo/wounds/morale state survive LOD transitions. Strategic province resolution and active tactical combat must never apply duplicate casualties. Use fixed simulation ticks with per-domain update cadence; graphics interpolate separately. A Verdun-scale battle is the maximum design target, NOT a claim of validated performance.

## Geography and state
Country > strategic region > province > local tactical cells. Provinces have immutable id, owner/controller, neighbors, terrain, elevation band, climate, infrastructure, settlement/industry, resources, population aggregates, rail junctions, depots, forts and airfields. Borders and ownership are independent from terrain mesh. Province adjacency is a graph, while the 3D visual map uses streamed terrain chunks. Tactical coordinates map to global world coordinates by stable georeference and origin shifts. Persistent destruction changes tactical cover and strategic infrastructure.

## Strategic map modes
Political control, diplomatic alignment, front lines, rail/supply, resource extraction, factory output, infrastructure damage, weather, reconnaissance confidence, mage operations, resistance and fortifications. Fog of war is intelligence-based: no instant perfect view of enemies. Overlay colors/icons must have colorblind-safe labels. Clicking province opens economy, garrison, construction, logistics and commander panels.

## Logistics — supply network
Directed multigraph: factories/capitals/ports -> rail edges -> hubs/depots -> local delivery -> battalions. Each edge has capacity, travel time, damage, security, weather and gauge compatibility. Effective flow constrained by route bottleneck, hub handling and transport stock (trains/trucks/horse wagons/ships). Supply categories: food, small-arms ammunition, artillery shells, fuel, spare parts, medical stores, mage apparatus parts. Units carry local reserves. Isolation causes graduated penalties (ammo scarcity, reduced recovery, slower movement, attrition), not instant zero effectiveness. Rail bridges, depots, ports and junctions are military objectives. Captured infrastructure may need repairs and conversion before full use. Sea routes require convoy capacity and face interdiction. Supply paths recalculate on graph changes or coarse scheduled intervals, not each frame.

## Economy — deliberately simplified Victoria-like model
Regional workforce pools and skilled-labor fractions, not per-citizen agents. Extractive industries: coal, iron, oil, timber, agricultural goods. Processing: steel, chemicals, machine parts, textiles. Military output: rifles, MGs, artillery, shells, trains, trucks, mage equipment, ship components. Buildings consume labor, energy and input goods; choose production methods (e.g. labor-intensive vs mechanized) with tradeoffs in input use and output. Shortages propagate into equipment stockpiles and deployment. Market/trade abstraction by region and trade route, avoiding full individual purchase simulation. Civilian demand, unrest and mobilization impose opportunity costs. Strategic economy ticks at coarse intervals, not FPS rate.

## Military production and fielding
Research -> prototype -> trial -> standardization -> factory production -> depot delivery -> unit refit -> training/doctrine adoption. New equipment does not appear instantaneously. Variant manufacturing consumes scarce specialists and materials. Unit equipment manifests are persistent; casualties and captured stockpiles matter. Separate technical unlocks from doctrine proficiency.

## National research progression
Research is a dependency DAG with 5 conceptual stages: established, refinement, specialization, experimental, breakthrough. Research capacity: institutions, skilled researchers, funding, test facilities, battlefield reports and captured equipment. Progress can pause due to material shortages or politics. National branches:
- Empire: Type 13 -> improved formula processing -> Type 97 dual-core; thrust vectoring; assault doctrine; responsive artillery. Type 95 quad-core is story-locked exceptional equipment, not a generic tier.
- Entente: flying skis -> cold-weather stabilization -> interception and high-speed descent; alpine reconnaissance, winter supply and defensive artillery.
- François Republic: mechanical flying horse -> reinforced chassis -> rider stabilization -> formation assault/endurance; mass artillery and fortification engineering.
- Albish Commonwealth: mounted broom/speeder -> endurance/thrust control -> naval mage coordination; signals intelligence, convoy and expeditionary doctrine.
No Unified States/American mage apparatus in the active roster. A country may exist on the strategic map without a playable mage apparatus or complete FPS roster.
National doctrine differentiation must persist through RTS AI and player possession. Imperial normal six-axis flight has full-speed backward/sideways movement and automatic upright stabilization; aerobatics intentional. Flight apparatus constrains weapon firing arcs; Empire has a genuine maneuvering/firing advantage. Arc numbers are provisional.

## Commander system
Command hierarchy: national HQ -> theater -> army -> corps -> division -> battalion -> squad. Officers have skill, initiative, caution, stress, relationships, reputation and doctrine affinity. Orders require valid communication route, incur delay, may be acknowledged, lost, intercepted or superseded. AI executes standing orders while disconnected. Player FPS possession does not grant global command omniscience.

## Tactical layer and map rendering
Near battles: individual agents, ballistic LOS, suppression, cover, morale, local command and active mage flight. Far battles: cohort/formation aggregate with bounded stochastic outcomes and persistent accounting. GridMap useful for modular buildings/trenches, not as the sole whole-world terrain representation. Streamed terrain meshes for regional topography; MultiMesh for trees, fence posts, distant soldiers and props, partitioned by chunks for culling. Strategic overlays are 2D data-driven polygons/lines rendered over 3D terrain. Do not render millions of individual simulated soldiers. Profile CPU, draw calls, memory and state reconciliation.

## Initial country content
Active flight-equipment roster: Empire, Entente Alliance, François Republic, Albish Commonwealth. Strategic background candidates (timeline/canon validation required): Russy Federation, Ildoan Kingdom, Dacian Grand Duchy, Akitsushima Dominion, Unified States, neutral minor states. Non-playable countries can have diplomacy, resources, research and armies without full FPS asset sets. Canon/timeline verification required before assigning definitive leaders, borders or war dates.

## Data contracts (suggested)
Province {id, region_id, owner_id, controller_id, neighbors[], terrain_id, infrastructure[], stockpiles{}, workforce{}, intel_confidence}
SupplyEdge {from_id, to_id, mode, throughput, latency, damage, contested, weather_factor}
ResearchNode {id, nation_id, prerequisites[], research_cost, facility_requirements[], prototype_cost, unlocks[], status}
EquipmentVariant {id, nation_id, chassis_id, components[], production_cost{}, performance{}, compatible_units[]}
Formation {id, nation_id, location, manpower, equipment{}, supply_reserve{}, morale, cohesion, commander_id, orders_version}
Commander {id, hierarchy_parent, initiative, traits[], communications_state, standing_orders[]}
All IDs stable, serialized and validated. No hardcoded faction-specific logic in generic supply solver.

## Proposed development order and acceptance criteria
1. Province graph + ownership + political/supply overlays; test neighbor symmetry, save/load, selection.
2. Railway/hub supply solver with bottleneck, disruption and recovery; test isolated army supply degradation.
3. Regional production methods, inventories and equipment deliveries; conservation tests.
4. National research DAG, prototypes and variant factories; prerequisites and uniqueness tests.
5. Commander hierarchy, order latency and fog of war; no omniscient orders.
6. Operational-to-RTS state reconciliation and mage apparatus integration; deterministic battle outcome accounting.
7. Verdun-scale stress benchmark and LOD profiling on Windows.
Do not mark features implemented until tested in Godot. Avoid copying copyrighted game code, UI layouts, art, maps or models.
