// Core real-time battle simulation: formations, morale, ranged/melee combat, magic, victory.

import { RNG, clamp, dist, rotateToward, angleDelta, wrapAngle } from '../core/util';
import { unitType, type Side, type UnitType } from '../data/units';
import { BattleMap, type MapKind } from './map';

export interface Vec {
  x: number;
  y: number;
}

export type UnitState = 'idle' | 'moving' | 'fighting' | 'firing' | 'routing' | 'dead';
export type OrderKind = 'idle' | 'move' | 'attackmove' | 'attack' | 'hold';

export interface Soldier {
  ox: number;
  oy: number;
  alive: boolean;
  phase: number;
  jitterX: number;
  jitterY: number;
}

export interface Order {
  kind: OrderKind;
  x: number;
  y: number;
  targetId: number;
}

export interface Projectile {
  x: number;
  y: number;
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  t: number;
  flight: number;
  radius: number;
  damage: number;
  side: Side;
  kind: 'shell' | 'spell';
  arc: number;
  ownerId: number;
}

export interface Effect {
  kind: 'tracer' | 'flash' | 'smoke' | 'explosion' | 'blood' | 'spell' | 'ring';
  x: number;
  y: number;
  x2: number;
  y2: number;
  t: number;
  life: number;
  size: number;
  color: string;
}

export interface Unit {
  id: number;
  side: Side;
  type: UnitType;
  men: number;
  maxMen: number;
  pool: number;
  maxPool: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
  facing: number;
  rFacing: number;
  order: Order;
  state: UnitState;
  morale: number;
  shock: number;
  suppression: number;
  reloadT: number;
  meleeT: number;
  abilityT: number;
  chargeT: number;
  ammo: number;
  soldiers: Soldier[];
  cols: number;
  rows: number;
  frontage: number;
  depth: number;
  engagedWith: number[];
  inMelee: boolean;
  alive: boolean;
  kills: number;
  losses: number;
  selected: boolean;
  routT: number;
  hitFlash: number;
  targetId: number;
  moveSpeed: number;
  walkT: number;
  rankPref: number;
}

export interface ArmyEntry {
  typeId: string;
  men: number;
}

export interface BattleSetup {
  playerSide: Side;
  player: ArmyEntry[];
  enemy: ArmyEntry[];
  seed: number;
  kind?: MapKind;
  attacker?: Side;
}

export interface BattleResult {
  winner: Side | 'draw';
  playerRemaining: number[];
  enemyRemaining: number[];
  playerCasualties: number;
  enemyCasualties: number;
  time: number;
}

const SOLDIER_SPACING = 1.25;
const RANK_SPACING = 1.55;
const TURN_RATE = 1.5;
const MAX_ROUT_TIME = 45;

export class Battle {
  readonly map: BattleMap;
  readonly rng: RNG;
  readonly playerSide: Side;
  readonly enemySide: Side;
  units: Unit[] = [];
  projectiles: Projectile[] = [];
  effects: Effect[] = [];
  time = 0;
  timeLimit = 900;
  speed = 1;
  paused = false;
  state: 'deploy' | 'running' | 'over' = 'deploy';
  result: BattleResult | null = null;
  events: { t: number; text: string }[] = [];
  playerRoster: ArmyEntry[];
  enemyRoster: ArmyEntry[];
  private nextId = 1;
  private checkT = 0;
  private initialPlayer: number;
  private initialEnemy: number;
  seed: number;

  constructor(setup: BattleSetup) {
    this.seed = setup.seed;
    this.rng = new RNG(setup.seed);
    this.map = new BattleMap(setup.seed, setup.kind ?? 'field');
    this.playerSide = setup.playerSide;
    this.enemySide = setup.playerSide === 'empire' ? 'republic' : 'empire';
    this.playerRoster = setup.player;
    this.enemyRoster = setup.enemy;
    this.deploySide(setup.playerSide, setup.player);
    this.deploySide(this.enemySide, setup.enemy);
    this.initialPlayer = this.armyStrength(setup.playerSide);
    this.initialEnemy = this.armyStrength(this.enemySide);
    this.notify(`${this.map.kind === 'village' ? 'Village' : this.map.kind === 'ridge' ? 'Ridge' : 'Open field'} — deploy your line, then begin.`);
  }

