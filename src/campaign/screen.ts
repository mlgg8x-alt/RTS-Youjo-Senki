// Campaign screen: war map, province/army panel, recruitment, construction, turn flow.

import { el, formatNum } from '../core/util';
import { runStrategicAI } from './ai';
import {
  BUILDINGS,
  CampaignWorld,
  FACTION_DEFS,
  type BattleInvocation,
  type FactionId,
} from './world';
import { stackStrength, unitType, type UnitStack } from '../data/units';
import type { BattleResult } from '../battle/battle';

export interface CampaignCallbacks {
  onBattle: (inv: BattleInvocation) => void;
  onMenu: () => void;
  onSave: (world: CampaignWorld) => void;
}

export class CampaignScreen {
  private root: HTMLElement;
  world: CampaignWorld;
  private cb: CampaignCallbacks;
  private selectedArmy = 0;
  private selectedProvince = '';
  private toastEl: HTMLElement;
  private toastT = 0;
  private logEl: HTMLElement | null = null;
  private mapEl: HTMLElement;
  private panelEl: HTMLElement;
  private statsEl: HTMLElement;

  constructor(container: HTMLElement, world: CampaignWorld, cb: CampaignCallbacks) {
    this.root = container;
    this.world = world;
    this.cb = cb;
    this.root.innerHTML = '';
    const screen = el('div', 'camp-screen');

    const top = el('div', 'camp-top');
    const flag = el('div', 'camp-flag');
    flag.innerHTML = `<span class="camp-crest">✠</span><span>${FACTION_DEFS[world.player].name}</span>`;
    this.statsEl = el('div', 'camp-stats');
    const topRight = el('div', 'camp-top-right');
    const endBtn = el('button', 'camp-end', 'End turn');
    endBtn.onclick = () => this.endTurn();
    const menuBtn = el('button', 'camp-menu', '☰');
    menuBtn.onclick = () => this.cb.onMenu();
    topRight.append(endBtn, menuBtn);
    top.append(flag, this.statsEl, topRight);

    this.mapEl = el('div', 'camp-map');
    this.panelEl = el('div', 'camp-panel');
    this.toastEl = el('div', 'camp-toast');
    screen.append(top, this.mapEl, this.panelEl, this.toastEl);
    this.root.append(screen);
    this.render();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  render(): void {
    const w = this.world;
    const p = w.player;
    const income = w.income(p);
    const upkeep = w.upkeep(p);
    const gold = w.factions[p].gold;
    this.statsEl.innerHTML = `
      <span class="camp-gold">◈ ${formatNum(gold)}</span>
      <span class="camp-flow ${income - upkeep >= 0 ? 'pos' : 'neg'}">${income - upkeep >= 0 ? '+' : ''}${formatNum(income - upkeep)}/turn</span>
      <span class="camp-turn">Turn ${w.turn}</span>`;
    this.renderMap();
    this.renderPanel();
  }

  private renderMap(): void {
    const w = this.world;
    this.mapEl.innerHTML = '';
    const inner = el('div', 'camp-map-inner');
    this.mapEl.append(inner);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'camp-links');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    const drawn = new Set<string>();
    for (const prov of w.provinces.values()) {
      for (const n of prov.def.neighbors) {
        const key = [prov.id, n].sort().join('|');
        if (drawn.has(key)) continue;
        drawn.add(key);
        const other = w.province(n);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(prov.def.x));
        line.setAttribute('y1', String(prov.def.y));
        line.setAttribute('x2', String(other.def.x));
        line.setAttribute('y2', String(other.def.y));
        const hostile = prov.owner !== other.owner && (prov.owner === w.player || other.owner === w.player);
        line.setAttribute('class', hostile ? 'link hostile' : 'link');
        svg.append(line);
      }
    }
    inner.append(svg);

    const army = this.selectedArmy ? w.armyById(this.selectedArmy) : undefined;
    const reachable = new Set<string>(army ? w.province(army.provinceId).def.neighbors : []);

