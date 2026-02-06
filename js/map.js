import { STAR_TYPES, PLANET_CLASSES, RESOURCE_TYPES } from "./constants.js";
import { randInt, pick, generateName } from "./utils.js";

export function generateGalaxy(systemCount = 28, width = 900, height = 560) {
  const systems = [];
  for (let i = 0; i < systemCount; i++) {
    const planets = [];
    const count = randInt(2, 6);
    for (let p = 0; p < count; p++) {
      const planetClass = pick(PLANET_CLASSES);
      planets.push({
        id: `${i}-${p}`,
        name: `${generateName()}-${randInt(1, 99)}`,
        class: planetClass,
        population: randInt(2, 12),
        happiness: randInt(45, 80),
        tax: 15,
        priority: "bem-estar",
        social: {
          trabalhadores: randInt(40, 70),
          elite: randInt(10, 25),
          militares: randInt(8, 20),
          cientistas: randInt(10, 25),
        },
        resources: Object.fromEntries(RESOURCE_TYPES.map((r) => [r, randInt(2, 14)])),
      });
    }

    systems.push({
      id: i,
      name: `Sistema ${generateName(3)}`,
      x: randInt(30, width - 30),
      y: randInt(30, height - 30),
      starType: pick(STAR_TYPES),
      planets,
      owner: null,
      threat: randInt(0, 100),
    });
  }
  return { width, height, systems };
}
