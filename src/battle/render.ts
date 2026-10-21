// Canvas renderer: baked terrain, LOD soldier sprites, effects, selection, minimap.

import { clamp, hexA } from '../core/util';
import type { Camera } from '../core/camera';
import type { Battle, Effect, Unit } from './battle';
import type { BattleMap } from './map';

const TERRAIN_SCALE = 3; // baked pixels per metre

export interface DrawUI {
  selected: Set<number>;
  hover: number;
  showRanges: boolean;
  orderPreview: { x: number; y: number } | null;
  insetTop: number;
  insetBottom: number;
  deployDrag: { id: number; x: number; y: number } | null;
}

export class BattleRenderer {
  private terrain: HTMLCanvasElement | null = null;
  private terrainMap: BattleMap | null = null;
  private tufts: { x: number; y: number; r: number; c: string }[] = [];
  private trees: { x: number; y: number; r: number; c: string }[] = [];

  bake(map: BattleMap, seed: number): void {
    if (this.terrainMap === map && this.terrain) return;
    const w = Math.round(map.w * TERRAIN_SCALE);
    const h = Math.round(map.h * TERRAIN_SCALE);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const step = 4;
    for (let py = 0; py < h; py += step) {
      for (let px = 0; px < w; px += step) {
        const wx = px / TERRAIN_SCALE;
        const wy = py / TERRAIN_SCALE;
        const height = map.heightAt(wx, wy);
        const hx = map.heightAt(wx + 4, wy) - map.heightAt(wx - 4, wy);
        const hy = map.heightAt(wx, wy + 4) - map.heightAt(wx, wy - 4);
        const light = clamp(0.5 + (-hx * 0.8 - hy * 0.62) * 0.2, 0.12, 1);
        const patch = Math.sin(wx * 0.07 + Math.sin(wy * 0.045) * 2.2) * 0.5 + 0.5;
        const shadeMul = 0.38 + light * 0.8;
        const red = (66 + patch * 16 + height * 1.3) * shadeMul;
        const green = (84 + patch * 24 + height * 2.0) * shadeMul;
        const blue = (46 + patch * 10 + height * 1.0) * shadeMul;
        const woods = map.woodsAt(wx, wy);
        const rr = red * (1 - woods * 0.42) + 26 * woods;
        const gg = green * (1 - woods * 0.28) + 44 * woods;
        const bb = blue * (1 - woods * 0.25) + 26 * woods;
        ctx.fillStyle = `rgb(${clamp(rr, 0, 255) | 0},${clamp(gg, 0, 255) | 0},${clamp(bb, 0, 255) | 0})`;
        ctx.fillRect(px, py, step, step);
      }
    }

    const rng = seeded(seed ^ 0x9e37);

    // Farm strips: worked land reads instantly as a battlefield, not a lawn.
    for (let i = 0; i < 9; i++) {
      const fx = rng() * map.w;
      const fy = rng() * map.h;
      const fw = 30 + rng() * 70;
      const fh = 20 + rng() * 45;
      if (map.woodsAt(fx, fy) > 0.1) continue;
      ctx.save();
      ctx.translate(fx * TERRAIN_SCALE, fy * TERRAIN_SCALE);
      ctx.rotate((rng() - 0.5) * 0.4);
      ctx.fillStyle = rng() > 0.5 ? 'rgba(126,112,66,0.16)' : 'rgba(104,92,52,0.14)';
      ctx.fillRect(-fw * TERRAIN_SCALE / 2, -fh * TERRAIN_SCALE / 2, fw * TERRAIN_SCALE, fh * TERRAIN_SCALE);
      ctx.strokeStyle = 'rgba(70,60,36,0.18)';
      ctx.lineWidth = 1.5;
      for (let gx = -fw / 2; gx < fw / 2; gx += 4) {
        ctx.beginPath();
        ctx.moveTo(gx * TERRAIN_SCALE, -fh * TERRAIN_SCALE / 2);
        ctx.lineTo(gx * TERRAIN_SCALE, fh * TERRAIN_SCALE / 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(88,78,52,0.35)';
      ctx.strokeRect(-fw * TERRAIN_SCALE / 2, -fh * TERRAIN_SCALE / 2, fw * TERRAIN_SCALE, fh * TERRAIN_SCALE);
      ctx.restore();
    }

    // Dirt roads from the centre of the field to each edge.
    ctx.strokeStyle = 'rgba(120,100,70,0.5)';
    ctx.lineCap = 'round';
    for (const [ex, ey] of [[0, map.h * 0.3], [0, map.h * 0.72], [map.w, map.h * 0.35], [map.w, map.h * 0.8]]) {
      ctx.lineWidth = (2.6 + rng() * 1.4) * TERRAIN_SCALE;
      ctx.beginPath();
      ctx.moveTo(map.w * 0.5 * TERRAIN_SCALE, map.h * 0.5 * TERRAIN_SCALE);
      const mx = ((map.w * 0.5 + ex) / 2 + (rng() - 0.5) * 40) * TERRAIN_SCALE;
      const my = ((map.h * 0.5 + ey) / 2 + (rng() - 0.5) * 40) * TERRAIN_SCALE;
      ctx.quadraticCurveTo(mx, my, ex * TERRAIN_SCALE, ey * TERRAIN_SCALE);
      ctx.stroke();
    }

    // Contour lines give the heightmap readable relief.
    ctx.fillStyle = 'rgba(40, 34, 22, 0.18)';
    for (let py = 0; py < h; py += 10) {
      for (let px = 0; px < w; px += 10) {
        const h0 = map.heightAt(px / TERRAIN_SCALE, py / TERRAIN_SCALE);
        const h1 = map.heightAt((px + 10) / TERRAIN_SCALE, py / TERRAIN_SCALE);
        if (Math.floor(h0 / 3) !== Math.floor(h1 / 3)) ctx.fillRect(px, py, 2, 9);
      }
    }

    // Grass tufts + rocks for texture.
    this.tufts = [];
    for (let i = 0; i < 1400; i++) {
      const x = rng() * map.w;
      const y = rng() * map.h;
      this.tufts.push({ x, y, r: 0.4 + rng() * 1.1, c: rng() > 0.6 ? 'rgba(120,132,80,0.35)' : 'rgba(72,80,52,0.3)' });
    }
    for (const t of this.tufts) {
      ctx.fillStyle = t.c;
      ctx.beginPath();
      ctx.arc(t.x * TERRAIN_SCALE, t.y * TERRAIN_SCALE, t.r * TERRAIN_SCALE, 0, Math.PI * 2);
      ctx.fill();
    }

    // Woods.
    this.trees = [];
    for (const w of map.woods) {
      for (let i = 0; i < w.r * 2.6; i++) {
        const a = rng() * Math.PI * 2;
        const rad = Math.sqrt(rng()) * w.r;
        this.trees.push({
          x: w.x + Math.cos(a) * rad,
          y: w.y + Math.sin(a) * rad,
          r: 1.4 + rng() * 1.7,
          c: rng() > 0.45 ? '#26331f' : '#2e3c25',
        });
      }
    }
    for (const t of [...this.trees].sort((a, b) => a.y - b.y)) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(t.x * TERRAIN_SCALE + 3, t.y * TERRAIN_SCALE + 3, t.r * TERRAIN_SCALE, t.r * TERRAIN_SCALE * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t.c;
      ctx.beginPath();
      ctx.arc(t.x * TERRAIN_SCALE, t.y * TERRAIN_SCALE, t.r * TERRAIN_SCALE, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,170,110,0.22)';
      ctx.beginPath();
      ctx.arc(t.x * TERRAIN_SCALE - 2, t.y * TERRAIN_SCALE - 2, t.r * TERRAIN_SCALE * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Trenches: dark cut with sandbag lips along both sides.
    for (const t of map.trenches) {
      const ax = t.x1 * TERRAIN_SCALE;
      const ay = t.y1 * TERRAIN_SCALE;
      const bx = t.x2 * TERRAIN_SCALE;
      const by = t.y2 * TERRAIN_SCALE;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(30,24,18,0.55)';
      ctx.lineWidth = 8 * TERRAIN_SCALE;
      ctx.beginPath();
      ctx.moveTo(ax + 2, ay + 3);
      ctx.lineTo(bx + 2, by + 3);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(52,42,30,0.95)';
      ctx.lineWidth = 5 * TERRAIN_SCALE;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      const len = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / (len || 1);
      const uy = (by - ay) / (len || 1);
      for (let d = 0; d < len; d += 3 * TERRAIN_SCALE) {
        for (const side of [-1, 1]) {
          ctx.fillStyle = side < 0 ? 'rgba(146,126,92,0.9)' : 'rgba(120,102,72,0.85)';
          ctx.beginPath();
          ctx.arc(ax + ux * d - uy * side * 3.3 * TERRAIN_SCALE, ay + uy * d + ux * side * 3.3 * TERRAIN_SCALE, 1.7 * TERRAIN_SCALE, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Buildings: shadow, walls, pitched roof, ridge.
    for (const b of map.buildings) {
      ctx.save();
      ctx.translate(b.x * TERRAIN_SCALE, b.y * TERRAIN_SCALE);
      ctx.rotate(b.rot);
      const bw = b.w * TERRAIN_SCALE;
      const bh = b.h * TERRAIN_SCALE;
      ctx.fillStyle = 'rgba(20,16,10,0.4)';
      ctx.fillRect(-bw / 2 + 6, -bh / 2 + 8, bw, bh);
      ctx.fillStyle = '#6e5a44';
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      const roof = ctx.createLinearGradient(-bw / 2, -bh / 2, bw / 2, bh / 2);
      roof.addColorStop(0, b.kind === 'church' ? '#7d6a58' : '#8a6047');
      roof.addColorStop(1, b.kind === 'church' ? '#4f4236' : '#5a3a2a');
      ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, -bh / 2);
      ctx.lineTo(bw / 2, -bh * 0.36);
      ctx.lineTo(bw / 2, bh * 0.36);
      ctx.lineTo(-bw / 2, bh / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,22,16,0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,225,180,0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, -bh / 2);
      ctx.lineTo(bw / 2, -bh * 0.36);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(30,24,18,0.5)';
      for (let i = 1; i < 5; i++) {
        const yy = -bh / 2 + (bh * i) / 5;
        ctx.beginPath();
        ctx.moveTo(-bw / 2, yy);
        ctx.lineTo(bw / 2, yy * 0.75);
        ctx.stroke();
      }
      if (b.kind === 'church') {
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(-bw * 0.1, -bh * 0.1, bw * 0.2, bh * 0.2);
        ctx.strokeStyle = 'rgba(230,210,170,0.5)';
        ctx.beginPath();
        ctx.moveTo(0, -bh * 0.22);
        ctx.lineTo(0, bh * 0.2);
        ctx.moveTo(-bw * 0.12, -bh * 0.02);
        ctx.lineTo(bw * 0.12, -bh * 0.02);
        ctx.stroke();
      }
      ctx.restore();
    }

    this.terrain = c;
    this.terrainMap = map;
  }

  draw(ctx: CanvasRenderingContext2D, battle: Battle, cam: Camera, ui: DrawUI, time: number): void {
    this.bake(battle.map, battle.seed);
    const { w, h } = cam;
    ctx.save();
    ctx.fillStyle = '#15130f';
    ctx.fillRect(0, 0, w, h);

    if (this.terrain) {
      const tl = cam.worldToScreen(0, 0);
      const scale = cam.zoom / TERRAIN_SCALE;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.terrain, tl.x, tl.y, battle.map.w * cam.zoom, battle.map.h * cam.zoom);
      void scale;
    }

    this.drawDeployment(ctx, battle, cam);
    ctx.restore();

    const vis = cam.visibleBounds();
    const visible = (x: number, y: number, pad = 40) => x > vis.x0 - pad && x < vis.x1 + pad && y > vis.y0 - pad && y < vis.y1 + pad;

    // Selected unit ground markers (under troops).
    for (const u of battle.units) {
      if (!u.alive || !ui.selected.has(u.id)) continue;
      this.drawSelectionRing(ctx, u, cam, time, false);
    }

    const sorted = [...battle.units].filter((u) => u.alive).sort((a, b) => a.ry - b.ry);
    for (const u of sorted) {
      if (!visible(u.rx, u.ry, u.frontage * 0.7 + 30)) continue;
      this.drawUnit(ctx, u, cam, battle, ui);
      if (ui.selected.has(u.id)) this.drawSelectionRing(ctx, u, cam, time, true);
    }

    // Projectiles.
    for (const p of battle.projectiles) {
      const t = clamp(p.t / p.flight, 0, 1);
      const x = p.x0 + (p.tx - p.x0) * t;
      const y = p.y0 + (p.ty - p.y0) * t;
      const s = cam.worldToScreen(x, y);
      const lift = Math.sin(Math.PI * t) * p.arc * cam.zoom * 0.35;
      ctx.fillStyle = p.kind === 'spell' ? 'rgba(160,240,230,0.9)' : 'rgba(30,26,22,0.9)';
      ctx.beginPath();
      ctx.arc(s.x, s.y - lift, Math.max(1.6, cam.zoom * 0.7), 0, Math.PI * 2);
      ctx.fill();
      if (p.kind === 'spell') {
        ctx.strokeStyle = 'rgba(160,240,230,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y - lift, Math.max(3, cam.zoom * 1.6), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (const e of battle.effects) this.drawEffect(ctx, e, cam);

    // Order preview.
    if (ui.orderPreview) {
      const s = cam.worldToScreen(ui.orderPreview.x, ui.orderPreview.y);
      ctx.strokeStyle = 'rgba(255,240,200,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ranges.
    if (ui.showRanges) {
      for (const u of sorted) {
        if (!ui.selected.has(u.id) || u.type.range <= 0) continue;
        const s = cam.worldToScreen(u.rx, u.ry);
        ctx.strokeStyle = 'rgba(240,220,160,0.35)';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(s.x, s.y, u.type.range * cam.zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    this.drawOffscreenMarkers(ctx, battle, cam, vis);
    this.drawMinimap(ctx, battle, cam, ui);
  }

  private drawDeployment(ctx: CanvasRenderingContext2D, battle: Battle, cam: Camera): void {
    const zones: { side: 'empire' | 'republic'; color: string }[] = [
      { side: 'empire', color: 'rgba(201,180,122,0.10)' },
      { side: 'republic', color: 'rgba(157,180,192,0.10)' },
    ];
    for (const z of zones) {
      const zone = battle.map.deploymentZone(z.side);
      const a = cam.worldToScreen(zone.x0, 0);
      const b = cam.worldToScreen(zone.x1, battle.map.h);
      ctx.fillStyle = z.color;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
  }

  private drawUnit(ctx: CanvasRenderingContext2D, u: Unit, cam: Camera, battle: Battle, ui: DrawUI): void {
    const zoom = cam.zoom;
    const cos = Math.cos(u.rFacing);
    const sin = Math.sin(u.rFacing);
    const center = cam.worldToScreen(u.rx, u.ry);
    const isPlayer = u.side === battle.playerSide;
    const uniform = isPlayer ? '#c8b78c' : '#9db6c6';
    const dark = isPlayer ? '#6d6047' : '#41586a';
    const routing = u.state === 'routing';
    const wavering = u.morale < 30 && !routing;

    // Soft formation shadow.
    const wpx = u.frontage * zoom;
    const dpx = u.depth * zoom;
    if (wpx > 12 && dpx > 6) {
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(u.rFacing);
      ctx.fillStyle = routing ? 'rgba(80,70,60,0.10)' : 'rgba(20,16,12,0.16)';
      ctx.fillRect(-dpx / 2, -wpx / 2, dpx, wpx);
      ctx.restore();
    }

    if (zoom >= 1.05) {
      const bodyR = clamp(zoom * 0.62, 1.35, 4.2);
      const rifleLen = clamp(zoom * 1.5, 2.5, 9);
      const stepBob = u.state === 'moving' || routing ? 1 : 0;
      const fc = Math.cos(u.rFacing);
      const fs = Math.sin(u.rFacing);
      for (const s of u.soldiers) {
        if (!s.alive) continue;
        const wx = u.rx + cos * s.ox - sin * s.oy;
        const wy = u.ry + sin * s.ox + cos * s.oy;
        const p = cam.worldToScreen(wx, wy);
        const bob = stepBob * Math.sin(u.walkT * 5 + s.phase) * 0.7;
        ctx.fillStyle = 'rgba(12,10,8,0.32)';
        ctx.beginPath();
        ctx.arc(p.x + 0.6, p.y + bob + 0.9, bodyR + 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = routing ? '#9c958a' : dark;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, bodyR + 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = u.hitFlash > 0 ? '#f3d6b3' : uniform;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, bodyR, 0, Math.PI * 2);
        ctx.fill();
        if (zoom > 1.6) {
          // Helmet/head and rifle make the tiny figures readable at a glance.
          ctx.fillStyle = routing ? '#b9b1a4' : shadeHex(uniform, -0.32);
          ctx.beginPath();
          ctx.arc(p.x - fc * bodyR * 0.45, p.y + bob - fs * bodyR * 0.45, bodyR * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(28,24,18,0.8)';
          ctx.lineWidth = Math.max(1, zoom * 0.2);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + bob);
          ctx.lineTo(p.x + fc * rifleLen, p.y + fs * rifleLen + bob);
          ctx.stroke();
        }
      }
    } else {
      // LOD: draw the mass of the formation instead of individual men.
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(u.rFacing);
      ctx.fillStyle = routing ? '#948b7d' : uniform;
      ctx.fillRect(-dpx / 2, -wpx / 2, dpx, wpx);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(-dpx / 2, -wpx / 2, dpx * 0.35, wpx);
      ctx.restore();
    }

    if (u.type.cls === 'artillery' || u.type.cls === 'gun') {
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(u.rFacing);
      ctx.fillStyle = '#3a3833';
      const gunW = clamp(zoom * 2.4, 3, 12);
      ctx.fillRect(-gunW, -wpx * 0.35, gunW * 2, Math.max(2, wpx * 0.7));
      ctx.restore();
    }
    if (u.type.cls === 'cavalry') {
      ctx.fillStyle = 'rgba(60,44,30,0.5)';
      ctx.beginPath();
      ctx.ellipse(center.x, center.y + 2, wpx * 0.45, dpx * 0.6, u.rFacing, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flag + status.
    const flagY = center.y - Math.max(12, dpx * 0.8) - 8;
    const poleH = clamp(zoom * 6, 14, 34);
    const flagColor = isPlayer ? '#d9c68b' : '#93aebf';
    ctx.strokeStyle = 'rgba(25,20,16,0.8)';
    ctx.lineWidth = Math.max(1, zoom * 0.22);
    ctx.beginPath();
    ctx.moveTo(center.x, flagY);
    ctx.lineTo(center.x, flagY - poleH);
    ctx.stroke();
    ctx.fillStyle = routing ? 'rgba(230,230,230,0.85)' : wavering ? '#c98c5a' : flagColor;
    const fw = clamp(zoom * 4.2, 10, 22);
    const fh = clamp(zoom * 2.4, 6, 13);
    ctx.beginPath();
    ctx.moveTo(center.x, flagY - poleH);
    ctx.lineTo(center.x + fw, flagY - poleH + fh * 0.35);
    ctx.lineTo(center.x, flagY - poleH + fh);
    ctx.closePath();
    ctx.fill();

    const showLabel = !routing && (zoom <= 2.1 || ui.selected.has(u.id) || ui.hover === u.id);
    if (showLabel) {
      ctx.fillStyle = 'rgba(18,15,12,0.72)';
      const label = u.type.short;
      ctx.font = `${Math.round(clamp(zoom * 3.4, 9, 12))}px system-ui, sans-serif`;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(center.x - tw / 2 - 3, flagY - poleH - 15, tw + 6, 14);
      ctx.fillStyle = wavering ? '#e8b37a' : '#e8dfc8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, center.x, flagY - poleH - 8);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    if (u.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,220,180,${u.hitFlash * 0.5})`;
      ctx.beginPath();
      ctx.arc(center.x, center.y, Math.max(10, wpx * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    if (ui.hover === u.id) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(center.x, center.y, Math.max(10, wpx * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Morale pip.
    if (zoom > 1.1) {
      const barW = clamp(wpx * 0.6, 16, 46);
      const barX = center.x - barW / 2;
      const by = flagY + 4;
      ctx.fillStyle = 'rgba(10,8,6,0.6)';
      ctx.fillRect(barX, by, barW, 3);
      ctx.fillStyle = routing ? '#cfcfcf' : u.morale > 55 ? '#8fbf7a' : u.morale > 28 ? '#d7b45a' : '#c46a52';
      ctx.fillRect(barX, by, barW * clamp(u.morale / 100, 0, 1), 3);
      if (u.type.ability) {
        const r = 6;
        const ax = center.x + barW / 2 + 8;
        const ready = u.abilityT <= 0;
        ctx.beginPath();
        ctx.arc(ax, by + 1, r, 0, Math.PI * 2);
        ctx.fillStyle = ready ? hexA('#8fe0d4', 0.95) : 'rgba(40,40,40,0.8)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,20,20,0.9)';
        ctx.stroke();
        if (!ready) {
          ctx.fillStyle = 'rgba(143,224,212,0.8)';
          ctx.beginPath();
          ctx.moveTo(ax, by + 1);
          ctx.arc(ax, by + 1, r * 0.7, -Math.PI / 2, -Math.PI / 2 + (1 - u.abilityT / (u.type.ability.cooldown || 1)) * Math.PI * 2);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  private drawSelectionRing(ctx: CanvasRenderingContext2D, u: Unit, cam: Camera, time: number, top: boolean): void {
    const c = cam.worldToScreen(u.rx, u.ry);
    const wpx = u.frontage * cam.zoom;
    const dpx = u.depth * cam.zoom;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(u.rFacing);
    ctx.strokeStyle = top ? 'rgba(245,232,190,0.95)' : 'rgba(245,232,190,0.35)';
    ctx.lineWidth = top ? 2 : 4;
    ctx.setLineDash(top ? [] : [5, 5]);
    ctx.strokeRect(-dpx / 2 - 3, -wpx / 2 - 3, dpx + 6, wpx + 6);
    ctx.setLineDash([]);
    ctx.restore();
    if (top) {
      const pulse = 1 + Math.sin(time * 4) * 0.06;
      ctx.strokeStyle = 'rgba(245,232,190,0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.max(18, wpx * 0.55) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawEffect(ctx: CanvasRenderingContext2D, e: Effect, cam: Camera): void {
    const t = clamp(e.t / e.life, 0, 1);
    const a = cam.worldToScreen(e.x, e.y);
    const b = cam.worldToScreen(e.x2, e.y2);
    switch (e.kind) {
      case 'tracer': {
        ctx.strokeStyle = hexA(e.color, 0.75 * (1 - t));
        ctx.lineWidth = Math.max(1, cam.zoom * 0.25);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        break;
      }
      case 'flash': {
        const r = e.size * cam.zoom * (0.6 + t * 0.6);
        const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, Math.max(2, r));
        g.addColorStop(0, `rgba(255,240,190,${0.9 * (1 - t)})`);
        g.addColorStop(0.4, `rgba(255,170,70,${0.55 * (1 - t)})`);
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(a.x, a.y, Math.max(2, r), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'smoke': {
        const r = e.size * cam.zoom * (0.8 + t * 2.2);
        ctx.fillStyle = hexA('#c9c0b2', 0.22 * (1 - t));
        ctx.beginPath();
        ctx.arc(a.x - t * 6, a.y - t * 10, Math.max(2, r), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'explosion': {
        const r = e.size * cam.zoom * (0.3 + t * 1.35);
        const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, Math.max(3, r));
        g.addColorStop(0, `rgba(255,245,210,${0.85 * (1 - t)})`);
        g.addColorStop(0.35, `rgba(255,150,60,${0.6 * (1 - t)})`);
        g.addColorStop(1, 'rgba(90,70,50,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(a.x, a.y, Math.max(3, r), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(60,48,36,${0.4 * (1 - t)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(a.x, a.y, Math.max(3, r * 1.15), 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'spell': {
        const r = e.size * cam.zoom * (0.4 + t * 1.1);
        ctx.strokeStyle = `rgba(150,235,225,${0.7 * (1 - t)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(a.x, a.y, Math.max(4, r), 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'ring': {
        const r = e.size * cam.zoom * (0.3 + t);
        ctx.strokeStyle = hexA(e.color, 0.55 * (1 - t));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(a.x, a.y, Math.max(4, r), 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'blood': {
        const r = e.size * cam.zoom * (0.4 + t * 0.8);
        ctx.fillStyle = hexA(e.color, 0.35 * (1 - t));
        ctx.beginPath();
        ctx.arc(a.x, a.y, Math.max(1.5, r), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  private drawOffscreenMarkers(
    ctx: CanvasRenderingContext2D,
    battle: Battle,
    cam: Camera,
    vis: { x0: number; y0: number; x1: number; y1: number },
  ): void {
    for (const u of battle.units) {
      if (!u.alive) continue;
      if (u.rx > vis.x0 && u.rx < vis.x1 && u.ry > vis.y0 && u.ry < vis.y1) continue;
      const isPlayer = u.side === battle.playerSide;
      const sx = clamp(((u.rx - vis.x0) / (vis.x1 - vis.x0)) * cam.w, 14, cam.w - 14);
      const sy = clamp(((u.ry - vis.y0) / (vis.y1 - vis.y0)) * cam.h, 14, cam.h - 14);
      ctx.fillStyle = isPlayer ? 'rgba(201,180,122,0.75)' : 'rgba(157,180,192,0.75)';
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMinimap(ctx: CanvasRenderingContext2D, battle: Battle, cam: Camera, ui: DrawUI): void {
    const pad = 8;
    const mw = Math.min(124, cam.w * 0.23);
    const mh = (mw * battle.map.h) / battle.map.w;
    const x0 = cam.w - mw - pad;
    const y0 = cam.h - mh - ui.insetBottom - pad;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(16,13,10,0.68)';
    ctx.fillRect(x0, y0, mw, mh);
    ctx.strokeStyle = 'rgba(190,170,130,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, mw, mh);
    const sx = mw / battle.map.w;
    const sy = mh / battle.map.h;
    for (const u of battle.units) {
      if (!u.alive) continue;
      ctx.fillStyle = u.side === battle.playerSide ? '#d9c68b' : '#8fb0c2';
      ctx.fillRect(x0 + u.rx * sx - 1.5, y0 + u.ry * sy - 1.5, 3, 3);
    }
    const vis = cam.visibleBounds();
    ctx.strokeStyle = 'rgba(255,250,235,0.7)';
    ctx.strokeRect(x0 + vis.x0 * sx, y0 + vis.y0 * sy, (vis.x1 - vis.x0) * sx, (vis.y1 - vis.y0) * sy);
    ctx.globalAlpha = 1;
    void ui.insetBottom;
  }
}

function shadeHex(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const f = (v: number) => clamp(Math.round(v * (1 + amount)), 0, 255);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
