import { clamp } from "./utils.js";

export function updatePlanetPopulation(planet, factionBonuses) {
  const growthBase = 0.015 * (factionBonuses.growth || 1);
  const happinessFactor = planet.happiness / 100;
  const taxPenalty = planet.tax > 25 ? 0.7 : 1;
  const growth = planet.population * growthBase * happinessFactor * taxPenalty;
  planet.population = clamp(planet.population + growth, 0, 999);

  if (planet.priority === "militar") planet.happiness -= 1;
  if (planet.priority === "bem-estar") planet.happiness += 1;
  if (planet.priority === "ciência") planet.happiness -= 0.2;

  planet.happiness = clamp(planet.happiness, 0, 100);
}

export function unrestCheck(planet) {
  if (planet.happiness < 30 && planet.population > 8) {
    return "rebelião";
  }
  if (planet.happiness < 40) return "crise";
  if (planet.happiness > 85) return "êxodo positivo";
  return null;
}
