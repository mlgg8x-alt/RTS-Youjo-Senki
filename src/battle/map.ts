// Procedural battlefield: heightmap + woods + trenches + village + modifiers.

import { RNG, clamp, lerp, makeNoise2D } from '../core/util';

export interface WoodPatch {
  x: number;
  y: number;
  r: number;
}
export interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  kind: 'house' | 'barn' | 'church';
}
export interface TrenchLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export type MapKind = 'field' | 'village' | 'ridge';

export class BattleMap {
  readonly w: number;
  readonly h: number;
  readonly cols: number;
  readonly rows: number;
  readonly cell = 8;
  readonly heights: Float32Array;
  readonly woods: WoodPatch[] = [];
  readonly buildings: Building[] = [];
  readonly trenches: TrenchLine[] = [];
  readonly kind: MapKind;
  readonly seed: number;
  private noise: (x: number, y: number) => number;

  constructor(seed: number, kind: MapKind = 'field') {
    const rng = new RNG(seed);
    this.seed = seed;
    this.kind = kind;
    this.w = 560;
    this.h = 380;
    this.cols = Math.ceil(this.w / this.cell) + 1;
    this.rows = Math.ceil(this.h / this.cell) + 1;
    this.heights = new Float32Array(this.cols * this.rows);
    this.noise = makeNoise2D(seed ^ 0x51ed270);

    for (let gy = 0; gy < this.rows; gy++) {
      for (let gx = 0; gx < this.cols; gx++) {
        const nx = gx / this.cols;
        const ny = gy / this.rows;
        let v = this.noise(nx * 4.2, ny * 4.2) * 0.55 + this.noise(nx * 9.5, ny * 9.5) * 0.28;
        // Gentle bowl keeps the flanks readable and the centre fightable.
        const cx = nx - 0.5;
        const cy = ny - 0.5;
        v += (cx * cx + cy * cy) * 0.5;
        if (kind === 'ridge') {
          const ridge = Math.exp(-Math.pow((nx - 0.52) / 0.16, 2));
          v += ridge * 0.5 * (0.7 + this.noise(ny * 5, 3) * 0.6);
        }
        if (kind === 'village') v *= 0.55;
        this.heights[gy * this.cols + gx] = clamp(v, 0, 1) * 20;
      }
    }

    // Wood patches on the flanks — cover and a cavalry screen.
    const woodCount = kind === 'village' ? 2 : 3 + rng.int(0, 2);
    for (let i = 0; i < woodCount; i++) {
      const left = i % 2 === 0;
      this.woods.push({
        x: left ? rng.range(40, this.w * 0.32) : rng.range(this.w * 0.68, this.w - 40),
        y: rng.range(60, this.h - 60),
        r: rng.range(34, 64),
      });
    }
    this.woods.push({ x: rng.range(this.w * 0.4, this.w * 0.6), y: rng.range(70, 140), r: rng.range(24, 40) });

    // Trenches: a broken pair of lines facing each other.
    const midY = this.h / 2;
    for (let s = 0; s < 2; s++) {
      const x = s === 0 ? rng.range(200, 260) : rng.range(this.w - 260, this.w - 200);
      const segs = 3;
      for (let i = 0; i < segs; i++) {
        const y0 = midY - 90 + i * 62 + rng.range(-10, 10);
        this.trenches.push({ x1: x - 32, y1: y0, x2: x + 32, y2: y0 + rng.range(-14, 14) });
      }
    }

    if (kind === 'village' || kind === 'field') {
      const cxp = this.w * 0.5 + rng.range(-40, 40);
      const cyp = this.h * 0.5 + rng.range(-50, 50);
      const n = kind === 'village' ? 7 : 3;
      for (let i = 0; i < n; i++) {
        const ang = rng.range(0, Math.PI * 2);
        const rad = rng.range(10, kind === 'village' ? 85 : 55);
        this.buildings.push({
          x: cxp + Math.cos(ang) * rad,
          y: cyp + Math.sin(ang) * rad,
          w: rng.range(16, 26),
          h: rng.range(12, 20),
          rot: rng.range(-0.4, 0.4),
          kind: rng.chance(0.15) ? 'church' : rng.chance(0.4) ? 'barn' : 'house',
        });
      }
    }
  }

  heightAt(x: number, y: number): number {
    const gx = clamp(x / this.cell, 0, this.cols - 1.001);
    const gy = clamp(y / this.cell, 0, this.rows - 1.001);
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const h00 = this.heights[y0 * this.cols + x0];
    const h10 = this.heights[y0 * this.cols + x0 + 1];
    const h01 = this.heights[(y0 + 1) * this.cols + x0];
    const h11 = this.heights[(y0 + 1) * this.cols + x0 + 1];
    return lerp(lerp(h00, h10, fx), lerp(h01, h11, fx), fy);
  }

  /** 0 = open ground, 1 = deep woods. */
  woodsAt(x: number, y: number): number {
    let cover = 0;
    for (const w of this.woods) {
      const d = Math.hypot(x - w.x, y - w.y);
      if (d < w.r) cover = Math.max(cover, 1 - (d / w.r) * 0.75);
    }
    return clamp(cover, 0, 1);
  }

  inTrench(x: number, y: number): boolean {
    for (const t of this.trenches) {
      const dx = t.x2 - t.x1;
      const dy = t.y2 - t.y1;
      const len2 = dx * dx + dy * dy || 1;
      let u = ((x - t.x1) * dx + (y - t.y1) * dy) / len2;
      u = clamp(u, 0, 1);
      const px = t.x1 + dx * u;
      const py = t.y1 + dy * u;
      if (Math.hypot(x - px, y - py) < 5) return true;
    }
    return false;
  }

  nearBuilding(x: number, y: number, pad = 4): boolean {
    for (const b of this.buildings) {
      if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(y - b.y) < b.h / 2 + pad) return true;
    }
    return false;
  }

  /** Terrain speed multiplier for a ground unit. */
  speedAt(x: number, y: number): number {
    let m = 1;
    const cover = this.woodsAt(x, y);
    m -= cover * 0.32;
    if (this.nearBuilding(x, y)) m -= 0.25;
    const slope = Math.abs(this.heightAt(x + 4, y) - this.heightAt(x - 4, y)) / 8;
    const slopeY = Math.abs(this.heightAt(x, y + 4) - this.heightAt(x, y - 4)) / 8;
    m -= Math.min(0.35, (slope + slopeY) * 0.45);
    return clamp(m, 0.42, 1.1);
  }

  /** Ranged cover multiplier for a defender at this spot (lower is better for attacker). */
  coverAt(x: number, y: number): number {
    const woods = this.woodsAt(x, y);
    const trench = this.inTrench(x, y) ? 0.35 : 0;
    const building = this.nearBuilding(x, y) ? 0.3 : 0;
    return clamp(1 - woods * 0.28 - trench - building, 0.4, 1);
  }

  blocksLOS(ax: number, ay: number, bx: number, by: number): boolean {
    // Only deep woods truly block sight; buildings are low enough to shoot over.
    const steps = 8;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.woodsAt(lerp(ax, bx, t), lerp(ay, by, t)) > 0.72) return true;
    }
    return false;
  }

  deploymentZone(side: 'empire' | 'republic'): { x0: number; x1: number } {
    return side === 'empire' ? { x0: 24, x1: 112 } : { x0: this.w - 112, x1: this.w - 24 };
  }
}
