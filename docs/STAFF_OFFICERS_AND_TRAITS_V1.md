# Assignable Officers and Staff Traits V1
2026-10-22. User-approved: player can appoint staff with different traits. The following mechanics are proposed, subject to balance.
## Appointment slots
National high command: chief of staff, operations, quartermaster/transport, intelligence, personnel/training, research liaison. Theater: commander, chief of operations, logistics officer. Army/corps: commander and staff leads. Division/battalion: commanders. Individuals cannot hold incompatible simultaneous posts; acting replacements fill vacancies.
## Character records
Stable officer ID; faction; rank; eligibility; command scope; location; appointment; availability; loyalty; competence by domain (strategy, operations, logistics, training, intelligence, mage warfare); traits with strengths/weaknesses; fatigue/stress; experience; relationships; current orders; canon availability window. Named lore characters are campaign-date gated, not universally recruitable.
## Traits alter decisions, not only modifiers
Aggressive: lower attack initiation threshold, faster exploitation, higher accepted losses.
Cautious: higher reserve requirements, slower offensives, fewer exposed flanks.
Logistician: favors throughput, redundant rail routes and forward depot buffers.
Rail specialist: prioritizes train capacity, railhead repairs and redeployment.
Improviser: can reroute around disruptions with higher variability.
Rigid: predictable plans, low deviation from orders even after conditions change.
Independent: adapts faster under broken communications, risks diverging from intent.
Mage specialist: better coordination of reconnaissance/interception/air support; no free magical resources.
Politically connected: more access to resources but may distort priorities.
Each trait has context, explicit utility weights and costs; no omniscience or unlimited authority.
## Player agency
Assign/reassign via staff roster, see estimated competence and personality, set delegation auto/supervised/manual per scope, assign intent and rules of engagement. Appointments affect order quality, response times, supply routing, risk and notification behavior. Promotions, training, exhaustion, injuries, deaths and reassignment create consequences. An absent player does not freeze staff. Reassignment has realistic delay and temporary coordination cost.
## Implementation
Data-driven officer definitions + trait definitions. AI planner takes officer traits, authoritative world snapshot, doctrine, intel confidence and player priorities, outputs typed proposed orders. Authority validator checks before commit. No runtime LLM required. Only named/high-value officers persist as individual character records; generic staff can be compact generated records.
## First test slice
Two officers with different traits receive identical supply shortage and enemy opportunity. Verify different legal plans; both conserve inventory; reassign while FPS continues; save/reload retains appointment; invalid authority rejected; leader loss triggers succession.
## Lore caution
Zettour, Rudersdorf, Tanya and other named officers require date/continuity checks before assigning specific roles. Their suggested traits are design interpretations, not canon stats.
