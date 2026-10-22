# Lore-Grounded Automation and Delegation V1 — 2026-10-22
Status: user-approved goal: extensive automatic management, with player control at every zoom layer. Specific implementation is proposed.
## Canon grounding
Official series: 1923 Norden incident; 1926 Salamander Kampfgruppe and Eastern Front winter supply disruption; Ildoa strict neutrality complicates Imperial maritime withdrawal. Empire Plan 315 interior-lines railway concentration is detailed in secondary lore; distinguish canon versions and check light novel/anime conflicts. Sources:
https://youjo-senki.jp/tv/story/introduction.html
https://youjo-senki.jp/story.html
https://youjo-senki.fandom.com/wiki/Empire
https://youjo-senki.fandom.com/wiki/Nations
## Player intent, staff execution
Every scope has delegated controllers. World: policy and national priorities; theater: offensive/defensive goals, front allocation; operational: formations, reserves, railhead and supply; RTS: squad orders and tactics; FPS: possession and squad command. Player may override any delegated plan within actual authority and communications. Zoom never changes underlying authoritative clock, logistics, battles or orders.
## AI staff offices (gameplay abstraction, not canonical labels)
General Staff: theaters, reserves, strategic risks and diplomacy requests.
Operations: plans, synchronized orders, objectives, artillery allocation.
Quartermaster/transport: depot placement, stock reserves, capacity routing, trains, convoys, repair priorities, escorts and replacement transport.
Personnel: conscription, training, replacements and rotation.
Intelligence: recon reports, confidence, stale data, counterintelligence.
Local commanders: execute mission orders, adapt to threats, preserve forces.
## Automation modes
AUTO (default): staff handles routine operations and alerts on major decisions.
SUPERVISED: staff proposes plans and waits for authorization on costly/risky actions.
MANUAL: player controls selected responsibilities, but unattended lower levels still execute standing orders; no global AI freeze.
Configure modes per theater, army, supply route or unit, not just globally. Support templates and delegation inheritance.
## Doctrine and imperfect AI
National staff has distinct planning biases; Empire prioritizes interior rail transfers and concentration, Entente winter defense, François artillery preparation, Albish naval convoy security. Doctrine shapes decisions but never provides omniscience. Command latency, imperfect reports, officer competence, political restrictions and supply constraints matter. AI uses deterministic planners and rules for core economy/logistics and utility/behavior planners for tactical decisions; avoid runtime LLM dependency, internet calls or unpredictable costs.
## Notifications
Only interrupt player for urgent threats, failed major objectives, diplomatic decisions, strategic shortages or direct override requests. Routine train departures, squad resupply and small replacements are summarized in expandable staff reports. Provide why decision happened, expected consequences and one-click override. Pause/slow-time options should not be required for routine management.
## Technical contracts
Staff planners operate on shared read-only snapshots, propose typed intent orders with IDs, priorities, expiry, authority, provenance, resource reservations and validation; authoritative order dispatcher checks authority and commits once. Event bus notifies disruptions. Per-domain scheduler budgets CPU independently of camera zoom. Record meaningful decisions and consequences in bounded journal, not per-agent thought traces.
## First playable automation slice
One theater commander with HOLD/ADVANCE objective; quartermaster automatically routes ammunition from depot over rail and road, reroutes after bridge damage, escalates severe shortage; one tactical commander executes standing orders; player zooms into FPS and back while all continue. Test determinism, conservation, order validation, interruption thresholds, save/load, AI continuity and manual override. Start with rule-based AI before richer behaviors.
## Continuity governance
Keep source references and canon confidence tags (official/novel/anime/fan secondary/inference). New lore research must update archive and workflow; do not treat fan wiki inference as indisputable canon.