  // ── Setup ────────────────────────────────────────────────────────────────
  private deploySide(side: Side, roster: ArmyEntry[]): void {
    const zone = this.map.deploymentZone(side);
    const dir = side === 'empire' ? 1 : -1;
    const frontX = (zone.x0 + zone.x1) / 2 + dir * 12;
    const entries = roster.map((e) => ({ e, t: unitType(e.typeId) }));
    const front = entries.filter((x) => x.t.cls === 'infantry' || x.t.cls === 'cavalry');
    const mid = entries.filter((x) => x.t.cls === 'gun' || x.t.cls === 'artillery');
    const back = entries.filter((x) => x.t.cls === 'mage' || x.t.cls === 'hero');

    const layout = (items: typeof entries, offsetX: number) => {
      const placed: { item: (typeof entries)[number]; x: number; y: number }[] = [];
      let y = 60;
      let row = 0;
      const maxY = this.map.h - 60;
      for (const item of items) {
        const width = (item.t.men * SOLDIER_SPACING) / (item.t.cls === 'cavalry' ? 2 : 3);
        if (y + width > maxY) {
          row++;
          y = 60;
        }
        placed.push({ item, x: frontX - dir * (offsetX + row * 40), y });
        y += Math.max(18, width * 1.12);
      }
      return placed;
    };

    const placed = [...layout(front, 0), ...layout(mid, 64), ...layout(back, 118)];
    for (const p of placed) {
      const y = clamp(p.y, 45, this.map.h - 45);
      this.addUnit(side, p.item.e.typeId, p.item.e.men, p.x, y, side === 'empire' ? 0 : Math.PI);
    }
  }

  addUnit(side: Side, typeId: string, men: number, x: number, y: number, facing: number): Unit {
    const t = unitType(typeId);
    const count = clamp(Math.round(men), 1, t.men);
    const soldiers: Soldier[] = [];
    for (let i = 0; i < t.men; i++) {
      soldiers.push({
        ox: 0,
        oy: 0,
        alive: i < count,
        phase: this.rng.range(0, Math.PI * 2),
        jitterX: this.rng.range(-0.32, 0.32),
        jitterY: this.rng.range(-0.3, 0.3),
      });
    }
    const u: Unit = {
      id: this.nextId++,
      side,
      type: t,
      men: count,
      maxMen: count,
      pool: count * t.hp,
      maxPool: t.men * t.hp,
      x,
      y,
      rx: x,
      ry: y,
      facing,
      rFacing: facing,
      order: { kind: 'idle', x, y, targetId: 0 },
      state: 'idle',
      morale: t.morale,
      shock: 0,
      suppression: 0,
      reloadT: this.rng.range(0, t.reload),
      meleeT: 0,
      abilityT: 0,
      chargeT: 0,
      ammo: t.ammo,
      soldiers,
      cols: 1,
      rows: 1,
      frontage: 10,
      depth: 4,
      engagedWith: [],
      inMelee: false,
      alive: true,
      kills: 0,
      losses: 0,
      selected: false,
      routT: 0,
      hitFlash: 0,
      targetId: 0,
      moveSpeed: 0,
      walkT: 0,
      rankPref: 3,
    };
    this.layout(u);
    this.units.push(u);
    return u;
  }

  private layout(u: Unit): void {
    const t = u.type;
    const ranks = t.cls === 'cavalry' || t.cls === 'artillery' || t.cls === 'gun' || t.cls === 'hero' ? 2 : u.rankPref;
    const cols = Math.max(1, Math.ceil(u.men / ranks));
    const rows = ranks;
    u.cols = cols;
    u.rows = rows;
    u.frontage = cols * SOLDIER_SPACING;
    u.depth = rows * RANK_SPACING;
    let idx = 0;
    for (const s of u.soldiers) {
      if (!s.alive) continue;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      s.ox = u.depth / 2 - row * RANK_SPACING + s.jitterX;
      s.oy = (col - (cols - 1) / 2) * SOLDIER_SPACING + s.jitterY;
      idx++;
    }
  }

  // ── Public API used by HUD / AI ──────────────────────────────────────────
  unitsOf(side: Side): Unit[] {
    return this.units.filter((u) => u.side === side && u.alive);
  }

