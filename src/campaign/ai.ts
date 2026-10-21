// Strategic AI: musters, picks weak provinces, attacks and resolves battles.

import { stackStrength } from '../data/units';
import { CampaignWorld, FACTION_DEFS, FACTIONS, type FactionId, type Army } from './world';

interface Candidate {
  provinceId: string;
  score: number;
}

export function runStrategicAI(world: CampaignWorld, report: (text: string) => void): void {
  for (const faction of FACTIONS) {
    if (faction === world.player) continue;
    const state = world.factions[faction];

    // Mustering: keep the field army growing while gold allows.
    for (const army of world.armies.filter((a) => a.faction === faction)) {
      if (army.stack.length >= 20) break;
      const options = world.recruitable(faction, army.provinceId);
      if (!options.length) continue;
      const budget = state.gold > 1600 ? 3 : state.gold > 900 ? 2 : state.gold > 400 ? 1 : 0;
      for (let i = 0; i < budget; i++) {
        const pool = options.filter(() => world.factions[faction].gold > 250);
        if (!pool.length) break;
        const pick = pool[(army.id + i) % pool.length];
        world.recruit(army.id, pick);
      }
    }

    for (const army of [...world.armies.filter((a) => a.faction === faction)]) {
      if (!world.armies.find((a) => a.id === army.id)) continue;
      if (army.stack.length === 0) continue;
      let actions = 0;
      while (army.movement > 0 && actions < 2 && world.armies.find((a) => a.id === army.id)) {
        actions++;
        const target = chooseTarget(world, army, faction);
        if (!target) break;
        const hostile = world.hostileIn(target, faction);
        const armyStrength = stackStrength(army.stack);
        if (hostile.army || hostile.provinceOwner) {
          const inv = world.startAttack(army.id, target);
          if (!inv) break;
          const defStrength = stackStrength(hostile.army ? hostile.army.stack : world.province(target).garrison);
          if (defStrength > armyStrength * 1.35 && hostile.provinceOwner === null) break;
          const result = world.autoResolve(inv);
          const wasPlayerProvince = world.province(target).owner === world.player && !inv.playerIsAttacker;
          const msg = world.finishBattle(inv, result);
          world.pushLog(`${FACTION_DEFS[faction].short} attacks ${world.province(target).def.name}: ${msg}`);
          if (wasPlayerProvince) report(`${FACTION_DEFS[faction].short} forces attack ${world.province(target).def.name}. ${msg}`);
          actions = 2;
        } else {
          const msg = world.moveArmy(army.id, target);
          void msg;
        }
        if (!world.armies.find((a) => a.id === army.id)) break;
      }
    }

    // The Allied Kingdom stays out of the great war for the opening turns.
    if (faction === 'alliance' && world.turn === 9) {
      world.factions.alliance.atWar.empire = true;
      world.pushLog('The Allied Kingdom declares war on the Empire!');
      report('The Allied Kingdom has declared war on you.');
    }
  }
}

function chooseTarget(world: CampaignWorld, army: Army, faction: FactionId): string | null {
  const from = world.province(army.provinceId);
  const candidates: Candidate[] = [];
  const atWarWithEmpire = world.factions[faction].atWar.empire;
  const patient = faction === 'alliance' && world.turn < 9;

  for (const neighborId of from.def.neighbors) {
    const p = world.province(neighborId);
    if (p.owner === faction) continue;
    if (p.owner === world.player && !atWarWithEmpire) continue;
    if (patient && p.owner !== null) continue;

    const enemyArmy = world.armiesAt(neighborId).find((a) => a.faction !== faction);
    const strength = stackStrength(enemyArmy ? enemyArmy.stack : p.garrison) + (p.buildings.includes('walls') ? 120 : 0);
    let score = 100;
    score -= strength * 0.25;
    if (p.owner === null) score += 22;
    if (p.owner === world.player) score += 30;
    if (FACTION_DEFS[p.owner ?? 'empire'].capital === p.id) score += 45;
    if (p.def.tier >= 3) score += 18;
    score += p.def.income * 0.1;
    candidates.push({ provinceId: neighborId, score });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].provinceId;
}

export function factionSummary(world: CampaignWorld, faction: FactionId): string {
  const provinces = world.factionProvinces(faction).length;
  const armies = world.armies.filter((a) => a.faction === faction).length;
  return `${FACTION_DEFS[faction].short}: ${provinces} provinces, ${armies} armies`;
}
