// Unit archetypes for both armies, plus roster helpers shared by campaign and battle.

export type Side = 'empire' | 'republic';
export type UnitClass = 'infantry' | 'gun' | 'artillery' | 'cavalry' | 'mage' | 'hero';

export interface Ability {
  name: string;
  radius: number;
  damage: number;
  cooldown: number;
  range: number;
  cost?: number;
}

export interface UnitType {
  id: string;
  name: string;
  short: string;
  cls: UnitClass;
  men: number;
  hp: number;
  armor: number;
  meleeAtk: number;
  meleeDef: number;
  charge: number;
  speed: number;
  range: number;
  damage: number;
  reload: number;
  ammo: number;
  accuracy: number;
  morale: number;
  cost: number;
  upkeep: number;
  tier: number;
  icon: string;
  color: string;
  flying?: boolean;
  evasive?: number;
  splash?: number;
  shots?: number;
  ability?: Ability;
  aura?: { radius: number; morale: number };
  mount?: boolean;
  desc: string;
}

const IMP_COLOR = '#c9b47a';
const REP_COLOR = '#9db4c0';

export const UNIT_TYPES: Record<string, UnitType> = {
  // ── Imperial ───────────────────────────────────────────────────────────────
  imp_line: {
    id: 'imp_line', name: '14th Line Infantry', short: 'Line', cls: 'infantry',
    men: 120, hp: 6, armor: 2, meleeAtk: 6, meleeDef: 6, charge: 4, speed: 4.3,
    range: 120, damage: 0.9, reload: 4.5, ammo: 22, accuracy: 0.55, morale: 62,
    cost: 240, upkeep: 55, tier: 1, icon: 'I', color: IMP_COLOR,
    desc: 'Rifle line. Holds formation and trades volleys; brittle if flanked.',
  },
  imp_gren: {
    id: 'imp_gren', name: 'Assault Grenadiers', short: 'Gren', cls: 'infantry',
    men: 96, hp: 7, armor: 3, meleeAtk: 9, meleeDef: 7, charge: 9, speed: 4.6,
    range: 95, damage: 1.1, reload: 5, ammo: 16, accuracy: 0.52, morale: 72,
    cost: 340, upkeep: 80, tier: 2, icon: 'G', color: '#d8c48c',
    desc: 'Shock infantry. Short-range carbines, brutal close assault.',
  },
  imp_mg: {
    id: 'imp_mg', name: 'Heavy MG Detachment', short: 'MG', cls: 'gun',
    men: 32, hp: 6, armor: 2, meleeAtk: 2, meleeDef: 3, charge: 0, speed: 3.5,
    range: 168, damage: 3.2, reload: 3.5, ammo: 44, accuracy: 0.5, morale: 55,
    cost: 320, upkeep: 75, tier: 2, icon: 'M', color: '#b9a06a',
    desc: 'Sustained fire. Shreds dense formations, dies to a charge.',
  },
  imp_gun: {
    id: 'imp_gun', name: 'Field Gun Battery', short: 'Gun', cls: 'artillery',
    men: 28, hp: 5, armor: 1, meleeAtk: 1, meleeDef: 2, charge: 0, speed: 2.6,
    range: 380, damage: 52, reload: 13, ammo: 16, accuracy: 0.5, morale: 48,
    cost: 400, upkeep: 95, tier: 2, icon: 'A', color: '#a89058',
    splash: 5, shots: 4,
    desc: 'Four 8cm guns. Long range, slow reload, punishes clumps.',
  },
  imp_how: {
    id: 'imp_how', name: 'Siege Howitzer Battery', short: 'How', cls: 'artillery',
    men: 32, hp: 5, armor: 1, meleeAtk: 1, meleeDef: 2, charge: 0, speed: 2.2,
    range: 460, damage: 78, reload: 19, ammo: 10, accuracy: 0.42, morale: 46,
    cost: 520, upkeep: 120, tier: 3, icon: 'H', color: '#9c844f',
    splash: 8, shots: 3,
    desc: 'Arcing shells with a huge burst. Poor accuracy, devastating splash.',
  },
  imp_mage: {
    id: 'imp_mage', name: 'Aerial Mage Company', short: 'Mages', cls: 'mage',
    men: 24, hp: 8, armor: 1, meleeAtk: 3, meleeDef: 4, charge: 2, speed: 13,
    range: 150, damage: 1.5, reload: 3.2, ammo: 30, accuracy: 0.55, morale: 88,
    cost: 560, upkeep: 130, tier: 3, icon: '★', color: '#8fd0c8',
    flying: true, evasive: 0.45,
    ability: { name: 'Magic Artillery', radius: 11, damage: 95, cooldown: 26, range: 220 },
    desc: 'Flying mage company. Only other flyers can catch them in melee.',
  },
  imp_ace: {
    id: 'imp_ace', name: 'Ace of Aces — Tanya', short: 'Ace', cls: 'hero',
    men: 1, hp: 280, armor: 4, meleeAtk: 6, meleeDef: 8, charge: 4, speed: 17,
    range: 170, damage: 5, reload: 1.4, ammo: 999, accuracy: 0.8, morale: 110,
    cost: 900, upkeep: 0, tier: 4, icon: '✠', color: '#ffe9a8',
    flying: true, evasive: 0.55,
    ability: { name: 'Satanic Barrage', radius: 16, damage: 175, cooldown: 30, range: 240 },
    aura: { radius: 110, morale: 14 },
    desc: 'Hero. Command aura steadies the line; her barrage deletes batteries.',
  },
  imp_drag: {
    id: 'imp_drag', name: 'Dragoon Squadron', short: 'Drag', cls: 'cavalry',
    men: 64, hp: 7, armor: 3, meleeAtk: 8, meleeDef: 5, charge: 15, speed: 10.4,
    range: 60, damage: 0.8, reload: 6, ammo: 8, accuracy: 0.4, morale: 68,
    cost: 360, upkeep: 90, tier: 2, icon: 'D', color: '#cbb072',
    mount: true,
    desc: 'Mounted rifles. Rapid flank pressure, weak in a static firefight.',
  },

  // ── Republican ─────────────────────────────────────────────────────────────
  rep_line: {
    id: 'rep_line', name: 'Republican Conscripts', short: 'Conscr.', cls: 'infantry',
    men: 130, hp: 5, armor: 1, meleeAtk: 5, meleeDef: 5, charge: 3, speed: 4.2,
    range: 115, damage: 0.8, reload: 4.8, ammo: 20, accuracy: 0.5, morale: 52,
    cost: 200, upkeep: 45, tier: 1, icon: 'I', color: REP_COLOR,
    desc: 'Cheap, numerous, shaky. Their strength is the second wave.',
  },
  rep_vet: {
    id: 'rep_vet', name: 'Veteran Stormtroopers', short: 'Sturm', cls: 'infantry',
    men: 100, hp: 7, armor: 3, meleeAtk: 10, meleeDef: 8, charge: 10, speed: 4.8,
    range: 100, damage: 1.2, reload: 4.2, ammo: 18, accuracy: 0.56, morale: 78,
    cost: 400, upkeep: 95, tier: 3, icon: 'S', color: '#b7ccd6',
    desc: 'Elite assault troops. Win the firefight, then win the melee.',
  },
  rep_mg: {
    id: 'rep_mg', name: 'MG Nest Section', short: 'MG', cls: 'gun',
    men: 36, hp: 6, armor: 2, meleeAtk: 2, meleeDef: 4, charge: 0, speed: 3.3,
    range: 160, damage: 3.0, reload: 3.8, ammo: 40, accuracy: 0.48, morale: 56,
    cost: 310, upkeep: 70, tier: 2, icon: 'M', color: '#93a9b4',
    desc: 'Entrenched machine guns with overlapping fields of fire.',
  },
  rep_gun: {
    id: 'rep_gun', name: '77mm Field Battery', short: 'Gun', cls: 'artillery',
    men: 30, hp: 5, armor: 1, meleeAtk: 1, meleeDef: 2, charge: 0, speed: 2.6,
    range: 370, damage: 46, reload: 12, ammo: 16, accuracy: 0.52, morale: 48,
    cost: 390, upkeep: 90, tier: 2, icon: 'A', color: '#8699a3',
    splash: 5, shots: 4,
    desc: 'Standard divisional artillery. Fast, accurate, fragile.',
  },
  rep_how: {
    id: 'rep_how', name: 'Heavy Mortar Battery', short: 'Mortar', cls: 'artillery',
    men: 34, hp: 5, armor: 1, meleeAtk: 1, meleeDef: 2, charge: 0, speed: 2.3,
    range: 340, damage: 62, reload: 15, ammo: 14, accuracy: 0.45, morale: 48,
    cost: 470, upkeep: 105, tier: 3, icon: 'H', color: '#7d909b',
    splash: 7, shots: 4,
    desc: 'Indirect fire that arcs over hills and trenches.',
  },
  rep_mage: {
    id: 'rep_mage', name: 'Mage Battalion', short: 'Mages', cls: 'mage',
    men: 20, hp: 8, armor: 1, meleeAtk: 3, meleeDef: 4, charge: 2, speed: 12.5,
    range: 145, damage: 1.4, reload: 3.4, ammo: 28, accuracy: 0.5, morale: 84,
    cost: 520, upkeep: 120, tier: 3, icon: '★', color: '#a7c8d8',
    flying: true, evasive: 0.45,
    ability: { name: 'Magic Artillery', radius: 10, damage: 85, cooldown: 28, range: 210 },
    desc: 'Flying bombardment mages. Duel Imperial mages for the sky.',
  },
  rep_ace: {
    id: 'rep_ace', name: 'Allied Ace — Mary', short: 'Ace', cls: 'hero',
    men: 1, hp: 240, armor: 4, meleeAtk: 6, meleeDef: 7, charge: 4, speed: 16,
    range: 160, damage: 4.4, reload: 1.5, ammo: 999, accuracy: 0.76, morale: 105,
    cost: 850, upkeep: 0, tier: 4, icon: '✠', color: '#dce9f2',
    flying: true, evasive: 0.5,
    ability: { name: 'Divine Barrage', radius: 14, damage: 150, cooldown: 32, range: 230 },
    aura: { radius: 100, morale: 12 },
    desc: 'Hero. Heavy single-target damage, steadies nearby battalions.',
  },
  rep_cav: {
    id: 'rep_cav', name: 'Colonial Lancers', short: 'Lancers', cls: 'cavalry',
    men: 58, hp: 7, armor: 2, meleeAtk: 9, meleeDef: 5, charge: 17, speed: 11,
    range: 0, damage: 0, reload: 0, ammo: 0, accuracy: 0, morale: 66,
    cost: 340, upkeep: 85, tier: 2, icon: 'C', color: '#a9bfca',
    mount: true,
    desc: 'Pure shock cavalry. Hide them, then hit artillery from the rear.',
  },
};

