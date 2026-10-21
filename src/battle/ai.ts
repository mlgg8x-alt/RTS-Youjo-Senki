// Tactical AI: holds a firing line, focuses artillery, flanks with cavalry, casts magic.

import { dist, clamp } from '../core/util';
import type { Side } from '../data/units';
import type { Battle, Unit } from './battle';

interface RoleAssign {
  role: 'line' | 'artillery' | 'flank' | 'air' | 'hero';
  flankSide: 1 | -1;
}

export class TacticalAI {
  private battle: Battle;
  private side: Side;
  private think = 0;
  private roles = new Map<number, RoleAssign>();
  private approachX: number;

  constructor(battle: Battle, side: Side) {
    this.battle = battle;
    this.side = side;
    const playerZone = battle.map.deploymentZone(side);
    this.approachX = (playerZone.x0 + playerZone.x1) / 2;
    for (const u of battle.unitsOf(side)) {
      this.roles.set(u.id, {
        role: u.type.cls === 'artillery' ? 'artillery' : u.type.cls === 'cavalry' ? 'flank' : u.type.cls === 'mage' || u.type.cls === 'hero' ? 'air' : 'line',
        flankSide: u.y < battle.map.h / 2 ? 1 : -1,
      });
    }
  }

  update(dt: number): void {
    this.think -= dt;
    if (this.think > 0) return;
    this.think = 1.0 + Math.random() * 0.6;
    const b = this.battle;
    const mine = b.unitsOf(this.side).filter((u) => u.state !== 'routing');
    const enemies = b.enemiesOf(this.side).filter((u) => u.state !== 'routing');
    if (mine.length === 0 || enemies.length === 0) return;

    const enemyCentreX = enemies.reduce((s, e) => s + e.x, 0) / enemies.length;
    const enemyCentreY = enemies.reduce((s, e) => s + e.y, 0) / enemies.length;

    // Cast abilities on the biggest cluster in range.
    for (const u of mine) {
      if (!u.type.ability || u.abilityT > 0) continue;
      const spot = this.bestSpellSpot(u, enemies);
      if (spot && dist(u.x, u.y, spot.x, spot.y) <= u.type.ability.range) {
        b.castAbility(u, spot.x, spot.y);
      }
    }

    // Focus targets: artillery and mages first, then the closest line unit.
    const priority = [...enemies].sort((a, c) => this.targetScore(a) - this.targetScore(c));

    for (const u of mine) {
      const role = this.roles.get(u.id)?.role ?? 'line';
      const near = enemies.reduce((best, e) => (dist(u.x, u.y, e.x, e.y) < dist(u.x, u.y, best.x, best.y) ? e : best), enemies[0]);
      const nearestD = dist(u.x, u.y, near.x, near.y);

      if (role === 'artillery') {
        if (nearestD < 85) {
          const away = Math.atan2(u.y - near.y, u.x - near.x);
          b.issueMove([u], clamp(u.x + Math.cos(away) * 60, 20, b.map.w - 20), clamp(u.y + Math.sin(away) * 60, 20, b.map.h - 20), false);
        } else {
          const t = priority[0];
          if (t && dist(u.x, u.y, t.x, t.y) <= u.type.range) b.issueAttack([u], t);
          else b.issueHold([u]);
        }
        continue;
      }

      if (role === 'air') {
        const t = priority.find((e) => e.type.cls === 'artillery') ?? priority.find((e) => e.type.flying) ?? priority[0];
        if (t) {
          const keep = u.type.range * 0.8;
          if (dist(u.x, u.y, t.x, t.y) > keep + 20) {
            // Stay behind the friendly line, at firing distance.
            const lineX = u.side === 'empire' ? b.map.w * 0.32 : b.map.w * 0.68;
            b.issueMove([u], lineX + (t.x - lineX) * 0.55, t.y + (u.side === 'empire' ? 40 : -40), true);
          } else {
            b.issueAttack([u], t);
          }
        }
        continue;
      }

      if (role === 'flank') {
        const target = priority.find((e) => e.type.cls === 'artillery' || e.type.cls === 'mage') ?? priority[0];
        if (!target) continue;
        const behind = u.side === 'empire' ? target.x - 42 : target.x + 42;
        const sideY = clamp(target.y + (this.roles.get(u.id)?.flankSide ?? 1) * 70, 25, b.map.h - 25);
        if (nearestD > 55 && Math.abs(u.y - target.y) > 35) {
          b.issueMove([u], behind + (u.side === 'empire' ? -60 : 60), sideY, true);
        } else {
          b.issueAttack([u], target);
        }
        continue;
      }

      // Line infantry and machine guns: close to firing range, then hold and shoot.
      const t = priority.find((e) => !e.type.flying) ?? priority[0];
      if (!t) continue;
      const desired = u.type.range > 60 ? u.type.range * 0.82 : 12;
      if (nearestD > desired + 12) {
        const tx = u.x + (t.x - u.x) * 0.5;
        const ty = u.y + (t.y - u.y) * 0.5;
        b.issueMove([u], tx, ty, true);
      } else if (u.order.kind !== 'attack' || u.targetId === 0) {
        b.issueAttack([u], t);
      }
      if (u.morale < 26 && u.type.cls === 'infantry' && nearestD < 60) {
        // Back off wavering battalions instead of feeding them in.
        const away = Math.atan2(u.y - enemyCentreY, u.x - enemyCentreX);
        b.issueMove([u], clamp(u.x + Math.cos(away) * 50, 20, b.map.w - 20), clamp(u.y + Math.sin(away) * 50, 20, b.map.h - 20), false);
      }
    }
    void enemyCentreX;
    void this.approachX;
  }

  private targetScore(u: Unit): number {
    let s = dist(u.x, u.y, this.battle.map.w / 2, this.battle.map.h / 2) * 0.02;
    if (u.type.cls === 'artillery') s -= 30;
    if (u.type.cls === 'mage' || u.type.cls === 'hero') s -= 22;
    if (u.type.cls === 'gun') s -= 12;
    if (u.state === 'routing') s += 50;
    return s;
  }

  private bestSpellSpot(u: Unit, enemies: Unit[]): { x: number; y: number } | null {
    const r = u.type.ability!.radius;
    let best: { x: number; y: number } | null = null;
    let bestCount = 0;
    for (const e of enemies) {
      if (dist(u.x, u.y, e.x, e.y) > u.type.ability!.range + 20) continue;
      let count = 0;
      for (const o of enemies) if (dist(e.x, e.y, o.x, o.y) < r) count += o.men / 20;
      if (e.type.cls === 'artillery' || e.type.cls === 'mage') count += 4;
      if (count > bestCount) {
        bestCount = count;
        best = { x: e.x, y: e.y };
      }
    }
    return bestCount >= 3 ? best : null;
  }
}
