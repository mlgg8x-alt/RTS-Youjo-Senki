// Strategic layer: provinces, factions, armies, economy, recruitment, battles, saves.

import { RNG, clamp, dist } from '../core/util';
import {
  unitType,
  stackUpkeep,
  stackStrength,
  rosterFor,
  type Side,
  type UnitStack,
} from '../data/units';
import type { BattleResult, BattleSetup } from '../battle/battle';
import type { MapKind } from '../battle/map';

export type FactionId = 'empire' | 'republic' | 'alliance';
export const FACTIONS: FactionId[] = ['empire', 'republic', 'alliance'];

export interface FactionDef {
  id: FactionId;
  name: string;
  short: string;
  color: string;
  capital: string;
}

export const FACTION_DEFS: Record<FactionId, FactionDef> = {
  empire: { id: 'empire', name: 'The Empire', short: 'Empire', color: '#c9b47a', capital: 'berun' },
  republic: { id: 'republic', name: 'Republican Alliance', short: 'Republic', color: '#9db4c0', capital: 'parisee' },
  alliance: { id: 'alliance', name: 'Allied Kingdom', short: 'Alliance', color: '#a8b98f', capital: 'albion' },
};

export type Terrain = 'plains' | 'forest' | 'hills' | 'coast' | 'city';

export interface ProvinceDef {
  id: string;
  name: string;
  x: number;
  y: number;
  terrain: Terrain;
  income: number;
  tier: number;
  neighbors: string[];
}

export const BUILDINGS: Record<string, { name: string; cost: number; desc: string }> = {
  barracks: { name: 'Barracks', cost: 280, desc: '+1 recruitment tier in this province' },
  foundry: { name: 'Artillery Foundry', cost: 420, desc: 'Unlocks field guns and howitzers' },
  academy: { name: 'Mage Academy', cost: 620, desc: 'Unlocks aerial mage companies' },
  industry: { name: 'Industry', cost: 350, desc: '+70 gold per turn' },
  walls: { name: 'Fortifications', cost: 320, desc: 'Stronger garrison, defends better' },
};

const PROVINCES: ProvinceDef[] = [
  { id: 'berun', name: 'Berun', x: 17, y: 34, terrain: 'city', income: 240, tier: 3, neighbors: ['nordhaven', 'rhineland', 'ostmark', 'westerwald', 'saar'] },
  { id: 'nordhaven', name: 'Nordhaven', x: 13, y: 13, terrain: 'coast', income: 130, tier: 2, neighbors: ['berun', 'rhineland'] },
  { id: 'rhineland', name: 'Rhineland', x: 30, y: 20, terrain: 'plains', income: 140, tier: 2, neighbors: ['berun', 'nordhaven', 'ostmark', 'saar'] },
  { id: 'ostmark', name: 'Ostmark', x: 29, y: 47, terrain: 'hills', income: 120, tier: 2, neighbors: ['berun', 'rhineland', 'westerwald', 'saar', 'suisse'] },
  { id: 'westerwald', name: 'Westerwald', x: 9, y: 55, terrain: 'forest', income: 100, tier: 1, neighbors: ['berun', 'ostmark', 'orania', 'suisse'] },
  { id: 'saar', name: 'Saar Basin', x: 41, y: 33, terrain: 'hills', income: 110, tier: 2, neighbors: ['berun', 'rhineland', 'ostmark', 'alsace', 'suisse'] },
  { id: 'alsace', name: 'Alsace', x: 57, y: 34, terrain: 'plains', income: 120, tier: 2, neighbors: ['saar', 'suisse', 'verdun', 'lorraine', 'parisee'] },
  { id: 'parisee', name: 'Parisee', x: 82, y: 36, terrain: 'city', income: 250, tier: 3, neighbors: ['verdun', 'alsace', 'lorraine', 'normandie', 'provence'] },
  { id: 'verdun', name: 'Verdun', x: 68, y: 17, terrain: 'hills', income: 130, tier: 2, neighbors: ['alsace', 'parisee', 'normandie', 'lorraine'] },
  { id: 'lorraine', name: 'Lorraine', x: 69, y: 51, terrain: 'forest', income: 110, tier: 2, neighbors: ['alsace', 'verdun', 'parisee', 'provence', 'suisse'] },
  { id: 'normandie', name: 'Normandie', x: 91, y: 15, terrain: 'coast', income: 140, tier: 2, neighbors: ['verdun', 'parisee', 'provence'] },
  { id: 'provence', name: 'Provence', x: 88, y: 59, terrain: 'coast', income: 150, tier: 2, neighbors: ['parisee', 'lorraine', 'normandie', 'toskana'] },
  { id: 'albion', name: 'Albion', x: 52, y: 79, terrain: 'coast', income: 210, tier: 3, neighbors: ['calais', 'dover', 'toskana'] },
  { id: 'dover', name: 'Dover', x: 38, y: 70, terrain: 'coast', income: 120, tier: 2, neighbors: ['albion', 'calais', 'orania'] },
  { id: 'calais', name: 'Calais', x: 61, y: 65, terrain: 'coast', income: 130, tier: 2, neighbors: ['suisse', 'toskana', 'albion', 'dover', 'orania'] },
  { id: 'orania', name: 'Orania', x: 20, y: 71, terrain: 'plains', income: 100, tier: 1, neighbors: ['westerwald', 'dover', 'calais'] },
  { id: 'suisse', name: 'Suisse', x: 48, y: 53, terrain: 'hills', income: 90, tier: 1, neighbors: ['ostmark', 'westerwald', 'saar', 'alsace', 'lorraine', 'toskana', 'calais', 'albion'] },
  { id: 'toskana', name: 'Toskana', x: 75, y: 73, terrain: 'hills', income: 120, tier: 2, neighbors: ['provence', 'suisse', 'calais', 'albion'] },
];