  enemiesOf(side: Side): Unit[] {
    return this.units.filter((u) => u.side !== side && u.alive);
  }

  unitById(id: number): Unit | undefined {
    return this.units.find((u) => u.id === id);
  }

  armyStrength(side: Side): number {
    let total = 0;
    for (const u of this.units) {
      if (u.side !== side || !u.alive) continue;
      total += (u.men / u.type.men) * u.type.cost * (u.state === 'routing' ? 0.25 : 1);
    }
    return total;
  }

  armyMen(side: Side): number {
    let n = 0;
    for (const u of this.units) if (u.side === side && u.alive) n += u.men;
    return n;
  }

  issueMove(units: Unit[], x: number, y: number, attackMove: boolean): void {
    for (const u of units) {
      u.order = { kind: attackMove ? 'attackmove' : 'move', x, y, targetId: 0 };
      u.targetId = 0;
      if (u.state === 'routing') continue;
    }
  }

  issueAttack(units: Unit[], target: Unit): void {
    for (const u of units) {
      if (u.state === 'routing') continue;
      u.order = { kind: 'attack', x: target.x, y: target.y, targetId: target.id };
      u.targetId = target.id;
    }
  }

  issueHold(units: Unit[]): void {
    for (const u of units) {
      if (u.state === 'routing') continue;
      u.order = { kind: 'hold', x: u.x, y: u.y, targetId: u.targetId };
    }
  }

  setFormation(units: Unit[], ranks: number): void {
    for (const u of units) {
      if (u.type.cls === 'artillery' || u.type.cls === 'gun' || u.type.cls === 'hero') continue;
      u.rankPref = ranks;
      this.layout(u);
    }
  }

  castAbility(unit: Unit, x: number, y: number): boolean {
    const ab = unit.type.ability;
    if (!ab || unit.abilityT > 0 || !unit.alive) return false;
    if (dist(unit.x, unit.y, x, y) > ab.range) return false;
    unit.abilityT = ab.cooldown;
    this.projectiles.push({
      x: unit.x,
      y: unit.y,
      x0: unit.x,
      y0: unit.y,
      tx: x,
      ty: y,
      t: 0,
      flight: 1.3,
      radius: ab.radius,
      damage: ab.damage,
      side: unit.side,
      kind: 'spell',
      arc: 10,
      ownerId: unit.id,
    });
    this.effects.push({ kind: 'ring', x, y, x2: x, y2: y, t: 0, life: 1.3, size: ab.radius, color: unit.type.color });
    return true;
  }

  start(): void {
    this.state = 'running';
    this.paused = false;
  }

  /** Player quits the field: counts as a defeat with surviving men kept. */
  concede(): void {
    if (this.state === 'over') return;
    this.finish(this.enemySide);
  }

  notify(text: string): void {
    this.events.push({ t: this.time, text });
    if (this.events.length > 40) this.events.shift();
  }

  // ── Main tick ────────────────────────────────────────────────────────────
  update(dtRaw: number): void {
    if (this.state !== 'running') return;
    const dt = Math.min(dtRaw, 0.1) * this.speed;
    this.time += dt;

    for (const u of this.units) {
      if (!u.alive) continue;
      this.tickUnit(u, dt);
    }
    this.resolveOverlaps(dt);
    this.tickProjectiles(dt);
    this.tickEffects(dt);
    for (const u of this.units) {
      if (!u.alive) continue;
      u.rx += (u.x - u.rx) * Math.min(1, dt * 8);
      u.ry += (u.y - u.ry) * Math.min(1, dt * 8);
      u.rFacing = rotateToward(u.rFacing, u.facing, Math.min(Math.abs(angleDelta(u.rFacing, u.facing)), dt * 5));
      if (u.hitFlash > 0) u.hitFlash -= dt;
    }

    this.checkT += dt;
    if (this.checkT > 0.5) {
      this.checkT = 0;
      this.checkVictory();
    }
  }