    for (const prov of w.provinces.values()) {
      const owned = prov.owner !== null;
      const def = prov.owner ? FACTION_DEFS[prov.owner] : null;
      const node = el('button', 'camp-prov');
      node.style.left = `${prov.def.x}%`;
      node.style.top = `${prov.def.y}%`;
      node.style.setProperty('--owner', def ? def.color : '#8b8577');
      node.classList.toggle('neutral', !owned);
      node.classList.toggle('mine', prov.owner === w.player);
      node.classList.toggle('capital', !!def && prov.id === FACTION_DEFS[def.id].capital);
      node.classList.toggle('selected', this.selectedProvince === prov.id);
      node.classList.toggle('reachable', reachable.has(prov.id));
      node.classList.toggle('enemy', owned && prov.owner !== w.player && this.world.factions[w.player].atWar[prov.owner as FactionId]);

      const dots = Array.from({ length: Math.min(5, Math.ceil(prov.garrison.length / 2)) })
        .map(() => '<i></i>')
        .join('');
      node.innerHTML = `
        <span class="camp-prov-ring">
          <span class="camp-prov-terrain t-${prov.def.terrain}">${terrainGlyph(prov.def.terrain)}</span>
        </span>
        <span class="camp-prov-name">${prov.def.name}</span>
        <span class="camp-prov-gar">${dots}</span>`;
      node.onclick = () => this.pickProvince(prov.id);
      inner.append(node);
    }

    for (const a of w.armies) {
      const prov = w.province(a.provinceId);
      const isMine = a.faction === w.player;
      const badge = el('button', 'camp-army');
      badge.style.left = `${prov.def.x}%`;
      badge.style.top = `${prov.def.y}%`;
      badge.style.setProperty('--owner', FACTION_DEFS[a.faction].color);
      badge.classList.toggle('mine', isMine);
      badge.classList.toggle('selected', this.selectedArmy === a.id);
      badge.classList.toggle('spent', a.movement <= 0 && isMine);
      badge.innerHTML = `<span class="camp-army-shield">${a.stack.length}</span>`;
      badge.title = `${a.name} — ${a.stack.length} units`;
      badge.onclick = (e) => {
        e.stopPropagation();
        this.pickArmy(a.id);
      };
      inner.append(badge);
    }

