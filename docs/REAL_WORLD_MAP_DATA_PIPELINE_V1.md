# Real-World Geography and Historical Infrastructure Foundation V1
2026-10-22 — LOCKED decision: real Earth geography underpins the Youjo Senki map; fictional borders/names/history overlay it.
## Data layers
1. Immutable-ish geospatial reference: coastlines, elevation, drainage, terrain. Natural Earth public-domain 110m/50m/10m scales for strategic views; higher-resolution DEM and land-cover only as licensed/needed.
2. Time-filtered infrastructure around 1923: settlements, rail, roads, bridges, ports, factories, farms and depots. Prefer documented historical datasets such as OpenHistoricalMap (public-domain project), georeferenced historic maps and curated scenario edits. Contemporary OSM is NOT evidence an asset existed in 1923; modern roads and cities cannot be imported as-is. Record source, date validity, confidence and licensing per feature.
3. Fictionalization: Youjo Senki political borders, naming, military positions, scenario war damage and custom installations. Override source features rather than corrupting base geodata.
## Map pipeline
Offline import to normalized GeoJSON/GeoPackage or custom compact data -> validate coordinate systems and feature topology -> build hierarchical country/region/province, city and transport graphs -> convert coordinates to stable Godot world/local tile coordinates -> precompute strategic map LOD and terrain chunks -> stream visual assets near camera. Preserve stable geospatial IDs, determinism and seed. No runtime map downloads or per-building save files.
## Start state
A scenario loads an already-functioning world: populated cities, civilian demand, stocked depots, functioning rail/roads/ports, deployed formations and assigned staff. AI logistics and economies run from tick one. Save only differences from base scenario, plus active shipments, inventories, orders and unique IDs.
## Prototype
Start with a bounded Europe/Empire-border region using Natural Earth geometry, historical rail graph and authored Youjo Senki overlays. Demonstrate same rail junction at strategic and FPS scales; bridge sabotage changes route capacity; logistics AI reroutes; save/load preserves result. Expand world coverage once importer, streaming and cross-layer fidelity work.
## Verification
Check no post-1923 roads/bridges leak into scenario; licensing provenance; connected rail graph; map tile continuity; coordinates across zoom; stable IDs; performance budgets; save delta size; AI starts with working infrastructure.
Sources: https://www.naturalearthdata.com/downloads/ ; https://www.openhistoricalmap.org/ ; https://wiki.openstreetmap.org/wiki/Open_Historical_Map/FAQ