export interface Province {
  id: string;
  def: ProvinceDef;
  owner: FactionId | null;
  buildings: string[];
  garrison: UnitStack[];
  unrest: number;
}

export interface Army {
  id: number;
  faction: FactionId;
  name: string;
  provinceId: string;
  stack: UnitStack[];
  movement: number;
  maxMovement: number;
  hasMoved: boolean;
}

export interface FactionState {
  id: FactionId;
  gold: number;
  atWar: Record<FactionId, boolean>;
}

export interface BattleInvocation {
  setup: BattleSetup;
  provinceId: string;
  attackerArmyId: number;
  defenderArmyId: number | null;
  originProvinceId: string;
  playerIsAttacker: boolean;
  seed: number;
}

export interface WorldSave {
  version: number;
  turn: number;
  seed: number;
  player: FactionId;
  provinces: { id: string; owner: FactionId | null; buildings: string[]; garrison: UnitStack[] }[];
  armies: Army[];
  factions: Record<FactionId, FactionState>;
  log: string[];
}

export class CampaignWorld {
  turn = 1;
  seed: number;
  player: FactionId = 'empire';
  provinces = new Map<string, Province>();
  armies: Army[] = [];
  factions: Record<FactionId, FactionState>;
  log: string[] = [];
  private nextArmyId = 1;

