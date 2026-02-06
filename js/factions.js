import { IDEOLOGIES, RACES } from "./constants.js";
import { pick, generateName } from "./utils.js";

export function createFaction({ name, color, emblem, ideology, isPlayer = false }) {
  const race = pick(RACES);
  const bonuses = IDEOLOGIES[ideology] || IDEOLOGIES.expansionista;

  return {
    id: crypto.randomUUID(),
    name,
    color,
    emblem,
    ideology,
    bonuses,
    race,
    isPlayer,
    personality: {
      hostility: race.traits.aggression,
      curiosity: race.traits.intelligence,
      cohesion: race.traits.longevity,
    },
    resources: { energia: 120, minerais: 100, alimentos: 90, pesquisa: 60, influencia: 50 },
    stability: 70,
    diplomacy: {},
    systems: [],
  };
}

export function seedFactions() {
  const options = ["expansionista", "pacifista", "tecnocrata", "teocratica", "mercantil"];
  const colors = ["#61dafb", "#ffb86c", "#c792ea", "#7dff9f", "#ff6b9d"];
  const player = createFaction({
    name: "União Aurora",
    color: "#61dafb",
    emblem: "✦",
    ideology: "tecnocrata",
    isPlayer: true,
  });

  const aiFactions = Array.from({ length: 3 }, (_, i) =>
    createFaction({
      name: `${generateName()} Hegemony`,
      color: colors[i + 1],
      emblem: ["⚔", "☯", "⚙", "✶"][i],
      ideology: pick(options),
    })
  );

  return [player, ...aiFactions];
}