export const EMPIRE_ROSTER = ['imp_line', 'imp_gren', 'imp_mg', 'imp_gun', 'imp_how', 'imp_mage', 'imp_ace', 'imp_drag'];
export const REPUBLIC_ROSTER = ['rep_line', 'rep_vet', 'rep_mg', 'rep_gun', 'rep_how', 'rep_mage', 'rep_ace', 'rep_cav'];

export function unitType(id: string): UnitType {
  const t = UNIT_TYPES[id];
  if (!t) throw new Error(`unknown unit type: ${id}`);
  return t;
}

export function rosterFor(side: Side): string[] {
  return side === 'empire' ? EMPIRE_ROSTER : REPUBLIC_ROSTER;
}

/** A stack entry that persists between battles and campaign turns. */
export interface UnitStack {
  typeId: string;
  men: number;
}

export function stackStrength(stack: UnitStack[]): number {
  return stack.reduce((sum, s) => {
    const t = unitType(s.typeId);
    return sum + (s.men / t.men) * t.cost;
  }, 0);
}

export function stackUpkeep(stack: UnitStack[]): number {
  return stack.reduce((sum, s) => sum + unitType(s.typeId).upkeep, 0);
}

export function makeStack(typeIds: string[]): UnitStack[] {
  return typeIds.map((typeId) => ({ typeId, men: unitType(typeId).men }));
}

export function sideName(side: Side): string {
  return side === 'empire' ? 'Imperial Army' : 'Republican Alliance';
}

export function sideColor(side: Side): string {
  return side === 'empire' ? '#c9b47a' : '#9db4c0';
}