  constructor(seed: number) {
    this.seed = seed;
    this.factions = {
      empire: { id: 'empire', gold: 1200, atWar: { empire: false, republic: true, alliance: false } },
      republic: { id: 'republic', gold: 900, atWar: { empire: true, republic: false, alliance: false } },
      alliance: { id: 'alliance', gold: 800, atWar: { empire: false, republic: false, alliance: false } },
    };
    for (const def of PROVINCES) {
      this.provinces.set(def.id, { id: def.id, def, owner: null, buildings: [], garrison: [], unrest: 0 });
    }
    const starts: Record<string, FactionId> = {
      berun: 'empire', nordhaven: 'empire', rhineland: 'empire', ostmark: 'empire', westerwald: 'empire',
      parisee: 'republic', verdun: 'republic', lorraine: 'republic', normandie: 'republic', provence: 'republic',
      albion: 'alliance', dover: 'alliance', calais: 'alliance', orania: 'alliance',
    };
    for (const [id, owner] of Object.entries(starts)) {
      const p = this.provinces.get(id)!;
      p.owner = owner;
      p.buildings = p.def.tier >= 2 ? ['barracks'] : [];
      if (p.def.tier >= 3) p.buildings.push('industry');
      p.garrison = this.makeGarrison(owner, p.def.tier);
    }
    // Neutral provinces have local militias.
    for (const p of this.provinces.values()) {
      if (!p.owner) {
        p.garrison = [{ typeId: p.def.tier >= 2 ? 'rep_line' : 'rep_line', men: 90 }];
      }
    }

    // Starting field armies.
    this.addArmy('empire', '1st Imperial Army', 'berun', ['imp_line', 'imp_line', 'imp_line', 'imp_gren', 'imp_mg', 'imp_gun', 'imp_drag', 'imp_mage']);
    this.addArmy('empire', '2nd Imperial Army', 'ostmark', ['imp_line', 'imp_line', 'imp_mg', 'imp_gun']);
    this.addArmy('republic', 'Armée du Nord', 'verdun', ['rep_line', 'rep_line', 'rep_line', 'rep_vet', 'rep_mg', 'rep_gun', 'rep_cav', 'rep_mage']);
    this.addArmy('republic', 'Armée du Sud', 'lorraine', ['rep_line', 'rep_line', 'rep_how', 'rep_cav']);
    this.addArmy('alliance', 'Albion Expeditionary', 'albion', ['imp_line', 'rep_line', 'rep_mg', 'rep_gun', 'rep_cav']);
    this.pushLog('War has come to the continent. The Empire marches on the Republic.');
  }

  private makeGarrison(owner: FactionId, tier: number): UnitStack[] {
    const roster = rosterFor(owner === 'alliance' ? 'republic' : owner as Side).filter((id) => unitType(id).tier <= tier);
    if (roster.length === 0) return [];
    const basic = roster[0];
    const count = 2 + tier;
    const out: UnitStack[] = [];
    for (let i = 0; i < count; i++) {
      const id = i === 0 && roster.length > 1 ? roster[1] : basic;
      out.push({ typeId: id, men: unitType(id).men });
    }
    return out;
  }

  addArmy(faction: FactionId, name: string, provinceId: string, types: string[]): Army {
    const army: Army = {
      id: this.nextArmyId++,
      faction,
      name,
      provinceId,
      stack: types.map((t) => ({ typeId: t, men: unitType(t).men })),
      movement: 6,
      maxMovement: 6,
      hasMoved: false,
    };
    this.armies.push(army);
    return army;
  }

  armyById(id: number): Army | undefined {
    return this.armies.find((a) => a.id === id);
  }

  armiesAt(provinceId: string, faction?: FactionId): Army[] {
    return this.armies.filter((a) => a.provinceId === provinceId && (!faction || a.faction === faction));
  }

  province(id: string): Province {
    const p = this.provinces.get(id);
    if (!p) throw new Error(`unknown province ${id}`);
    return p;
  }

  factionProvinces(faction: FactionId): Province[] {
    return [...this.provinces.values()].filter((p) => p.owner === faction);
  }

  income(faction: FactionId): number {
    let total = 0;
    for (const p of this.factionProvinces(faction)) {
      total += p.def.income;
      if (p.buildings.includes('industry')) total += 70;
      total -= p.unrest;
    }
    return Math.round(total);
  }

  upkeep(faction: FactionId): number {
    let total = 0;
    // Field armies cost real money; garrisons are partly local militia.
    for (const a of this.armies.filter((x) => x.faction === faction)) total += stackUpkeep(a.stack) * 0.6;
    for (const p of this.factionProvinces(faction)) total += p.garrison.reduce((s, u) => s + unitType(u.typeId).upkeep * 0.2, 0);
    return Math.round(total);
  }

  /** Units a province can currently recruit for its owner. */
  recruitable(faction: FactionId, provinceId: string): string[] {
    const p = this.province(provinceId);
    if (p.owner !== faction) return [];
    const hasBarracks = p.buildings.includes('barracks') || p.def.tier >= 2;
    if (!hasBarracks) return [];
    const tier = p.def.tier + (p.buildings.includes('barracks') ? 1 : 0);
    const roster = rosterFor(faction === 'empire' ? 'empire' : 'republic');
    return roster.filter((id) => {
      const t = unitType(id);
      if (t.cls === 'hero') return false;
      if (t.cls === 'artillery' && !p.buildings.includes('foundry')) return false;
      if (t.cls === 'mage' && !p.buildings.includes('academy')) return false;
      return t.tier <= tier;
    });
  }

