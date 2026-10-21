# Youjo Senki: Frontline — design & build plan

Target: installable **Android APK**, playable offline, in the spirit of **Total War: WARHAMMER II**
(campaign layer + real-time tactical battles with pause, morale, formations and magic).

## 1. What exists today

Checked on start:

| Location | Result |
| --- | --- |
| `mlgg8x-alt/RTS-Youjo-Senki` (connected repo) | 2 commits, **0 files** — nothing to continue |
| Worktree / branches / stash / /workspace | empty |
| GitHub account (public repos) | only `Rimworld-Fps-Mode` (Unity RimWorld mod — unrelated) |

So this plan starts from zero. Everything below is delivered in this repo.

## 2. Pillars (WH2 DNA, Youjo Senki skin)

1. **Two layers, one war.** Turn-based strategic map feeds real-time battles; casualties and
   conquered provinces persist. No abstract "auto-battle only" mode.
2. **Battles are about morale, not hit points.** Flanks, charges, artillery shock, general aura
   and aerial mages break lines. Units waver, rout, rally and get run down.
3. **Combined arms.** Line infantry holds; machine guns suppress; field guns crack formations;
   dragoons flank; aerial mages duel above the line and drop magic artillery.
4. **Mobile-first.** One thumb pans/zooms, cards select, long-press issues orders. Pause and
   half-speed exist because Total War without pause on a phone is a punishment.
5. **No asset pipeline.** Terrain, soldiers, effects and UI are drawn procedurally: tiny APK,
   fully offline, no licensing problems.

## 3. Scale targets

| Metric | Target | Delivered |
| --- | --- | --- |
| Soldiers simulated per battle | 2,000+ | ~2,400 (20 units × up to 120 men per side) |
| Unit archetypes | 8+ per roster | 8 Imperial / 8 Republican |
| Provinces on campaign map | 18 | 18, 3 factions |
| Army stack size | 20 units | 20 |
| Battle map | ~700 × 480 m | 720 × 480 m heightmap + woods/village/trenches |
| Frame budget | 60 fps mid-range | fixed 30 Hz sim, render every frame, LOD sprites |
| APK size | < 25 MB | ~1 MB (WebView + bundled JS) |

## 4. Architecture

```
index.html ── app shell (canvas + DOM HUD)
src/
  main.ts          boot, screen router (menu → campaign → battle), save/load
  core/            math, RNG, camera, input (mouse + multi-touch), audio
  data/units.ts    unit archetypes, rosters, abilities
  battle/
    map.ts         procedural heightmap, woods, village, trenches
    battle.ts      fixed-step simulation: formations, combat, morale, projectiles
    ai.ts          tactical battle AI (line advance, artillery focus, cavalry flank)
    render.ts      terrain bake, sprite LOD, effects, minimap
    screen.ts      battle HUD: unit cards, orders, pause, speed, ability targeting
  campaign/
    world.ts       provinces, adjacency, factions, armies, economy, buildings
    ai.ts          strategic AI
    screen.ts      map view, army movement, recruitment, construction, events
  ui/              shared widgets, notifications, tooltips
android/           WebView wrapper (Java), manifest, vector/PNG launcher icons
scripts/build-apk.sh   aapt2 → javac → d8 → zipalign → apksigner
```

Simulation is deterministic-ish (seeded RNG) and runs at a fixed 30 Hz; rendering is decoupled,
so slow phones lose frames, never simulation stability.

## 5. Battle rules

- **Formation:** units are grids of individual soldiers (rows × cols by unit type); width presets
  (narrow / normal / wide) change frontage and depth. Soldiers animate toward their slot, so
  wheeling, charges and routs read visually.
- **Ranged:** ammo-limited volleys with height bonus, woods cover, and "blocked by friends"
  penalty. Artillery fires arcing shells with splash; machine guns burst-fire.
- **Melee:** contact begins when front ranks touch; attack ticks with charge impact (momentum
  bonus decaying over ~6 s), flank/rear multipliers, armour mitigation.
- **Morale:** base morale + general aura + nearby allies − casualties − flank/rear threat −
  artillery shock − aerial magic. Below 25 → *wavering*; below 10 → *rout*. Routers flee,
  can rally when clear of enemies, and are cut down if chased.
- **Magic:** aerial mage companies fly, fire magic bolts, and cast *Magic Artillery* (targeted
  AoE). The ace (Tanya-pattern) has a command aura and a stronger barrage. Flying units can
  only be engaged by other flyers.
- **Victory:** enemy army routed/destroyed, or timer expiry decided on remaining strength.

## 6. Campaign rules

- 18 provinces, 3 factions (Empire, Republic, Allied Kingdom), adjacency graph.
- Army stacks (20 units) with movement points; contact → battle; settlement assault → garrison
  battle. Auto-resolve available for trivial fights.
- Economy: province income + building income, per-unit upkeep, recruitment from barracks tier,
  construction (barracks, foundry, mage academy, walls, industry), siege attrition.
- Strategic AI: recruits, consolidates stacks, advances on weak provinces, defends capitals.
- Victory: hold 12 provinces or take both enemy capitals. Defeat: lose your capital.

## 7. Delivery steps

1. Plan + scaffold (this file, build scripts, toolchain).
2. Battle sim + renderer + HUD, then tactical AI.
3. Campaign world + strategic AI + save/load.
4. Android wrapper, icon, signing, APK build.
5. Verification: typecheck, headless sim tests, APK `aapt dump badging`, dev-server preview
   screenshot, install instructions.

## 8. Known limits / next

- No path-finding around cliffs — terrain slows, never blocks (deliberate for touch play).
- Battles are single-player vs AI; no multiplayer netcode.
- Campaign diplomacy is war/peace only; no trade or vassals yet.
- Next candidates: siege walls with ladders, naval/air maps, hero skill trees, replay export.
