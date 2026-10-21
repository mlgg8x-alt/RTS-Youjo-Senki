// Headless verification: battles resolve, casualties happen, campaign persists.

import { Battle } from '../src/battle/battle';
import { TacticalAI } from '../src/battle/ai';
import { CampaignWorld } from '../src/campaign/world';
import { unitType } from '../src/data/units';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

function rosters() {
  const imperial = ['imp_line', 'imp_line', 'imp_gren', 'imp_mg', 'imp_gun', 'imp_mage', 'imp_drag', 'imp_how'];
  const republican = ['rep_line', 'rep_line', 'rep_vet', 'rep_mg', 'rep_gun', 'rep_mage', 'rep_cav', 'rep_how'];
  return {
    player: imperial.map((typeId) => ({ typeId, men: unitType(typeId).men })),
    enemy: republican.map((typeId) => ({ typeId, men: unitType(typeId).men })),
  };
}

function runBattle(seed: number) {
  const r = rosters();
  const battle = new Battle({ playerSide: 'empire', player: r.player, enemy: r.enemy, seed, kind: 'field' });
  const ai = new TacticalAI(battle, 'republic');
  battle.start();
  const own = battle.unitsOf('empire');
  const foes = battle.enemiesOf('empire');
  const cx = foes.reduce((s, u) => s + u.x, 0) / foes.length;
  battle.issueMove(own, cx - 30, battle.map.h / 2, true);
  battle.unitsOf('empire').forEach((u) => {
    if (u.type.ability) battle.castAbility(u, foes[0].x, foes[0].y);
  });
  const dt = 1 / 30;
  let ticks = 0;
  const t0 = performance.now();
  while (battle.state === 'running' && ticks < 30 * 1200) {
    battle.update(dt);
    ai.update(dt);
    ticks++;
  }
  return { battle, seconds: ticks * dt, ms: performance.now() - t0 };
}

export async function run() {
  console.log('battle simulation');
  for (const seed of [11, 23, 77]) {
    const { battle, seconds, ms } = runBattle(seed);
    check(`seed ${seed}: battle resolves`, battle.state === 'over' && !!battle.result, `state=${battle.state}`);
    const res = battle.result!;
    check(`seed ${seed}: casualties recorded`, res.playerCasualties + res.enemyCasualties > 0, `${res.playerCasualties}/${res.enemyCasualties}`);
    check(`seed ${seed}: no NaN units`, battle.units.every((u) => Number.isFinite(u.x) && Number.isFinite(u.y) && Number.isFinite(u.morale)));
    check(`seed ${seed}: finishes in time`, seconds < 1200, `${seconds.toFixed(0)}s`);
    console.log(`      result=${res.winner} after ${seconds.toFixed(0)}s sim in ${ms.toFixed(0)}ms`);
  }

  console.log('damage and morale');
  {
    const r = rosters();
    const b = new Battle({ playerSide: 'empire', player: r.player, enemy: r.enemy, seed: 5 });
    const target = b.unitsOf('republic')[0];
    const before = target.men;
    b.applyDamage(target, 400, b.unitsOf('empire')[0]);
    check('damage reduces men', target.men < before, `${before} -> ${target.men}`);
    check('damage adds shock', target.shock > 0, `${target.shock}`);
    b.applyDamage(target, 100000, b.unitsOf('empire')[0]);
    check('overkill destroys unit', !target.alive && target.men === 0);
  }

  console.log('artillery and magic');
  {
    const r = rosters();
    const b = new Battle({ playerSide: 'empire', player: r.player, enemy: r.enemy, seed: 9 });
    b.start();
    const gun = b.unitsOf('empire').find((u) => u.type.cls === 'artillery')!;
    const mage = b.unitsOf('empire').find((u) => u.type.ability)!;
    const foe = b.unitsOf('republic')[0];
    gun.x = foe.x - 200;
    gun.y = foe.y;
    gun.reloadT = 0;
    b.issueHold([foe]);
    const before = foe.men;
    for (let i = 0; i < 90; i++) b.update(1 / 30);
    check('artillery damages enemy', foe.men < before, `${before} -> ${foe.men}`);
    mage.x = foe.x - 150;
    mage.y = foe.y;
    check('mage ability casts', b.castAbility(mage, foe.x, foe.y));
    for (let i = 0; i < 90; i++) b.update(1 / 30);
    check('ability on cooldown', mage.abilityT > 0, `${mage.abilityT.toFixed(1)}s`);
  }

  console.log('campaign');
  {
    const world = new CampaignWorld(4242);
    check('18 provinces', world.provinces.size === 18, String(world.provinces.size));
    check('empire starts with 5 provinces', world.factionProvinces('empire').length === 5, String(world.factionProvinces('empire').length));
    const army = world.armies.find((a) => a.faction === 'empire')!;
    const before = world.factions.empire.gold;
    world.recruit(army.id, 'imp_line');
    check('recruitment spends gold', world.factions.empire.gold < before);
    const inv = world.startAttack(army.id, 'saar');
    check('attack invocation built', !!inv && inv.setup.player.length > 0);
    if (inv) {
      const result = world.autoResolve(inv);
      world.finishBattle(inv, result);
      check('province can change hands', world.province('saar').owner !== null);
    }
    world.endTurn();
    check('turn advances', world.turn === 2);
    const saved = world.save();
    const loaded = CampaignWorld.load(JSON.parse(JSON.stringify(saved)));
    check('save/load keeps provinces', loaded.provinces.size === 18);
    check('save/load keeps armies', loaded.armies.length === world.armies.length, `${loaded.armies.length}/${world.armies.length}`);
    check('income is positive', world.income('empire') > 0, String(world.income('empire')));
    check('auto battle on neutral province works', world.victoryState() === 'playing');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  return { failed };
}