  recruit(armyId: number, typeId: string): string {
    const army = this.armyById(armyId);
    if (!army) return 'Army not found.';
    const p = this.province(army.provinceId);
    if (p.owner !== army.faction) return 'You can only recruit inside your own province.';
    if (army.stack.length >= 20) return 'Army is at full strength (20 units).';
    if (!this.recruitable(army.faction, p.id).includes(typeId)) return 'That unit is not available here.';
    const t = unitType(typeId);
    const faction = this.factions[army.faction];
    if (faction.gold < t.cost) return 'Not enough gold.';
    faction.gold -= t.cost;
    army.stack.push({ typeId, men: t.men });
    this.pushLog(`${army.name} recruits ${t.name}.`);
    return `${t.name} mustered.`;
  }

  build(provinceId: string, building: string): string {
    const p = this.province(provinceId);
    if (p.owner !== this.player) return 'You do not control this province.';
    const def = BUILDINGS[building];
    if (!def) return 'Unknown building.';
    if (p.buildings.includes(building)) return 'Already built here.';
    const f = this.factions[this.player];
    if (f.gold < def.cost) return 'Not enough gold.';
    if (p.buildings.length >= 3) return 'All building slots are used.';
    f.gold -= def.cost;
    p.buildings.push(building);
    if (building === 'walls') p.garrison.push({ typeId: 'imp_line', men: 100 });
    this.pushLog(`${def.name} completed in ${p.def.name}.`);
    return `${def.name} built.`;
  }

  canMoveTo(army: Army, provinceId: string): boolean {
    if (army.provinceId === provinceId) return false;
    if (army.movement <= 0) return false;
    const from = this.province(army.provinceId);
    return from.def.neighbors.includes(provinceId);
  }

  moveArmy(armyId: number, provinceId: string): string {
    const army = this.armyById(armyId);
    if (!army) return 'Army not found.';
    if (!this.canMoveTo(army, provinceId)) return 'That province is not adjacent or movement is spent.';
    army.provinceId = provinceId;
    army.movement = Math.max(0, army.movement - 3);
    const p = this.province(provinceId);
    this.pushLog(`${army.name} marches into ${p.def.name}.`);
    return `Marched to ${p.def.name}.`;
  }

  /** Is there something to fight in this province for this army? */
  hostileIn(provinceId: string, faction: FactionId): { army: Army | null; provinceOwner: FactionId | null } {
    const p = this.province(provinceId);
    const enemyArmy = this.armiesAt(provinceId).find((a) => a.faction !== faction) ?? null;
    return { army: enemyArmy, provinceOwner: p.owner !== faction ? p.owner : null };
  }

  startAttack(armyId: number, provinceId: string): BattleInvocation | null {
    const army = this.armyById(armyId);
    if (!army) return null;
    if (!this.canMoveTo(army, provinceId)) return null;
    const p = this.province(provinceId);
    const defenders = this.armiesAt(provinceId).filter((a) => a.faction !== army.faction);
    const defenderArmy = defenders[0] ?? null;
    const defenderStack = defenderArmy ? defenderArmy.stack : p.garrison;
    if (!defenderArmy && p.owner === army.faction) return null;
    if (defenderStack.length === 0) return null;
    const playerIsAttacker = army.faction === this.player;
    const playerSide: Side = sideOf(this.player);
    const seed = (this.turn * 7919 + provinceId.length * 104729 + army.id * 31 + p.def.x * 13) | 0;
    const kind: MapKind = p.def.terrain === 'city' ? 'village' : p.def.terrain === 'hills' ? 'ridge' : 'field';
    const setup: BattleSetup = {
      playerSide,
      player: cloneStack(playerIsAttacker ? army.stack : defenderStack),
      enemy: cloneStack(playerIsAttacker ? defenderStack : army.stack),
      seed: Math.abs(seed),
      kind,
      attacker: sideOf(army.faction),
    };
    return {
      setup,
      provinceId,
      attackerArmyId: army.id,
      defenderArmyId: defenderArmy ? defenderArmy.id : null,
      originProvinceId: army.provinceId,
      playerIsAttacker,
      seed: Math.abs(seed),
    };
  }

