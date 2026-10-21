// App shell: main menu, campaign <-> battle routing, saves, help screens.

import { el, formatNum } from './core/util';
import { CampaignWorld, FACTION_DEFS, type BattleInvocation, type WorldSave } from './campaign/world';
import { CampaignScreen } from './campaign/screen';
import { Battle } from './battle/battle';
import { BattleScreen } from './battle/screen';
import { unitType } from './data/units';

const SAVE_KEY = 'youjo-frontline-save-v1';
const SKIRMISH_KEY = 'youjo-frontline-skirmish-v1';

interface SaveFile {
  world: WorldSave;
  stamp: number;
}

class App {
  private container: HTMLElement;
  private current: { destroy?: () => void } | null = null;
  private world: CampaignWorld | null = null;

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    if (!this.container) throw new Error('#app missing');
    window.addEventListener('beforeunload', () => {
      if (this.world) this.save(this.world);
    });
    this.showMenu();
  }

  private clear(): void {
    this.current?.destroy?.();
    this.current = null;
    this.container.innerHTML = '';
  }

  // ── Menu ─────────────────────────────────────────────────────────────────
  showMenu(): void {
    this.clear();
    if (this.world) this.save(this.world);
    this.world = null;
    const save = this.readSave();
    const root = el('div', 'menu-screen');
    root.innerHTML = `
      <div class="menu-sky"></div>
      <div class="menu-smoke"></div>
      <div class="menu-ridge"></div>
      <div class="menu-content">
        <div class="menu-kicker">A TOTAL-WAR-INSPIRED CAMPAIGN</div>
        <h1 class="menu-title"><span>YOUJO SENKI</span><b>FRONTLINE</b></h1>
        <p class="menu-sub">Turn-based war map. Real-time battles. Morale, artillery, and aerial mages.</p>
        <div class="menu-buttons"></div>
        <div class="menu-foot">
          <span>v1.0 · offline · single player</span>
          <span>${save ? `Field marshal's ledger saved · turn ${save.world.turn}` : 'No campaign in progress'}</span>
        </div>
      </div>`;
    const buttons = root.querySelector('.menu-buttons') as HTMLElement;
    const mk = (label: string, cls: string, fn: () => void, disabled = false) => {
      const b = el('button', `menu-btn ${cls}`, label);
      b.disabled = disabled;
      b.onclick = fn;
      buttons.append(b);
    };
    mk('New campaign', 'primary', () => this.startCampaign());
    mk('Continue campaign', '', () => {
      const s = this.readSave();
      if (s) this.openCampaign(CampaignWorld.load(s.world), 'Campaign restored.');
    }, !save);
    mk('Skirmish battle', '', () => this.startSkirmish());
    mk('How to play', 'ghost', () => this.showHelp());
    if (save) mk('Delete saved campaign', 'ghost danger', () => this.deleteSave());
    this.container.append(root);
    this.current = {};
  }

  // ── Campaign ─────────────────────────────────────────────────────────────
  private save(world: CampaignWorld): void {
    try {
      const file: SaveFile = { world: world.save(), stamp: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(file));
    } catch {
      // Storage can be unavailable in private modes; the game stays playable.
    }
  }

  private readSave(): SaveFile | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveFile;
      if (!parsed?.world?.provinces?.length) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private deleteSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    this.showMenu();
  }

  startCampaign(): void {
    const world = new CampaignWorld(Date.now() % 100000);
    world.player = 'empire';
    this.save(world);
    this.openCampaign(world, 'The war begins. Select an army and march.');
  }

  private openCampaign(world: CampaignWorld, toastMsg?: string): void {
    this.clear();
    this.world = world;
    const mount = el('div', 'camp-mount');
    this.container.append(mount);
    const screen = new CampaignScreen(mount, world, {
      onBattle: (inv) => this.enterBattle(inv),
      onMenu: () => this.showMenu(),
      onSave: (w) => this.save(w),
    });
    this.current = screen;
    if (toastMsg) screen.toastMessage(toastMsg);
    this.checkAutoSaveBanner(world);
  }

  private checkAutoSaveBanner(world: CampaignWorld): void {
    const v = world.victoryState();
    if (v !== 'playing') return;
    const total = world.factionProvinces(world.player).length;
    if (total >= 12) {
      world.pushLog('Victory conditions met — the continent is yours.');
    }
  }

  private enterBattle(inv: BattleInvocation): void {
    this.clear();
    const battle = new Battle(inv.setup);
    const screen = new BattleScreen(this.container, {
      battle,
      onExit: (result) => {
        const world = this.world;
        if (!world) {
          this.showMenu();
          return;
        }
        const msg = world.finishBattle(inv, result);
        this.save(world);
        this.openCampaign(world, msg || 'The battle is decided.');
      },
    });
    this.current = screen;
  }

  // ── Skirmish ─────────────────────────────────────────────────────────────
  private startSkirmish(): void {
    this.clear();
    const seed = (Date.now() % 999999) | 0;
    const imperial = ['imp_line', 'imp_line', 'imp_line', 'imp_gren', 'imp_mg', 'imp_gun', 'imp_drag', 'imp_mage', 'imp_how', 'imp_ace'];
    const republican = ['rep_line', 'rep_line', 'rep_line', 'rep_vet', 'rep_mg', 'rep_gun', 'rep_cav', 'rep_mage', 'rep_how', 'rep_ace'];
    const battle = new Battle({
      playerSide: 'empire',
      player: imperial.map((typeId) => ({ typeId, men: unitType(typeId).men })),
      enemy: republican.map((typeId) => ({ typeId, men: unitType(typeId).men })),
      seed,
      kind: (['field', 'village', 'ridge'] as const)[seed % 3],
    });
    const screen = new BattleScreen(this.container, {
      battle,
      onExit: () => this.showMenu(),
    });
    this.current = screen;
    try {
      localStorage.setItem(SKIRMISH_KEY, String(seed));
    } catch {
      /* ignore */
    }
  }

  // ── Help ─────────────────────────────────────────────────────────────────
  private showHelp(): void {
    const back = el('div', 'menu-modal-back');
    const box = el('div', 'menu-modal');
    box.innerHTML = `
      <h2>How to play</h2>
      <h3>The war map</h3>
      <p>Select one of your armies (the shield badge with a unit count), then tap an adjacent province to march.
      Enemy or neutral provinces must be <b>assaulted</b> — fight the battle yourself or auto-resolve it.
      End your turn to collect income, pay upkeep and let the other powers move.</p>
      <p>Provinces earn gold and recruit troops. Build <b>Barracks</b> for higher tiers, a
      <b>Foundry</b> for artillery, a <b>Mage Academy</b> for aerial mages, <b>Industry</b> for +70 gold,
      or <b>Fortifications</b> for a stronger garrison.</p>
      <h3>The battle</h3>
      <ul>
        <li>Tap a unit card to select it. Tap the ground to move, tap an enemy to attack.</li>
        <li><b>Attack-move</b> advances but stops to fight. <b>Hold</b> keeps a position; <b>Wide</b>/<b>Deep</b> changes formation frontage.</li>
        <li>Pinch to zoom, drag with one finger to pan, use the buttons to pause or fast-forward.</li>
        <li>Morale decides battles. Flanks and rear charges break units faster than bullets; artillery and aerial mages cause shock.</li>
        <li>Mage companies and the ace can cast <b>Magic Artillery</b> — select them, tap Ability, then tap the target area.</li>
      </ul>
      <h3>Victory</h3>
      <p>Hold 12 provinces or take both enemy capitals. Lose Berun and the war is over.</p>
      <p class="muted">Keyboard: Space pause · A attack-move · Q magic · Tab select all · Esc orders menu.</p>`;
    const close = el('button', 'menu-btn primary', 'Understood');
    close.onclick = () => back.remove();
    box.append(close);
    back.append(box);
    this.container.append(back);
  }

  // Small helper used by tests and for debug readouts.
  debugState(): string {
    if (!this.world) return 'menu';
    return `turn ${this.world.turn}, gold ${formatNum(this.world.factions.empire.gold)}, armies ${this.world.armies.length}, provinces ${this.world.factionProvinces('empire').length}, capital ${FACTION_DEFS.empire.capital}`;
  }
}

(window as unknown as { game: App }).game = new App();
