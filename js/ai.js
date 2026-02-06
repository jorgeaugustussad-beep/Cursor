import { chance, pick } from "./utils.js";

export function runAI(aiFaction, galaxy, player, log) {
  const free = galaxy.systems.filter((s) => !s.owner);
  if (free.length && aiFaction.resources.minerais > 30 && chance(0.5)) {
    const target = pick(free);
    target.owner = aiFaction.id;
    aiFaction.systems.push(target.id);
    aiFaction.resources.minerais -= 25;
    log.unshift(`📡 ${aiFaction.name} colonizou ${target.name}.`);
  }

  const relation = aiFaction.diplomacy[player.id] ?? 0;
  const hostility = aiFaction.personality.hostility;

  if (relation < -25 && hostility > 1.1 && chance(0.2)) {
    log.unshift(`🚨 ${aiFaction.name} declarou guerra fria contra ${player.name}.`);
    aiFaction.resources.minerais -= 15;
    player.stability -= 3;
  } else if (chance(0.18)) {
    aiFaction.diplomacy[player.id] = relation + 5;
    player.diplomacy[aiFaction.id] = (player.diplomacy[aiFaction.id] ?? 0) + 5;
    log.unshift(`🤝 ${aiFaction.name} assinou pacto comercial com ${player.name}.`);
  }
}