  private tickUnit(u: Unit, dt: number): void {
    const t = u.type;
    this.updateMorale(u, dt);
    if (u.abilityT > 0) u.abilityT = Math.max(0, u.abilityT - dt);

    if (u.state === 'routing') {
      this.tickRouting(u, dt);
      return;
    }

    // Target selection.
    let target = u.targetId ? this.unitById(u.targetId) : undefined;
    if (!target || !target.alive || target.state === 'routing' || (u.order.kind !== 'attack' && !this.inRange(u, target))) {
      target = this.pickTarget(u);
    }
    u.targetId = target ? target.id : 0;

    // Movement.
    const pursuing = u.order.kind === 'attack' && target;
    let goalX = u.order.kind === 'move' || u.order.kind === 'attackmove' ? u.order.x : u.x;
    let goalY = u.order.kind === 'move' || u.order.kind === 'attackmove' ? u.order.y : u.y;
    if (pursuing && target) {
      goalX = target.x;
      goalY = target.y;
    }
    const goalDist = dist(u.x, u.y, goalX, goalY);
    let moving = false;
    let wantsMove = (pursuing && goalDist > this.engageDistance(u, target!) + 2) || (!pursuing && (u.order.kind === 'move' || u.order.kind === 'attackmove') && goalDist > 4);
    // Locked in melee: only a deliberate long retreat lets a unit disengage, slowly.
    let disengaging = false;
    if (u.inMelee && wantsMove) {
      if (u.order.kind === 'move' && goalDist > 30) disengaging = true;
      else wantsMove = false;
    }

    if (wantsMove) {
      const desired = Math.atan2(goalY - u.y, goalX - u.x);
      u.facing = rotateToward(u.facing, desired, TURN_RATE * dt);
      const align = Math.max(0.25, Math.cos(angleDelta(u.facing, desired)));
      const terrain = t.flying ? 1 : this.map.speedAt(u.x, u.y);
      const moraleFactor = u.morale < 25 ? 0.8 : 1;
      const speed = t.speed * terrain * align * moraleFactor * (disengaging ? 0.3 : 1);
      u.moveSpeed = speed;
      u.x += Math.cos(u.facing) * speed * dt;
      u.y += Math.sin(u.facing) * speed * dt;
      u.x = clamp(u.x, 8, this.map.w - 8);
      u.y = clamp(u.y, 8, this.map.h - 8);
      u.walkT += dt * speed;
      moving = true;
      if (goalDist < 5) {
        if (u.order.kind === 'move' || u.order.kind === 'attackmove') u.order = { kind: 'hold', x: u.x, y: u.y, targetId: u.targetId };
      }
    } else {
      u.moveSpeed = 0;
    }

    if (!u.inMelee) {
      if (target) {
        const face = Math.atan2(target.y - u.y, target.x - u.x);
        u.facing = rotateToward(u.facing, face, TURN_RATE * 0.6 * dt);
      }
    }

    // Charging momentum.
    if (u.chargeT > 0) u.chargeT -= dt;

    // Melee resolution.
    this.tickMelee(u, dt, target);

    // Ranged resolution.
    let fired = false;
    if (t.range > 0 && u.ammo > 0 && target && !u.inMelee) {
      if (u.reloadT > 0) u.reloadT -= dt;
      if (u.reloadT <= 0 && this.canShoot(u, target)) {
        this.fire(u, target);
        fired = true;
        const waver = u.morale < 30 ? 1.4 : 1;
        u.reloadT = t.reload * waver;
      }
    }

    if (!u.alive) return;
    if (u.inMelee) u.state = 'fighting';
    else if (fired) u.state = 'firing';
    else if (moving) u.state = 'moving';
    else u.state = 'idle';
    this.layout(u);
  }