  /** Applies a tactical battle result back onto the campaign map. */
  finishBattle(inv: BattleInvocation, result: BattleResult): string {
    const attacker = this.armyById(inv.attackerArmyId);
    const defender = inv.defenderArmyId ? this.armyById(inv.defenderArmyId) : null;
    const p = this.province(inv.provinceId);
    const defenderStack = defender ? defender.stack : p.garrison;
    const playerWon = result.winner === inv.setup.playerSide;
    const attackerWon = result.winner !== 'draw' && (inv.playerIsAttacker ? playerWon : !playerWon);
    if (attacker) applyRemaining(attacker.stack, inv.playerIsAttacker ? result.playerRemaining : result.enemyRemaining);
    applyRemaining(defenderStack, inv.playerIsAttacker ? result.enemyRemaining : result.playerRemaining);

    let msg = '';
    if (attacker && attacker.stack.length === 0) {
      this.removeArmy(attacker.id);
      msg += `${attacker.name} is destroyed. `;
    }
    if (defender && defender.stack.length === 0) this.removeArmy(defender.id);

    if (result.winner === 'draw') {
      if (attacker) {
        attacker.provinceId = inv.originProvinceId;
        attacker.movement = 0;
      }
      return `${msg}Both armies withdraw from ${p.def.name}.`.trim();
    }

    if (attackerWon) {
      const winnerFaction = attacker ? attacker.faction : this.player;
      if (attacker) {
        attacker.provinceId = inv.provinceId;
        attacker.movement = 0;
      }
      if (defender) {
        defender.stack = defender.stack.map((s) => ({ ...s, men: Math.round(s.men * 0.5) }));
        const fallback = p.def.neighbors.find((n) => this.province(n).owner === defender.faction);
        if (fallback) defender.provinceId = fallback;
        else this.removeArmy(defender.id);
      }
      if (p.owner !== winnerFaction) {
        const old = p.owner;
        p.owner = winnerFaction;
        p.garrison = [];
        p.unrest = 12;
        this.pushLog(`${p.def.name} falls to ${FACTION_DEFS[winnerFaction].name}!`);
        msg += `${p.def.name} captured from ${old ? FACTION_DEFS[old].short : 'the local militia'}. `;
        if (p.id === FACTION_DEFS[winnerFaction].capital) msg += 'ENEMY CAPITAL TAKEN. ';
      } else {
        p.garrison = [];
        msg += `The garrison of ${p.def.name} is broken. `;
      }
    } else {
      if (attacker) {
        attacker.provinceId = inv.originProvinceId;
        attacker.movement = 0;
        msg += `${attacker.name} falls back to ${this.province(inv.originProvinceId).def.name}. `;
      }
      if (!defender) p.garrison = p.garrison.filter((g) => g.men > 20);
    }
    return msg.trim();
  }

  removeArmy(id: number): void {
    this.armies = this.armies.filter((a) => a.id !== id);
  }

  /** Lightweight auto-resolve for AI-vs-AI or player convenience. */
  autoResolve(inv: BattleInvocation): BattleResult {
    const rng = new RNG(inv.seed ^ 0x5bd1e995);
    const pStr = stackStrength(inv.setup.player);
    const eStr = stackStrength(inv.setup.enemy);
    const ratio = pStr / Math.max(1, eStr);
    const playerWins = ratio * rng.range(0.85, 1.2) > 1;
    const winnerSide = playerWins ? inv.setup.playerSide : inv.setup.playerSide === 'empire' ? 'republic' : 'empire';
    const loserLoss = playerWins ? 1 - clamp(ratio, 0.15, 0.95) * 0.7 : clamp(ratio, 0.15, 0.95) * 0.8;
    const winnerLoss = 0.18 + rng.next() * 0.22 + (playerWins ? 1 / Math.max(1.2, ratio) : 0) * 0.15;
    const applyLoss = (stack: UnitStack[], frac: number) =>
      stack.map((s) => ({ ...s, men: Math.round(s.men * clamp(1 - frac, 0.05, 1)) }));
    return {
      winner: playerWins ? inv.setup.playerSide : winnerSide,
      playerRemaining: applyLoss(inv.setup.player, playerWins ? winnerLoss : loserLoss).map((s) => s.men),
      enemyRemaining: applyLoss(inv.setup.enemy, playerWins ? loserLoss : winnerLoss).map((s) => s.men),
      playerCasualties: inv.setup.player.reduce((n, s) => n + s.men, 0) - applyLoss(inv.setup.player, playerWins ? winnerLoss : loserLoss).reduce((n, s) => n + s.men, 0),
      enemyCasualties: inv.setup.enemy.reduce((n, s) => n + s.men, 0) - applyLoss(inv.setup.enemy, playerWins ? loserLoss : winnerLoss).reduce((n, s) => n + s.men, 0),
      time: 0,
    };
  }

