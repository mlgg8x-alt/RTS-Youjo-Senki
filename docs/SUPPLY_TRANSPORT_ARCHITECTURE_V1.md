# Supply and Transport Architecture V1 — 2026-10-22
Status: approved priority (supply/transport central); detailed mechanics below are proposed defaults awaiting playtest.
## Distinct resources and physical delivery
Supply = goods in inventory; transport = moving goods/personnel along constrained links. No instant global stockpile access. Commodities: food, small-arms ammunition, artillery shells, fuel, medical supplies, construction materials, weapons, mage apparatus and replacement personnel. Factories/farms -> national depots -> rail/port hubs -> forward depots -> unit inventories. Civilian demand competes for shared capacity. A depot has real stock, throughput, loading capacity and storage limits.
## Network
Persistent graph nodes: production site, station, junction, depot, port, formation; edges: rail, road, sea lane, foot/pack trail. Each edge stores capacity per simulation interval, traversal time, integrity, gauge/compatibility where relevant, ownership/control, interdiction exposure, weather modifier and congestion. Bridges, tunnels, rolling stock, locomotives, trucks, ships and draft animals affect usable capacity. Sea routes require ports and shipping; naval threats can disrupt them. Trains and convoys may be aggregated into shipment tokens except when tactically relevant.
## Scheduling
Orders reserve goods at origin, reserve capacity along a feasible route, create in-transit shipments with ETA and risk; delivery credits destination once, never on dispatch. Replanning handles damaged links and shortages. Fair allocation uses player priority, military urgency, civilian minimums and capacity constraints. Distance alone is not supply efficiency. Unit supply draw uses stock, consumption and last-mile capacity; shortage affects firing, movement, medical outcomes, cohesion and combat sustainability.
## Cross-layer gameplay
WORLD: national logistics policy, strategic reserves, infrastructure investment, import/export.
THEATER: supply corridors, depots, railhead prioritization, shipping and reserves.
OPERATIONAL: bridge repairs, routes, convoy security, depot placement, artillery ammunition allocation.
RTS: capture stations, interdict railways, destroy bridges, defend convoys, raid depots.
FPS: personally sabotage track, seize truck or defend supply train; authoritative damage event updates network, route capacity and supply availability.
Logistics simulation is independent of zoom and FPS presence.
## Computational/storage design
Persist graph topology, changed infrastructure, depot inventory, active shipment manifests, formation inventory, orders and deterministic event IDs. Static routes in shared data. Avoid per-crate/per-bullet world entities and per-frame all-pairs route searches. Cache routes, invalidate affected subgraphs on infrastructure changes, schedule logistics in coarse time steps and event-driven disruptions. Shipments aggregate homogeneous cargo until detailed encounters. Serialization includes versioning, conservation audits and save/load.
## Tests
1. Shipments consume origin inventory on dispatch and credit destination once upon arrival; losses remain losses.
2. 1000 shells in national reserve cannot fire at disconnected frontline.
3. Bridge destruction removes/reduces route capacity, reroutes eligible shipments, causes measurable frontline shortage; repairs restore capacity.
4. Same events from world map and FPS produce identical authoritative bridge state.
5. Zoom and save/load do not duplicate shipments, stock or casualties.
6. Two competing formations receive limited throughput according to explicit priorities, without creating goods.
7. Logistics continues on distant fronts during player FPS combat.
## Milestone shift
Implement logistics graph + inventory + transport scheduling as P2A immediately after persistent world foundations, before full multi-layer combat; integrate into P2/P3 vertical slice and test bridge sabotage as cross-layer acceptance. Advanced naval shipping, rail gauge, civilian economy and weather complexity may be staged later.