  /** Keeps formations from stacking on top of one another (blocks, not ghosts). */
  private resolveOverlaps(dt: number): void {
    for (let i = 0; i < this.units.length; i++) {
      const a = this.units[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.units.length; j++) {
        const b = this.units[j];
        if (!b.alive) continue;
        if (a.type.flying !== b.type.flying) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.001) {
          a.x -= 0.3;
          b.x += 0.3;
          continue;
        }
        if (d > 90) continue;
        const ang = Math.atan2(dy, dx);
        const want = (this.extent(a, ang) + this.extent(b, ang + Math.PI)) * 0.82;
        if (d >= want) continue;
        const push = (want - d) * Math.min(1, dt * 4) * 0.5;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
  }

  private updateMorale(u: Unit, dt: number): void {
    const t = u.type;
    if (u.state === 'routing') {
      u.routT += dt;
      return;
    }
    let target = t.morale;
    const menFrac = u.men / u.maxMen;
    target -= (1 - menFrac) * 42;
    target -= u.shock;
    target -= u.suppression * 0.35;
    if (u.inMelee) target -= 5;
    // Flanked / rear threatened.
    let nearestEnemy: Unit | null = null;
    let nearestD = 1e9;
    for (const e of this.units) {
      if (!e.alive || e.side === u.side) continue;
      const d = dist(u.x, u.y, e.x, e.y);
      if (d < nearestD) {
        nearestD = d;
        nearestEnemy = e;
      }
      if (d < 55) {
        const ang = Math.atan2(e.y - u.y, e.x - u.x);
        const rel = Math.abs(angleDelta(u.facing, ang));
        if (rel > 1.9) target -= 14;
        else if (rel > 0.9) target -= 7;
      }
    }
    if (nearestEnemy && nearestD < 40 && nearestEnemy.men > u.men * 1.4) target -= 5;
    // Friends nearby steady the line.
    let friends = 0;
    for (const f of this.units) {
      if (f === u || !f.alive || f.side !== u.side) continue;
      if (dist(u.x, u.y, f.x, f.y) < 45) friends++;
    }
    target += Math.min(9, friends * 2.5);
    // Hero / general aura.
    for (const a of this.units) {
      if (!a.alive || a.side !== u.side || !a.type.aura) continue;
      if (dist(u.x, u.y, a.x, a.y) < a.type.aura.radius) target += a.type.aura.morale;
    }
    target += 8; // baseline benefit of the doubt

    u.morale += (clamp(target, 0, 115) - u.morale) * Math.min(1, dt * (u.morale < target ? 0.6 : 1.6));
    u.shock = Math.max(0, u.shock - dt * 10);
    u.suppression = Math.max(0, u.suppression - dt * 12);

    if (u.morale < 10) {
      u.state = 'routing';
      u.routT = 0;
      this.notify(`${u.type.name} ${u.side === this.playerSide ? '(yours)' : ''} is breaking!`);
    }
  }

  private tickRouting(u: Unit, dt: number): void {
    const enemies = this.enemiesOf(u.side);
    let away = u.facing;
    let nearest: Unit | null = null;
    let nd = 1e9;
    for (const e of enemies) {
      const d = dist(u.x, u.y, e.x, e.y);
      if (d < nd) {
        nd = d;
        nearest = e;
      }
    }
    if (nearest) away = Math.atan2(u.y - nearest.y, u.x - nearest.x);
    u.facing = rotateToward(u.facing, away, TURN_RATE * dt);
    const speed = u.type.speed * 1.25 * (u.type.flying ? 1 : this.map.speedAt(u.x, u.y));
    u.x = clamp(u.x + Math.cos(u.facing) * speed * dt, 8, this.map.w - 8);
    u.y = clamp(u.y + Math.sin(u.facing) * speed * dt, 8, this.map.h - 8);
    u.walkT += dt * speed;
    u.moveSpeed = speed;
    u.routT += dt;

    const clear = nd > 70;
    u.morale += dt * (clear ? 16 : -2);
    if ((u.morale > 45 && clear) || u.routT > MAX_ROUT_TIME) {
      if (u.routT > MAX_ROUT_TIME && u.men < u.maxMen * 0.25) {
        // Unit dissolves off the field.
        u.men = 0;
        u.alive = false;
        u.state = 'dead';
        u.pool = 0;
        return;
      }
      u.state = 'idle';
      u.morale = Math.max(u.morale, 40);
      u.order = { kind: 'hold', x: u.x, y: u.y, targetId: 0 };
      this.notify(`${u.type.name} has rallied.`);
    }
    this.layout(u);
  }

  private pickTarget(u: Unit): Unit | undefined {
    let best: Unit | undefined;
    let bestScore = Infinity;
    for (const e of this.units) {
      if (!e.alive || e.side === u.side || e.state === 'routing') continue;
      if (e.type.flying && !u.type.flying && u.type.range === 0) continue;
      const d = dist(u.x, u.y, e.x, e.y);
      const reach = u.type.range + 40;
      if (d > reach) continue;
      let score = d;
      if (e.type.cls === 'artillery' && u.type.cls !== 'artillery') score -= 30;
      if (e.type.cls === 'mage') score -= 10;
      if (u.type.cls === 'artillery') {
        score = d * 0.6 + (e.type.cls === 'infantry' ? -40 : 0);
      }
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  private extent(u: Unit, angle: number): number {
    const rel = Math.abs(angleDelta(u.facing, angle));
    return Math.abs(Math.cos(rel)) * (u.frontage / 2) + Math.abs(Math.sin(rel)) * (u.depth / 2);
  }

  private engageDistance(a: Unit, b: Unit): number {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    return this.extent(a, ang) + this.extent(b, ang + Math.PI);
  }

  private flankFactor(target: Unit, attacker: Unit): number {
    const ang = Math.atan2(attacker.y - target.y, attacker.x - target.x);
    const rel = Math.abs(angleDelta(target.facing, ang));
    if (rel > 2.1) return 1.8;
    if (rel > 0.95) return 1.35;
    return 1;
  }

  private tickMelee(u: Unit, dt: number, target: Unit | undefined): void {
    let engaged = false;
    for (const e of this.units) {
      if (!e.alive || e.side === u.side) continue;
      if (e.type.flying !== u.type.flying) continue;
      const gap = dist(u.x, u.y, e.x, e.y) - this.engageDistance(u, e);
      if (gap <= 1.2) {
        // Contact: first touch applies charge damage.
        if (!u.engagedWith.includes(e.id)) {
          u.engagedWith.push(e.id);
          this.chargeImpact(u, e);
        }
        engaged = true;
      } else if (u.engagedWith.includes(e.id) && gap > 5) {
        u.engagedWith = u.engagedWith.filter((id) => id !== e.id);
      }
    }
    u.inMelee = engaged;
    if (!engaged) {
      u.meleeT = 0;
      return;
    }
    u.meleeT += dt;
    if (u.meleeT < 0.6) return;
    u.meleeT = 0;
    for (const eid of u.engagedWith) {
      const e = this.unitById(eid);
      if (!e || !e.alive) continue;
      const gap = dist(u.x, u.y, e.x, e.y) - this.engageDistance(u, e);
      if (gap > 3) continue;
      const flank = this.flankFactor(e, u);
      const heightAdv = clamp((this.map.heightAt(u.x, u.y) - this.map.heightAt(e.x, e.y)) / 12, -0.15, 0.15);
      const chargeMul = 1 + (u.chargeT > 0 ? 0.5 * (u.chargeT / 6) : 0);
      const wounds =
        u.men * 0.17 * (u.type.meleeAtk / (e.type.meleeDef + 8)) * flank * chargeMul * (1 + heightAdv) * 0.6;
      this.applyDamage(e, wounds, u);
    }
    void target;
  }

  private chargeImpact(attacker: Unit, defender: Unit): void {
    const speed = attacker.moveSpeed;
    if (speed < attacker.type.speed * 0.55) return;
    attacker.chargeT = 6;
    const flank = this.flankFactor(defender, attacker);
    const wounds = attacker.men * 0.35 * (attacker.type.charge / 10) * flank;
    this.applyDamage(defender, wounds, attacker);
    defender.shock += 10 * flank;
    defender.suppression += 12;
    this.effects.push({
      kind: 'ring',
      x: defender.x,
      y: defender.y,
      x2: defender.x,
      y2: defender.y,
      t: 0,
      life: 0.5,
      size: 12,
      color: '#e8d7a0',
    });
    if (flank > 1.2) defender.morale -= 12;
  }

  private canShoot(u: Unit, target: Unit): boolean {
    const d = dist(u.x, u.y, target.x, target.y) - this.engageDistance(u, target);
    if (d > u.type.range) return false;
    if (this.map.blocksLOS(u.x, u.y, target.x, target.y)) return false;
    return true;
  }

  private inRange(u: Unit, target: Unit): boolean {
    return dist(u.x, u.y, target.x, target.y) - this.engageDistance(u, target) <= u.type.range;
  }

  private fire(u: Unit, target: Unit): void {
    const t = u.type;
    u.ammo = Math.max(0, u.ammo - 1);
    const heightAdv = clamp((this.map.heightAt(u.x, u.y) - this.map.heightAt(target.x, target.y)) / 15, -0.2, 0.2);
    const cover = this.map.coverAt(target.x, target.y);
    let accMod = (1 - cover * 0.35) * (1 + heightAdv) * (u.morale < 30 ? 0.75 : 1);
    if (target.type.flying && !t.flying) accMod *= t.cls === 'gun' || t.cls === 'artillery' ? 0.4 : 0.18;
    if (target.type.flying && target.type.evasive) accMod *= 1 - target.type.evasive * 0.5;
    if (target.moveSpeed > 2) accMod *= 0.85;
    // Friendlies masking the line.
    const ang = Math.atan2(target.y - u.y, target.x - u.x);
    for (const f of this.units) {
      if (!f.alive || f.side !== u.side || f === u) continue;
      const rel = Math.atan2(f.y - u.y, f.x - u.x);
      if (Math.abs(angleDelta(ang, rel)) < 0.35 && dist(u.x, u.y, f.x, f.y) < Math.min(60, dist(u.x, u.y, target.x, target.y))) {
        accMod *= 0.55;
        break;
      }
    }

    if (t.splash) {
      const shots = t.shots ?? 1;
      for (let i = 0; i < shots; i++) {
        const scatter = (1 - t.accuracy) * 26 + 3;
        const tx = clamp(target.x + this.rng.range(-scatter, scatter), 5, this.map.w - 5);
        const ty = clamp(target.y + this.rng.range(-scatter, scatter), 5, this.map.h - 5);
        this.projectiles.push({
          x: u.x,
          y: u.y,
          x0: u.x,
          y0: u.y,
          tx,
          ty,
          t: 0,
          flight: Math.max(0.5, dist(u.x, u.y, tx, ty) / 190),
          radius: (t.splash ?? 4) * (0.85 + this.rng.next() * 0.3),
          damage: t.damage,
          side: u.side,
          kind: 'shell',
          arc: 9 + dist(u.x, u.y, tx, ty) * 0.05,
          ownerId: u.id,
        });
      }
      this.effects.push({ kind: 'flash', x: u.x, y: u.y, x2: u.x, y2: u.y, t: 0, life: 0.25, size: 8, color: '#ffd27a' });
      this.effects.push({ kind: 'smoke', x: u.x, y: u.y, x2: u.x, y2: u.y, t: 0, life: 1.6, size: 7, color: '#b9b0a2' });
      return;
    }

    const wounds = u.men * t.damage * (t.accuracy * accMod);
    this.applyDamage(target, wounds, u);
    // Tracers.
    const tracers = Math.min(10, Math.max(3, Math.round(u.men / 14)));
    const sx = u.x + Math.cos(u.facing) * (u.depth / 2);
    const sy = u.y + Math.sin(u.facing) * (u.depth / 2);
    for (let i = 0; i < tracers; i++) {
      const spread = 0.16;
      const a = Math.atan2(target.y - sy, target.x - sx) + this.rng.range(-spread, spread);
      const len = dist(sx, sy, target.x, target.y) * this.rng.range(0.75, 1);
      this.effects.push({
        kind: 'tracer',
        x: sx,
        y: sy,
        x2: sx + Math.cos(a) * len,
        y2: sy + Math.sin(a) * len,
        t: 0,
        life: 0.12,
        size: 1,
        color: u.side === this.playerSide ? '#ffe9a8' : '#cfe3ee',
      });
    }
    this.effects.push({ kind: 'flash', x: sx, y: sy, x2: sx, y2: sy, t: 0, life: 0.18, size: 4, color: '#ffcf7a' });
    this.effects.push({ kind: 'smoke', x: sx, y: sy, x2: sx, y2: sy, t: 0, life: 1.1, size: 5, color: '#cfc6b8' });
    target.suppression += 4;
  }

  applyDamage(target: Unit, wounds: number, attacker: Unit): void {
    if (!target.alive || wounds <= 0) return;
    const armor = target.type.armor;
    const eff = wounds * (100 / (100 + armor * 20)) * (target.type.flying ? 1.1 : 1);
    target.pool -= eff;
    const newMen = clamp(Math.ceil(target.pool / target.type.hp), 0, target.maxMen);
    const kills = Math.min(target.men, target.men - newMen);
    if (kills > 0) {
      target.men = newMen;
      target.losses += kills;
      attacker.kills += kills;
      target.shock += (kills / target.maxMen) * 75;
      target.suppression += (kills / target.maxMen) * 40;
      target.hitFlash = 0.2;
      let removed = 0;
      for (const s of target.soldiers) {
        if (removed >= kills) break;
        if (s.alive) {
          s.alive = false;
          removed++;
        }
      }
      this.effects.push({
        kind: 'blood',
        x: target.x + this.rng.range(-8, 8),
        y: target.y + this.rng.range(-8, 8),
        x2: 0,
        y2: 0,
        t: 0,
        life: 0.5,
        size: 5,
        color: '#7d2b25',
      });
    }
    if (target.men <= 0) {
      target.alive = false;
      target.men = 0;
      target.state = 'dead';
      target.pool = 0;
      target.inMelee = false;
      target.engagedWith = [];
      this.notify(`${target.type.name} destroyed.`);
    }
  }

  private tickProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.t += dt;
      if (p.t >= p.flight) {
        this.impact(p);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private impact(p: Projectile): void {
    this.effects.push({
      kind: 'explosion',
      x: p.tx,
      y: p.ty,
      x2: p.tx,
      y2: p.ty,
      t: 0,
      life: 0.65,
      size: p.radius,
      color: p.kind === 'spell' ? '#a8f0e6' : '#ffb45e',
    });
    for (const u of this.units) {
      if (!u.alive || u.side === p.side) continue;
      const d = dist(p.tx, p.ty, u.x, u.y) - this.extent(u, 0) * 0.35;
      if (d > p.radius) continue;
      const falloff = clamp(1 - d / p.radius, 0.25, 1);
      const wounds = p.damage * falloff * (1 + (u.type.cls === 'infantry' ? 0.25 : 0));
      const owner = this.unitById(p.ownerId);
      this.applyDamage(u, wounds, owner ?? u);
      u.shock += 6 * falloff;
      u.suppression += 10 * falloff;
    }
  }

  private tickEffects(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      if (e.t >= e.life) this.effects.splice(i, 1);
    }
  }

  private checkVictory(): void {
    if (this.state === 'over') return;
    const playerFighting = this.unitsOf(this.playerSide).filter((u) => u.state !== 'routing');
    const enemyFighting = this.unitsOf(this.enemySide).filter((u) => u.state !== 'routing');
    if (playerFighting.length === 0 || enemyFighting.length === 0) {
      const winner: Side | 'draw' = playerFighting.length === 0 && enemyFighting.length === 0
        ? 'draw'
        : playerFighting.length === 0
          ? this.enemySide
          : this.playerSide;
      this.finish(winner);
      return;
    }
    if (this.time >= this.timeLimit) {
      const p = this.armyStrength(this.playerSide);
      const e = this.armyStrength(this.enemySide);
      const ratio = p / Math.max(1, e);
      this.finish(ratio > 1.15 ? this.playerSide : ratio < 0.87 ? this.enemySide : 'draw');
    }
  }

  private finish(winner: Side | 'draw'): void {
    this.state = 'over';
    this.result = {
      winner,
      playerRemaining: this.units.filter((u) => u.side === this.playerSide).map((u) => (u.alive ? u.men : 0)),
      enemyRemaining: this.units.filter((u) => u.side === this.enemySide).map((u) => (u.alive ? u.men : 0)),
      playerCasualties: this.units.filter((u) => u.side === this.playerSide).reduce((s, u) => s + u.losses, 0),
      enemyCasualties: this.units.filter((u) => u.side === this.enemySide).reduce((s, u) => s + u.losses, 0),
      time: this.time,
    };
    this.notify(winner === 'draw' ? 'The field is a bloody draw.' : `${winner === this.playerSide ? 'Victory' : 'Defeat'} — the enemy army is broken.`);
  }

  initialStrength(): { player: number; enemy: number } {
    return { player: this.initialPlayer, enemy: this.initialEnemy };
  }
}

export function makeBattle(setup: BattleSetup): Battle {
  return new Battle(setup);
}

export { SOLDIER_SPACING, RANK_SPACING, wrapAngle };
