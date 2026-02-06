export const STAR_TYPES = ["Anã Vermelha", "Amarela", "Gigante Azul", "Branca", "Binária"];
export const PLANET_CLASSES = ["Habitável", "Árido", "Gasoso", "Oceânico", "Gelado", "Tóxico"];
export const RESOURCE_TYPES = ["energia", "minerais", "alimentos", "pesquisa", "influencia"];

export const IDEOLOGIES = {
  expansionista: { military: 1.2, diplomacy: 0.8, growth: 1.05 },
  pacifista: { military: 0.8, diplomacy: 1.25, growth: 1.08 },
  tecnocrata: { military: 0.95, diplomacy: 1, growth: 1.02, research: 1.3 },
  teocratica: { military: 1.05, diplomacy: 1.1, growth: 1.06 },
  mercantil: { military: 1, diplomacy: 1.05, growth: 1.03 },
};

export const RACES = [
  { name: "Auralianos", traits: { growth: 1.2, intelligence: 1.1, aggression: 0.8, longevity: 0.9 }, env: ["Habitável", "Oceânico"], desc: "Bípedes luminescentes de cultura cooperativa." },
  { name: "Dravoks", traits: { growth: 0.9, intelligence: 0.95, aggression: 1.3, longevity: 1.1 }, env: ["Árido", "Habitável"], desc: "Guerreiros reptilianos de clãs rivais." },
  { name: "Syntari", traits: { growth: 1, intelligence: 1.35, aggression: 0.7, longevity: 1.3 }, env: ["Habitável", "Gelado"], desc: "Coletivo pós-biológico altamente lógico." },
  { name: "Nereid", traits: { growth: 1.1, intelligence: 1, aggression: 0.9, longevity: 1.2 }, env: ["Oceânico", "Gasoso"], desc: "Espécie anfíbia adaptada a alta pressão." },
];

export const CHARACTER_ROLES = ["Líder Supremo", "Governador", "Capitão de Frota", "Cientista", "Político"];
export const CHARACTER_TRAITS = ["carismático", "corrupto", "estrategista", "incompetente", "visionário", "paranoico", "inspirador"];
