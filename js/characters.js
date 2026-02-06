import { CHARACTER_ROLES, CHARACTER_TRAITS } from "./constants.js";
import { pick, randInt, generateName, chance } from "./utils.js";

export function createCharacter(role = pick(CHARACTER_ROLES)) {
  return {
    id: crypto.randomUUID(),
    name: `${generateName()} ${generateName()}`,
    role,
    age: randInt(28, 94),
    trait: pick(CHARACTER_TRAITS),
    alive: true,
  };
}

export function seedCharacters() {
  return [
    createCharacter("Líder Supremo"),
    createCharacter("Governador"),
    createCharacter("Capitão de Frota"),
    createCharacter("Cientista"),
    createCharacter("Político"),
  ];
}

export function applyCharacterEffects(faction, characters) {
  const alive = characters.filter((c) => c.alive);
  for (const c of alive) {
    if (c.trait === "carismático" || c.trait === "inspirador") faction.stability += 1;
    if (c.trait === "corrupto") faction.resources.influencia -= 1;
    if (c.trait === "estrategista") faction.resources.minerais += 1;
    if (c.trait === "visionário") faction.resources.pesquisa += 2;
    if (c.trait === "incompetente") faction.resources.energia -= 1;
  }
}

export function randomCharacterEvent(characters, log) {
  if (chance(0.08)) {
    const alive = characters.filter((c) => c.alive);
    if (!alive.length) return;
    const target = pick(alive);
    const roll = Math.random();
    if (roll < 0.35) {
      target.alive = false;
      log.unshift(`⚰️ ${target.name} (${target.role}) morreu em circunstâncias misteriosas.`);
    } else if (roll < 0.7) {
      target.trait = "corrupto";
      log.unshift(`🕳️ ${target.name} foi envolvido em conspiração e tornou-se corrupto.`);
    } else {
      target.trait = "inspirador";
      log.unshift(`🌟 ${target.name} ganhou fama e agora inspira a população.`);
    }
  }
}
