# Procedural Officer Generation V1 — 2026-10-22
User-approved: supplement canon officers with fictional historically inspired names, as Youjo Senki adapts real-world historical nomenclature.
## Identity tiers
1. Canon characters: exact established names, lore-consistent dates, roles and availability.
2. Historical-inspired originals: altered surnames and plausible period backgrounds, deliberately fictionalized; never label them canon or imply historical endorsement.
3. Procedural originals: culturally/linguistically grounded given names, surnames, particles, ranks, branches and service records.
## Generation
Country-specific weighted name tables and phonotactic templates, with era appropriate naming conventions; avoid caricatures and modern names. Use seeded deterministic RNG keyed by campaign seed + officer stable ID. Persist seed, generated officer ID, resolved name, appointment, skills, traits, experience, relationships, wounds and history only for important officers. Bulk anonymous low-level personnel remain aggregates until promoted into persistence. Enforce uniqueness and collision handling with canonical characters.
## Careers and traits
Background (military academy, reserve, engineer, artillery, rail logistics, naval, mage); years of service, doctrine preferences, competence, ambition, caution, logistics ability, adaptability, loyalty, stress and interpersonal relationships. Traits change decision weights, not mere stat bonuses. Generated history should fit campaign date and rank; promotions and casualties update records.
## Setting guardrails
Do not use literal real historical person's full name as a fictional commander unless intentionally documented; fictionalized variants should remain distinct. No arbitrary transplanting of historical events. Lore source and continuity tags for canonical entries. Nation-specific roles reflect equipment: Empire orb/body propulsion, Entente skis, François mechanical horses, Albish broom/speeder.
## Performance and UI
Generate officers on demand for active appointments, pools and promotions; never pre-generate millions. Save compact persistent records and reuse static dictionaries. Allow user to rename fictional officers, filter staff roster by competence and traits, and see how an officer's behavior differs.
## Tests
Deterministic officer generation across save/reload; uniqueness; country naming rules; rank/date validity; no collisions with canon names; trait-driven plan differences; generated officer can be appointed, promoted, injured and replaced without duplicating records.
