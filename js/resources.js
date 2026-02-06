export function harvestFromSystems(faction, systems) {
  const owned = systems.filter((s) => s.owner === faction.id);
  for (const system of owned) {
    for (const planet of system.planets) {
      faction.resources.energia += planet.resources.energia;
      faction.resources.minerais += planet.resources.minerais;
      faction.resources.alimentos += planet.resources.alimentos;
      faction.resources.pesquisa += planet.resources.pesquisa;
      faction.resources.influencia += Math.floor(planet.resources.influencia / 2);
    }
  }

  const populationUpkeep = owned.reduce((acc, s) => acc + s.planets.reduce((a, p) => a + p.population, 0), 0);
  faction.resources.alimentos -= Math.floor(populationUpkeep * 0.7);
  faction.resources.energia -= Math.floor(populationUpkeep * 0.4);
}

export function normalizeResources(faction) {
  Object.keys(faction.resources).forEach((k) => {
    faction.resources[k] = Math.max(-200, Math.floor(faction.resources[k]));
  });
}
