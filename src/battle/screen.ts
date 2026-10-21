// Battle screen: canvas + HUD, touch/mouse controls, fixed-step loop, result panel.

import { Camera } from '../core/camera';
import { clamp, dist, el, formatTime, isTouchDevice } from '../core/util';
import { Battle, type BattleResult, type Unit } from './battle';
import { TacticalAI } from './ai';
import { BattleRenderer, type DrawUI } from './render';

export interface BattleScreenOptions {
  battle: Battle;
  onExit: (result: BattleResult) => void;
}

type Mode = 'select' | 'attackmove' | 'ability';

export class BattleScreen {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hud: HTMLElement;
  private battle: Battle;
  private renderer = new BattleRenderer();
  private camera = new Camera();
  private ai: TacticalAI;
  private onExit: (result: BattleResult) => void;
  private selected = new Set<number>();
  private mode: Mode = 'select';
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = true;
  private hover = 0;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; type: string }>();
  private panStart: { x: number; y: number; camX: number; camY: number } | null = null;
  private pinchStart: { dist: number; zoom: number; cx: number; cy: number } | null = null;
  private boxSelect: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private downOn: { x: number; y: number; t: number; unitId: number; moved: boolean } | null = null;
  private deployDrag: number = 0;
  private toastT = 0;
  private uiTick = 0;
  private eventCursor = 0;
  private endShown = false;
  private dirtyCards = true;
  private orderSig = '';
  private orderPreview: { x: number; y: number } | null = null;
  private topEl!: HTMLElement;
  private cardsEl!: HTMLElement;
  private orderEl!: HTMLElement;
  private toastEl!: HTMLElement;
  private strEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private speedEl!: HTMLElement;

  constructor(container: HTMLElement, opts: BattleScreenOptions) {
    this.root = container;
    this.battle = opts.battle;
    this.onExit = opts.onExit;
    this.ai = new TacticalAI(opts.battle, opts.battle.enemySide);

    this.root.innerHTML = '';
    const wrap = el('div', 'battle-screen');
    this.canvas = el('canvas', 'battle-canvas');
    this.hud = el('div', 'battle-hud');
    wrap.append(this.canvas, this.hud);
    this.root.append(wrap);
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('canvas 2d unavailable');
    this.ctx = ctx;

    this.buildHud();
    this.resize();
    this.camera.setMap(this.battle.map.w, this.battle.map.h);
    const all = this.battle.units.filter((u) => u.alive);
    if (all.length) {
      const minX = Math.min(...all.map((u) => u.x));
      const maxX = Math.max(...all.map((u) => u.x));
      const minY = Math.min(...all.map((u) => u.y));
      const maxY = Math.max(...all.map((u) => u.y));
      const fit = Math.min(this.camera.w / (maxX - minX + 120), this.camera.h / (maxY - minY + 130));
      this.camera.zoom = Math.min(isTouchDevice() ? 2.1 : 2.4, Math.max(1.0, fit));
      this.camera.centerOn((minX + maxX) / 2, (minY + maxY) / 2);
    }
    this.bindEvents();
    this.rebuildCards();
    this.updateHud(true);
    this.loop(performance.now());
    this.toast('Tap a card to select. Tap the ground to move, tap an enemy to attack.');
  }

  // ── HUD ──────────────────────────────────────────────────────────────────
  private buildHud(): void {
    this.topEl = el('div', 'bt-top');
    const left = el('div', 'bt-top-left');
    const menuBtn = el('button', 'bt-icon', '☰');
    menuBtn.onclick = () => this.openPause();
    left.append(menuBtn);
    this.strEl = el('div', 'bt-strength');
    left.append(this.strEl);
    this.timerEl = el('div', 'bt-timer', '15:00');
    const right = el('div', 'bt-top-right');
    const pauseBtn = el('button', 'bt-icon', '❚❚');
    pauseBtn.onclick = () => this.togglePause();
    this.speedEl = el('button', 'bt-icon bt-speed', '1×');
    this.speedEl.onclick = () => this.cycleSpeed();
    right.append(pauseBtn, this.speedEl);
    this.topEl.append(left, this.timerEl, right);

    this.toastEl = el('div', 'bt-toasts');

    this.cardsEl = el('div', 'bt-cards');
    this.orderEl = el('div', 'bt-orders');

    const bottom = el('div', 'bt-bottom');
    bottom.append(this.orderEl, this.cardsEl);

    this.hud.append(this.topEl, this.toastEl, bottom);
  }

  private rebuildCards(): void {
    this.cardsEl.innerHTML = '';
    const units = this.battle.units.filter((u) => u.side === this.battle.playerSide);
    for (const u of units) {
      const card = el('button', 'bt-card');
      card.dataset.id = String(u.id);
      const icon = el('span', 'bt-card-icon', u.type.icon);
      icon.style.color = u.type.color;
      const info = el('span', 'bt-card-info');
      const name = el('span', 'bt-card-name', u.type.short);
      const men = el('span', 'bt-card-men', `${u.men}`);
      info.append(name, men);
      const bar = el('span', 'bt-card-bar');
      const fill = el('span', 'bt-card-fill');
      bar.append(fill);
      card.append(icon, info, bar);
      card.onclick = () => {
        if (u.alive) this.tapCard(u);
      };
      this.cardsEl.append(card);
    }
    this.dirtyCards = true;
  }

  private updateCards(): void {
    if (this.dirtyCards) this.dirtyCards = false;
    for (const card of Array.from(this.cardsEl.children) as HTMLElement[]) {
      const id = Number(card.dataset.id);
      const u = this.battle.unitById(id);
      if (!u) continue;
      card.classList.toggle('selected', this.selected.has(id));
      card.classList.toggle('dead', !u.alive);
      card.classList.toggle('routing', u.state === 'routing');
      card.classList.toggle('wavering', u.morale < 30 && u.state !== 'routing');
      const men = card.querySelector('.bt-card-men');
      if (men) men.textContent = String(u.men);
      const fill = card.querySelector('.bt-card-fill') as HTMLElement | null;
      if (fill) {
        fill.style.width = `${clamp(u.morale, 0, 100)}%`;
        fill.style.background = u.state === 'routing' ? '#cfcfcf' : u.morale > 55 ? '#8fbf7a' : u.morale > 28 ? '#d7b45a' : '#c46a52';
      }
    }
    this.dirtyCards = false;
  }

  private updateHud(force = false): void {
    const b = this.battle;
    const p = b.armyStrength(b.playerSide);
    const e = b.armyStrength(b.enemySide);
    const total = Math.max(1, p + e);
    const pPct = (p / total) * 100;
    this.strEl.innerHTML = `
      <div class="bt-str-bar"><span style="width:${pPct}%" class="bt-str-you"></span><span style="width:${100 - pPct}%" class="bt-str-foe"></span></div>
      <div class="bt-str-label"><span>${Math.round(p)}</span><span>${Math.round(e)}</span></div>`;
    const left = Math.max(0, b.timeLimit - b.time);
    this.timerEl.textContent = formatTime(left);
    this.timerEl.classList.toggle('urgent', left < 120);
    this.speedEl.textContent = b.paused ? '❚❚' : `${b.speed}×`;
    this.updateCards();
    this.syncOrderPanel();
    if (force) this.dirtyCards = false;
    if (b.state === 'over' && b.result && !this.endShown) this.showResult(b.result);
  }

  /** Rebuilds the order buttons only when their state actually changes. */
  private syncOrderPanel(): void {
    const sel = this.selectedUnits();
    const sig = `${[...this.selected].sort().join(',')}|${this.mode}|${sel.some((u) => u.type.ability && u.abilityT <= 0)}`;
    if (sig === this.orderSig) return;
    this.orderSig = sig;
    this.updateOrderPanel();
  }

  private updateOrderPanel(): void {
    const sel = this.selectedUnits();
    const hasSel = sel.length > 0;
    const canAbility = sel.some((u) => u.type.ability && u.abilityT <= 0 && u.alive);
    const label = this.mode === 'attackmove' ? '◉ Attack-move' : '⚑ Move';
    this.orderEl.innerHTML = '';
    const mk = (text: string, cls: string, fn: () => void, disabled = false) => {
      const b = el('button', `bt-order ${cls}`, text);
      b.disabled = disabled;
      b.onclick = fn;
      return b;
    };
    const row1 = el('div', 'bt-order-row');
    row1.append(
      mk(label, this.mode === 'attackmove' ? 'active' : '', () => {
        this.mode = this.mode === 'attackmove' ? 'select' : 'attackmove';
        this.updateOrderPanel();
      }, !hasSel),
      mk('⛨ Hold', '', () => {
        this.battle.issueHold(sel);
        this.toast('Holding position.');
      }, !hasSel),
    );
    const row2 = el('div', 'bt-order-row');
    row2.append(
      mk('⌁ Wide', '', () => {
        this.battle.setFormation(sel, 2);
        this.toast('Line extended — wider frontage, thinner ranks.');
      }, !hasSel),
      mk('▤ Deep', '', () => {
        this.battle.setFormation(sel, 4);
        this.toast('Columns formed — deeper ranks.');
      }, !hasSel),
    );
    const row3 = el('div', 'bt-order-row');
    row3.append(
      mk(hasSel && this.mode === 'ability' ? '✦ Cast…' : '✦ Ability', this.mode === 'ability' ? 'active' : '', () => {
        if (!canAbility) {
          this.toast('No mage ability ready.');
          return;
        }
        this.mode = this.mode === 'ability' ? 'select' : 'ability';
        if (this.mode === 'ability') this.toast('Tap the target point for magic artillery.');
        this.updateOrderPanel();
      }, !canAbility),
      mk('✦ All', '', () => {
        for (const u of this.battle.unitsOf(this.battle.playerSide)) this.selected.add(u.id);
        this.dirtyCards = true;
        this.updateOrderPanel();
      }),
    );
    this.orderEl.append(row1, row2, row3);
  }

  // ── Selection & orders ───────────────────────────────────────────────────
  private selectedUnits(): Unit[] {
    const out: Unit[] = [];
    for (const id of this.selected) {
      const u = this.battle.unitById(id);
      if (u && u.alive && u.side === this.battle.playerSide) out.push(u);
    }
    return out;
  }

  private tapCard(u: Unit): void {
    if (this.selected.has(u.id) && this.selected.size === 1) {
      this.camera.centerOn(u.x, u.y);
    } else {
      this.selected.clear();
      this.selected.add(u.id);
      this.dirtyCards = true;
      this.updateOrderPanel();
      this.orderPreview = null;
    }
  }

  private tapWorld(wx: number, wy: number): void {
    const b = this.battle;
    const hit = this.unitAt(wx, wy);
    const sel = this.selectedUnits();
    if (this.mode === 'ability') {
      const mages = sel.filter((u) => u.type.ability && u.abilityT <= 0);
      const mage = mages.find((u) => dist(u.x, u.y, wx, wy) <= u.type.ability!.range) ?? mages[0];
      if (!mage) {
        this.toast('No mage in range — fly closer.');
      } else if (b.castAbility(mage, wx, wy)) {
        this.toast(`${mage.type.ability!.name} incoming.`);
      } else {
        this.toast('Out of casting range.');
      }
      this.mode = 'select';
      this.updateOrderPanel();
      return;
    }
    if (hit && hit.side === b.enemySide) {
      if (sel.length) {
        b.issueAttack(sel, hit);
        this.toast(`Attack — ${hit.type.name}`);
      } else {
        this.selected.clear();
        this.selected.add(hit.id);
      }
      return;
    }
    if (hit && hit.side === b.playerSide) {
      if (!sel.includes(hit) || sel.length > 1) {
        this.selected.clear();
        this.selected.add(hit.id);
        this.dirtyCards = true;
      } else {
        this.camera.centerOn(hit.x, hit.y);
      }
      this.updateOrderPanel();
      return;
    }
    if (sel.length) {
      const attackMove = this.mode === 'attackmove';
      b.issueMove(sel, wx, wy, attackMove);
      this.toast(attackMove ? 'Advancing to contact.' : 'Move order.');
      this.mode = 'select';
      this.updateOrderPanel();
    } else {
      this.selected.clear();
    }
  }

  private unitAt(wx: number, wy: number): Unit | null {
    let best: Unit | null = null;
    let bestD = Infinity;
    for (const u of this.battle.units) {
      if (!u.alive) continue;
      const d = dist(wx, wy, u.rx, u.ry);
      const reach = Math.max(10, u.frontage * 0.45, u.depth * 0.9);
      if (d < reach && d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  // ── Input ────────────────────────────────────────────────────────────────
  private bindEvents(): void {
    const c = this.canvas;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => this.onDown(e));
    c.addEventListener('pointermove', (e) => this.onMove(e));
    c.addEventListener('pointerup', (e) => this.onUp(e));
    c.addEventListener('pointercancel', (e) => this.onUp(e));
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      this.camera.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY > 0 ? 0.9 : 1.1);
    }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private onKey = (e: KeyboardEvent): void => {
    const b = this.battle;
    const sel = this.selectedUnits();
    switch (e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        this.togglePause();
        break;
      case 'escape':
        if (this.mode !== 'select') {
          this.mode = 'select';
          this.updateOrderPanel();
        } else {
          this.openPause();
        }
        break;
      case 'a':
        this.mode = 'attackmove';
        this.updateOrderPanel();
        break;
      case 's':
        b.issueHold(sel);
        break;
      case 'tab':
        e.preventDefault();
        for (const u of b.unitsOf(b.playerSide)) this.selected.add(u.id);
        this.dirtyCards = true;
        this.updateOrderPanel();
        break;
      case 'q':
        if (sel.some((u) => u.type.ability && u.abilityT <= 0)) {
          this.mode = 'ability';
          this.updateOrderPanel();
          this.toast('Tap the target point for magic artillery.');
        }
        break;
    }
  };

  private onVisibility = (): void => {
    if (document.hidden && this.battle.state === 'running') this.battle.paused = true;
  };

  private ndc(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onDown(e: PointerEvent): void {
    this.canvas.setPointerCapture?.(e.pointerId);
    const p = this.ndc(e);
    this.pointers.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y, type: e.pointerType });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchStart = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: this.camera.zoom,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      };
      this.panStart = null;
      this.boxSelect = null;
      return;
    }
    const w = this.camera.screenToWorld(p.x, p.y);
    const hit = this.unitAt(w.x, w.y);

    if (e.pointerType === 'mouse' && e.button === 2) {
      // Right click: order.
      const sel = this.selectedUnits();
      if (hit && hit.side === this.battle.enemySide && sel.length) this.battle.issueAttack(sel, hit);
      else if (sel.length) this.battle.issueMove(sel, w.x, w.y, e.shiftKey);
      return;
    }
    if (e.pointerType === 'mouse' && e.button === 0 && this.battle.state === 'deploy' && hit && hit.side === this.battle.playerSide) {
      this.deployDrag = hit.id;
      return;
    }
    if (e.pointerType === 'mouse' && e.button === 0 && !hit && this.battle.state === 'running') {
      this.boxSelect = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      return;
    }
    if (hit && hit.side === this.battle.playerSide && this.battle.state === 'deploy') {
      this.deployDrag = hit.id;
      return;
    }
    this.downOn = { x: p.x, y: p.y, t: performance.now(), unitId: hit ? hit.id : 0, moved: false };
    this.panStart = { x: p.x, y: p.y, camX: this.camera.x, camY: this.camera.y };
  }

  private onMove(e: PointerEvent): void {
    const p = this.ndc(e);
    const entry = this.pointers.get(e.pointerId);
    if (entry) {
      if (Math.hypot(p.x - entry.sx, p.y - entry.sy) > 8 && this.downOn) this.downOn.moved = true;
      entry.x = p.x;
      entry.y = p.y;
      if (this.pointers.size === 2 && this.pinchStart) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        this.camera.zoomAt(midX, midY, (this.pinchStart.zoom * (d / Math.max(1, this.pinchStart.dist))) / this.camera.zoom);
        this.camera.panBy(midX - this.pinchStart.cx, midY - this.pinchStart.cy);
        this.pinchStart = { dist: d, zoom: this.camera.zoom, cx: midX, cy: midY };
        return;
      }
      if (this.boxSelect) {
        this.boxSelect.x1 = p.x;
        this.boxSelect.y1 = p.y;
        return;
      }
      if (this.deployDrag) {
        const w = this.camera.screenToWorld(p.x, p.y);
        const u = this.battle.unitById(this.deployDrag);
        if (u) {
          const zone = this.battle.map.deploymentZone(u.side);
          u.x = clamp(w.x, zone.x0, zone.x1);
          u.y = clamp(w.y, 30, this.battle.map.h - 30);
          u.rx = u.x;
          u.ry = u.y;
        }
        return;
      }
      if (this.panStart && (this.downOn?.moved || this.pointers.size === 1)) {
        this.camera.x = this.panStart.camX - (p.x - this.panStart.x) / this.camera.zoom;
        this.camera.y = this.panStart.camY - (p.y - this.panStart.y) / this.camera.zoom;
        this.camera.clamp();
      }
    }
    const w = this.camera.screenToWorld(p.x, p.y);
    const hit = this.unitAt(w.x, w.y);
    this.hover = hit ? hit.id : 0;
    const sel = this.selectedUnits();
    this.orderPreview = sel.length && this.mode !== 'select' ? w : null;
  }

  private onUp(e: PointerEvent): void {
    const p = this.ndc(e);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchStart = null;

    if (this.deployDrag) {
      this.deployDrag = 0;
      this.panStart = null;
      this.downOn = null;
      return;
    }

    if (this.boxSelect) {
      const x0 = Math.min(this.boxSelect.x0, this.boxSelect.x1);
      const x1 = Math.max(this.boxSelect.x0, this.boxSelect.x1);
      const y0 = Math.min(this.boxSelect.y0, this.boxSelect.y1);
      const y1 = Math.max(this.boxSelect.y0, this.boxSelect.y1);
      if (x1 - x0 > 10 && y1 - y0 > 10) {
        const a = this.camera.screenToWorld(x0, y0);
        const b = this.camera.screenToWorld(x1, y1);
        this.selected.clear();
        for (const u of this.battle.unitsOf(this.battle.playerSide)) {
          if (u.x >= a.x && u.x <= b.x && u.y >= a.y && u.y <= b.y) this.selected.add(u.id);
        }
        this.dirtyCards = true;
        this.updateOrderPanel();
      } else {
        const w = this.camera.screenToWorld(p.x, p.y);
        this.tapWorld(w.x, w.y);
      }
      this.boxSelect = null;
      this.panStart = null;
      this.downOn = null;
      return;
    }

    if (this.downOn && !this.downOn.moved && performance.now() - this.downOn.t < 550) {
      const w = this.camera.screenToWorld(p.x, p.y);
      this.tapWorld(w.x, w.y);
    }
    this.downOn = null;
    this.panStart = null;
  }

  // ── Loop ─────────────────────────────────────────────────────────────────
  private loop = (t: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (t - this.last) / 1000 || 0);
    this.last = t;
    if (this.battle.state === 'running' && !this.battle.paused) {
      this.acc += dt;
      const step = 1 / 30;
      let guard = 0;
      while (this.acc >= step && guard < 8) {
        this.battle.update(step);
        this.ai.update(step);
        this.acc -= step;
        guard++;
      }
    }
    this.render(t / 1000);

    this.uiTick += dt;
    if (this.uiTick > 0.15) {
      this.uiTick = 0;
      this.updateHud();
      this.pumpEvents();
    }
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toastEl.classList.remove('visible');
    }
  };

  private render(time: number): void {
    const ui: DrawUI = {
      selected: this.selected,
      hover: this.hover,
      showRanges: this.selected.size <= 2,
      orderPreview: this.orderPreview,
      insetTop: 44,
      insetBottom: 128,
      deployDrag: null,
    };
    this.ctx.save();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.renderer.draw(this.ctx, this.battle, this.camera, ui, time);
    this.ctx.restore();

    if (this.boxSelect) {
      const { x0, y0, x1, y1 } = this.boxSelect;
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.strokeStyle = 'rgba(245,232,190,0.9)';
      this.ctx.fillStyle = 'rgba(245,232,190,0.12)';
      this.ctx.lineWidth = 1.5;
      this.ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      this.ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      this.ctx.restore();
    }

    // Order lines for selected units.
    const sel = this.selectedUnits();
    if (sel.length) {
      this.ctx.save();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const u of sel.slice(0, 4)) {
        if (u.order.kind !== 'move' && u.order.kind !== 'attackmove' && u.order.kind !== 'attack') continue;
        const from = this.camera.worldToScreen(u.rx, u.ry);
        const to = this.camera.worldToScreen(u.order.x, u.order.y);
        this.ctx.strokeStyle = u.order.kind === 'attack' ? 'rgba(230,140,120,0.6)' : 'rgba(230,215,170,0.5)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.arc(to.x, to.y, 5, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    if (this.battle.state === 'deploy') {
      this.drawDeployBar();
    }
  }

  private drawDeployBar(): void {
    if (this.hud.querySelector('.bt-deploy')) return;
    const bar = el('div', 'bt-deploy');
    const text = el('div', 'bt-deploy-text', 'Deployment — drag units inside your zone, then begin.');
    const go = el('button', 'bt-begin', 'Begin battle');
    go.onclick = () => {
      this.battle.start();
      bar.remove();
      this.toast('Battle begins. Tap the ground to manoeuvre.');
    };
    bar.append(text, go);
    this.hud.append(bar);
  }

  private resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.camera.resize(rect.width, rect.height);
    this.camera.clamp();
  };

  private togglePause(): void {
    if (this.battle.state === 'deploy') return;
    this.battle.paused = !this.battle.paused;
    this.speedEl.textContent = this.battle.paused ? '❚❚' : `${this.battle.speed}×`;
    this.toast(this.battle.paused ? 'Paused.' : 'Resumed.');
  }

  private cycleSpeed(): void {
    if (this.battle.state === 'deploy') return;
    this.battle.paused = false;
    this.battle.speed = this.battle.speed === 1 ? 2 : this.battle.speed === 2 ? 0.5 : 1;
    this.speedEl.textContent = `${this.battle.speed}×`;
    this.toast(`Speed ${this.battle.speed}×`);
  }

  private toast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('visible');
    this.toastT = 3.2;
  }

  private pumpEvents(): void {
    const evs = this.battle.events;
    for (let i = this.eventCursor; i < evs.length; i++) {
      const txt = evs[i].text;
      if (txt.includes('breaking') || txt.includes('destroyed') || txt.includes('Victory') || txt.includes('Defeat') || txt.includes('rallied')) {
        this.toast(txt);
      }
    }
    this.eventCursor = evs.length;
  }

  // ── Modals ───────────────────────────────────────────────────────────────
  private modal(title: string, body: HTMLElement, buttons: { label: string; cls?: string; fn: () => void }[]): HTMLElement {
    const back = el('div', 'bt-modal-back');
    const box = el('div', 'bt-modal');
    box.append(el('h2', 'bt-modal-title', title));
    const content = el('div', 'bt-modal-body');
    content.append(body);
    const row = el('div', 'bt-modal-actions');
    for (const b of buttons) {
      const btn = el('button', `bt-btn ${b.cls ?? ''}`, b.label);
      btn.onclick = b.fn;
      row.append(btn);
    }
    box.append(content, row);
    back.append(box);
    this.hud.append(back);
    return back;
  }

  private openPause(): void {
    if (this.hud.querySelector('.bt-modal-back')) return;
    this.battle.paused = true;
    const body = el('div', 'bt-pause-body');
    body.innerHTML = `
      <p>${this.battle.state === 'deploy' ? 'Deployment phase.' : `Battle time ${formatTime(this.battle.time)} · ${Math.round(this.battle.armyMen(this.battle.playerSide))} men on the field`}</p>
      <p class="muted">Space pauses · A attack-move · Q magic · Tab select all · pinch to zoom</p>`;
    const back = this.modal('Field Orders', body, [
      {
        label: 'Resume',
        cls: 'primary',
        fn: () => {
          back.remove();
          this.battle.paused = false;
        },
      },
      {
        label: 'Restart battle',
        fn: () => {
          back.remove();
          const setup = {
            playerSide: this.battle.playerSide,
            player: this.battle.playerRoster,
            enemy: this.battle.enemyRoster,
            seed: this.battle.seed + 1,
          };
          const fresh = new Battle(setup);
          this.battle = fresh;
          this.ai = new TacticalAI(fresh, fresh.enemySide);
          this.selected.clear();
          this.eventCursor = 0;
          this.endShown = false;
          this.rebuildCards();
          this.camera.centerOn(fresh.map.w * 0.22, fresh.map.h / 2);
          this.toast('Battle restarted — redeploy.');
        },
      },
      {
        label: 'Retreat',
        cls: 'danger',
        fn: () => {
          back.remove();
          this.battle.concede();
        },
      },
    ]);
  }

  /** Test hook: read-only view of the camera for automated verification. */
  debugCamera(): { x: number; y: number; zoom: number } {
    return { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom };
  }

  private showResult(result: BattleResult): void {
    this.endShown = true;
    const win = result.winner === this.battle.playerSide;
    const draw = result.winner === 'draw';
    const body = el('div', 'bt-result');
    body.innerHTML = `
      <div class="bt-result-badge ${win ? 'win' : draw ? 'draw' : 'loss'}">${win ? 'VICTORY' : draw ? 'DRAW' : 'DEFEAT'}</div>
      <div class="bt-result-grid">
        <div><span>Your casualties</span><b>${result.playerCasualties}</b></div>
        <div><span>Enemy casualties</span><b>${result.enemyCasualties}</b></div>
        <div><span>Time</span><b>${formatTime(result.time)}</b></div>
      </div>
      <p class="muted">${win ? 'The enemy breaks and quits the field.' : draw ? 'Both armies stand, but neither holds the ground.' : 'The line collapses — what remains falls back.'}</p>`;
    const back = this.modal('Battle Report', body, [
      {
        label: 'Continue',
        cls: 'primary',
        fn: () => {
          back.remove();
          this.running = false;
          cancelAnimationFrame(this.raf);
          this.destroy();
          this.onExit(result);
        },
      },
    ]);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.root.innerHTML = '';
  }

}

export function battleMapKind(seed: number): 'field' | 'village' | 'ridge' {
  const kinds: ('field' | 'village' | 'ridge')[] = ['field', 'village', 'ridge'];
  return kinds[Math.abs(seed) % 3];
}