  endTurn(): void {
    this.turn++;
    for (const f of FACTIONS) {
      const income = this.income(f);
      const upkeep = this.upkeep(f);
      this.factions[f].gold = Math.round(this.factions[f].gold + income - upkeep);
      for (const a of this.armies.filter((x) => x.faction === f)) {
        a.movement = a.maxMovement;
        a.hasMoved = false;
      }
      for (const p of this.factionProvinces(f)) {
        p.unrest = Math.max(0, p.unrest - 3);
        if (f === this.player) this.topUpGarrison(p);
      }
    }
    this.pushLog(`Turn ${this.turn} — the war continues.`);
  }

  private topUpGarrison(p: Province): void {
    if (p.garrison.length === 0 && p.buildings.includes('walls')) {
      p.garrison.push({ typeId: 'imp_line', men: 80 });
    }
    for (const g of p.garrison) {
      const t = unitType(g.typeId);
      if (g.men < t.men * 0.45) g.men = Math.round(t.men * 0.5);
    }
  }

  pushLog(text: string): void {
    this.log.unshift(`T${this.turn}: ${text}`);
    if (this.log.length > 60) this.log.pop();
  }

  victoryState(): 'playing' | 'victory' | 'defeat' {
    const ownCapital = this.province(FACTION_DEFS[this.player].capital).owner;
    if (ownCapital !== this.player) return 'defeat';
    const enemyCapitals = FACTIONS.filter((f) => f !== this.player).map((f) => this.province(FACTION_DEFS[f].capital).owner !== f);
    const held = this.factionProvinces(this.player).length;
    if (enemyCapitals.every(Boolean) || held >= 12) return 'victory';
    return 'playing';
  }

  save(): WorldSave {
    return {
      version: 1,
      turn: this.turn,
      seed: this.seed,
      player: this.player,
      provinces: [...this.provinces.values()].map((p) => ({ id: p.id, owner: p.owner, buildings: [...p.buildings], garrison: p.garrison })),
      armies: this.armies,
      factions: this.factions,
      log: this.log.slice(0, 20),
    };
  }

  static load(data: WorldSave): CampaignWorld {
    const w = new CampaignWorld(data.seed);
    w.turn = data.turn;
    w.player = data.player;
    w.nextArmyId = Math.max(1, ...data.armies.map((a) => a.id + 1));
    w.armies = data.armies;
    w.factions = data.factions;
    w.log = data.log;
    for (const p of data.provinces) {
      const target = w.provinces.get(p.id);
      if (!target) continue;
      target.owner = p.owner;
      target.buildings = p.buildings;
      target.garrison = p.garrison;
    }
    return w;
  }

  /** Distance used only for AI decisions and map visuals. */
  provinceDistance(a: string, b: string): number {
    const pa = this.province(a).def;
    const pb = this.province(b).def;
    return dist(pa.x, pa.y, pb.x, pb.y);
  }
}

export function sideOf(f: FactionId): Side {
  return f === 'empire' ? 'empire' : 'republic';
}

function cloneStack(stack: UnitStack[]): UnitStack[] {
  return stack.map((s) => ({ typeId: s.typeId, men: s.men }));
}

function applyRemaining(stack: UnitStack[], remaining: number[]): void {
  for (let i = 0; i < stack.length; i++) {
    const men = remaining[i] ?? 0;
    stack[i].men = men;
  }
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].men <= unitType(stack[i].typeId).men * 0.12) stack.splice(i, 1);
  }
}