    const logBox = this.logEl ?? el('div', 'camp-log');
    logBox.innerHTML = this.world.log
      .slice(0, 4)
      .map((l) => `<div class="camp-log-line">${l}</div>`)
      .join('');
    this.logEl = logBox;
    this.mapEl.append(logBox);
  }

  private pickProvince(id: string): void {
    this.selectedProvince = id;
    const army = this.selectedArmy ? this.world.armyById(this.selectedArmy) : undefined;
    const prov = this.world.province(id);
    if (army && army.faction === this.world.player && this.world.canMoveTo(army, id)) {
      const hostile = this.world.hostileIn(id, this.world.player);
      const defenders = hostile.army ? hostile.army.stack : prov.owner !== this.world.player ? prov.garrison : [];
      if (defenders.length > 0) {
        this.render();
        this.toast('Enemy forces present — use Assault to fight the battle.');
        return;
      }
      const msg = this.world.moveArmy(army.id, id);
      this.toast(msg);
      this.cb.onSave(this.world);
      this.render();
      return;
    }
    this.render();
  }

  private pickArmy(id: number): void {
    this.selectedArmy = this.selectedArmy === id ? 0 : id;
    const army = this.world.armyById(id);
    if (army) this.selectedProvince = army.provinceId;
    this.render();
  }

  private renderPanel(): void {
    const w = this.world;
    this.panelEl.innerHTML = '';
    const army = this.selectedArmy ? w.armyById(this.selectedArmy) : undefined;
    const prov = this.selectedProvince ? w.province(this.selectedProvince) : army ? w.province(army.provinceId) : null;

    if (army && army.faction === w.player) {
      this.panelEl.append(this.armyPanel(army));
      if (prov && prov.owner === w.player) this.panelEl.append(this.recruitPanel(army, prov.id));
      if (prov && prov.owner !== w.player) this.panelEl.append(this.assaultPanel(army, prov.id));
      return;
    }
    if (prov) {
      this.panelEl.append(this.provincePanel(prov.id));
      if (prov.owner === w.player) this.panelEl.append(this.buildPanel(prov.id));
      return;
    }
    const hint = el('div', 'camp-hint');
    hint.innerHTML = `
      <h3>The War Map</h3>
      <p>Tap a province for details, or tap one of your armies (shield badge) to give orders.</p>
      <p class="muted">Your army must be in an adjacent province to march or assault. Each march costs movement; armies refill at the end of every turn.</p>`;
    this.panelEl.append(hint);
  }

  private armyPanel(army: { id: number; name: string; stack: UnitStack[]; movement: number; maxMovement: number; provinceId: string }): HTMLElement {
    const box = el('div', 'camp-block');
    const head = el('div', 'camp-block-head');
    head.innerHTML = `<h3>${army.name}</h3><span class="camp-move">${army.movement}/${army.maxMovement} movement</span>`;
    box.append(head);
    const list = el('div', 'camp-units');
    for (const s of army.stack) {
      const t = unitType(s.typeId);
      const row = el('div', 'camp-unit');
      row.innerHTML = `<span class="camp-unit-icon" style="color:${t.color}">${t.icon}</span>
        <span class="camp-unit-name">${t.name}</span>
        <span class="camp-unit-men">${s.men}</span>`;
      list.append(row);
    }
    box.append(list);
    const foot = el('div', 'camp-block-foot');
    foot.innerHTML = `<span>Strength ◈ ${formatNum(stackStrength(army.stack))}</span>`;
    const disband = el('button', 'camp-small', 'Disband');
    disband.onclick = () => {
      if (army.stack.length > 1) {
        army.stack.pop();
        this.toast('A battalion is disbanded.');
        this.render();
      }
    };
    foot.append(disband);
    box.append(foot);
    return box;
  }

  private recruitPanel(army: { id: number; stack: UnitStack[]; provinceId: string }, provinceId: string): HTMLElement {
    const w = this.world;
    const box = el('div', 'camp-block');
    box.append(el('h4', 'camp-sub', 'Recruitment'));
    const options = w.recruitable(w.player, provinceId);
    if (!options.length) {
      box.append(el('p', 'muted', 'No barracks here — build one to muster troops.'));
      return box;
    }
    const grid = el('div', 'camp-recruits');
    for (const id of options) {
      const t = unitType(id);
      const btn = el('button', 'camp-recruit');
      btn.innerHTML = `<span class="camp-unit-icon" style="color:${t.color}">${t.icon}</span>
        <span class="camp-recruit-name">${t.short}</span>
        <span class="camp-recruit-cost">◈ ${t.cost}</span>`;
      btn.title = `${t.name} — ${t.desc}`;
      btn.disabled = w.factions[w.player].gold < t.cost || army.stack.length >= 20;
      btn.onclick = () => {
        const msg = w.recruit(army.id, id);
        this.toast(msg);
        this.cb.onSave(w);
        this.render();
      };
      grid.append(btn);
    }
    box.append(grid);
    return box;
  }

  private assaultPanel(army: { id: number; name: string }, provinceId: string): HTMLElement {
    const w = this.world;
    const prov = w.province(provinceId);
    const box = el('div', 'camp-block');
    box.append(el('h4', 'camp-sub', `Assault ${prov.def.name}`));
    const hostile = w.hostileIn(provinceId, w.player);
    const defStack = hostile.army ? hostile.army.stack : prov.garrison;
    box.append(el('p', 'muted', `Defenders: ${defStack.length} unit${defStack.length === 1 ? '' : 's'} · strength ◈ ${formatNum(stackStrength(defStack))}`));
    const row = el('div', 'camp-actions');
    const fight = el('button', 'camp-primary', 'Fight battle');
    fight.onclick = () => {
      const inv = w.startAttack(army.id, provinceId);
      if (inv) this.cb.onBattle(inv);
      else this.toast('Cannot attack from here.');
    };
    const auto = el('button', 'camp-small', 'Auto-resolve');
    auto.onclick = () => {
      const inv = w.startAttack(army.id, provinceId);
      if (!inv) {
        this.toast('Cannot attack from here.');
        return;
      }
      const result = w.autoResolve(inv);
      const msg = w.finishBattle(inv, result);
      this.toast(msg);
      this.cb.onSave(w);
      this.selectedArmy = 0;
      this.render();
      this.checkVictory();
    };
    row.append(fight, auto);
    box.append(row);
    return box;
  }

  private provincePanel(id: string): HTMLElement {
    const w = this.world;
    const p = w.province(id);
    const owner = p.owner ? FACTION_DEFS[p.owner] : null;
    const box = el('div', 'camp-block');
    const head = el('div', 'camp-block-head');
    head.innerHTML = `<h3>${p.def.name}</h3>
      <span class="camp-owner" style="color:${owner ? owner.color : '#8b8577'}">${owner ? owner.name : 'Independent'}</span>`;
    box.append(head);
    const meta = el('div', 'camp-meta');
    meta.innerHTML = `
      <div><span>Income</span><b>◈ ${p.def.income}</b></div>
      <div><span>Recruit tier</span><b>${p.def.tier}</b></div>
      <div><span>Garrison</span><b>${p.garrison.length} units</b></div>
      <div><span>Terrain</span><b>${p.def.terrain}</b></div>`;
    box.append(meta);
    if (p.buildings.length) {
      const tags = el('div', 'camp-tags');
      for (const b of p.buildings) tags.append(el('span', 'camp-tag', BUILDINGS[b]?.name ?? b));
      box.append(tags);
    }
    return box;
  }

  private buildPanel(id: string): HTMLElement {
    const w = this.world;
    const p = w.province(id);
    const box = el('div', 'camp-block');
    box.append(el('h4', 'camp-sub', 'Construction'));
    if (p.buildings.length >= 3) {
      box.append(el('p', 'muted', 'All three building slots are in use.'));
      return box;
    }
    for (const [key, def] of Object.entries(BUILDINGS)) {
      if (p.buildings.includes(key)) continue;
      const btn = el('button', 'camp-build');
      btn.innerHTML = `<span>${def.name}</span><span class="camp-build-cost">◈ ${def.cost}</span>`;
      btn.title = def.desc;
      btn.disabled = w.factions[w.player].gold < def.cost;
      btn.onclick = () => {
        const msg = w.build(id, key);
        this.toast(msg);
        this.cb.onSave(w);
        this.render();
      };
      box.append(btn);
    }
    return box;
  }

  // ── Turn flow ────────────────────────────────────────────────────────────
  private endTurn(): void {
    const w = this.world;
    runStrategicAI(w, (text) => this.toast(text));
    w.endTurn();
    this.selectedArmy = 0;
    this.cb.onSave(w);
    this.render();
    if (!this.checkVictory()) this.toast(`Turn ${w.turn} begins. Treasury: ◈ ${formatNum(w.factions[w.player].gold)}`);
    else this.render();
  }

  afterBattle(inv: BattleInvocation, result: BattleResult): void {
    const msg = this.world.finishBattle(inv, result);
    this.toast(msg || 'The battle is decided.');
    this.selectedArmy = 0;
    this.cb.onSave(this.world);
    this.render();
    this.checkVictory();
  }

  private checkVictory(): boolean {
    const state = this.world.victoryState();
    if (state === 'playing') return false;
    const back = el('div', 'camp-modal-back');
    const box = el('div', 'camp-modal');
    box.innerHTML = `
      <h2>${state === 'victory' ? 'The War Is Won' : 'The Capital Has Fallen'}</h2>
      <p>${state === 'victory'
        ? 'The Republican Alliance and the Allied Kingdom sue for peace. The Empire stands unchallenged.'
        : 'Berun has fallen. The Empire\'s armies fight on, but the war is lost.'}</p>
      <p class="muted">Turns fought: ${this.world.turn} · Provinces held: ${this.world.factionProvinces(this.world.player).length}</p>`;
    const btn = el('button', 'camp-primary', 'Return to menu');
    btn.onclick = () => {
      back.remove();
      this.cb.onMenu();
    };
    box.append(btn);
    back.append(box);
    this.root.append(back);
    return true;
  }

  toastMessage(text: string): void {
    this.toast(text);
  }

  private toast(text: string): void {
    if (!text) return;
    this.toastEl.textContent = text;
    this.toastEl.classList.add('visible');
    window.clearTimeout(this.toastT);
    this.toastT = window.setTimeout(() => this.toastEl.classList.remove('visible'), 3600);
  }

  refresh(): void {
    this.render();
  }

  destroy(): void {
    this.root.innerHTML = '';
  }
}

function terrainGlyph(t: string): string {
  switch (t) {
    case 'city': return 'H';
    case 'coast': return '≈';
    case 'forest': return '♣';
    case 'hills': return '▲';
    default: return '·';
  }
}

