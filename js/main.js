import { generateGalaxy } from "./map.js";
import { seedFactions } from "./factions.js";
import { seedCharacters, applyCharacterEffects, randomCharacterEvent } from "./characters.js";
import { updatePlanetPopulation, unrestCheck } from "./population.js";
import { harvestFromSystems, normalizeResources } from "./resources.js";
import { rollEvent } from "./events.js";
import { runAI } from "./ai.js";
import { clamp } from "./utils.js";

const state = {
  turn: 1,
  galaxy: null,
  factions: [],
  characters: [],
  selectedSystemId: null,
  log: [],
};

const canvas = document.getElementById("star-map");
const ctx = canvas.getContext("2d");
const tooltip = document.getElementById("map-tooltip");

const resourcesList = document.getElementById("resources-list");
const factionInfo = document.getElementById("faction-info");
const diplomacyList = document.getElementById("diplomacy-list");
const systemDetails = document.getElementById("system-details");
const charactersList = document.getElementById("characters-list");
const eventsLog = document.getElementById("events-log");

function newGame() {
  state.turn = 1;
  state.galaxy = generateGalaxy();
  state.factions = seedFactions();
  state.characters = seedCharacters();
  state.log = ["🚀 Nova era de colonização iniciada."];
  state.selectedSystemId = null;

  const [player, ...ais] = state.factions;
  state.galaxy.systems[0].owner = player.id;
  player.systems.push(state.galaxy.systems[0].id);
  ais.forEach((ai, i) => {
    state.galaxy.systems[i + 1].owner = ai.id;
    ai.systems.push(state.galaxy.systems[i + 1].id);
  });

  render();
}

function saveGame() {
  localStorage.setItem("space-colony-save", JSON.stringify(state));
  state.log.unshift("💾 Jogo salvo.");
  renderPanels();
}

function loadGame() {
  const raw = localStorage.getItem("space-colony-save");
  if (!raw) return;
  const loaded = JSON.parse(raw);
  Object.assign(state, loaded);
  state.log.unshift("📂 Save carregado.");
  render();
}

function nextTurn() {
  const [player, ...ais] = state.factions;

  applyCharacterEffects(player, state.characters);
  randomCharacterEvent(state.characters, state.log);

  for (const system of state.galaxy.systems.filter((s) => s.owner === player.id)) {
    for (const planet of system.planets) {
      updatePlanetPopulation(planet, player.bonuses);
      const unrest = unrestCheck(planet);
      if (unrest) state.log.unshift(`⚠️ ${planet.name} enfrenta ${unrest}.`);
    }
  }

  harvestFromSystems(player, state.galaxy.systems);
  rollEvent(player, state.log);
  ais.forEach((ai) => runAI(ai, state.galaxy, player, state.log));

  player.stability = clamp(player.stability, 0, 100);
  normalizeResources(player);
  state.turn += 1;
  render();
}

function getPlayer() {
  return state.factions.find((f) => f.isPlayer);
}

function systemOwner(system) {
  return state.factions.find((f) => f.id === system.owner);
}

function renderMap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#03050f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  state.galaxy.systems.forEach((s) => {
    const owner = systemOwner(s);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = owner?.color || "#9aa6cb";
    ctx.fill();

    if (state.selectedSystemId === s.id) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    }
  });
}

function renderPanels() {
  const player = getPlayer();
  resourcesList.innerHTML = Object.entries(player.resources)
    .map(([k, v]) => `<div><strong>${k}</strong>: <span class="${v < 0 ? "bad" : "good"}">${v}</span></div>`)
    .join("");

  factionInfo.innerHTML = `
    <div><strong>Turno:</strong> ${state.turn}</div>
    <div><strong>Nome:</strong> ${player.name} ${player.emblem}</div>
    <div><strong>Ideologia:</strong> ${player.ideology}</div>
    <div><strong>Raça:</strong> ${player.race.name}</div>
    <div><strong>Traços:</strong> Int ${player.race.traits.intelligence} | Agr ${player.race.traits.aggression}</div>
    <div><strong>Estabilidade:</strong> ${Math.floor(player.stability)}</div>
  `;

  diplomacyList.innerHTML = state.factions
    .filter((f) => !f.isPlayer)
    .map((f) => `<div style="color:${f.color}">${f.name}: relação ${player.diplomacy[f.id] ?? 0}</div>`)
    .join("");

  const selected = state.galaxy.systems.find((s) => s.id === state.selectedSystemId);
  if (!selected) {
    systemDetails.textContent = "Nenhum sistema selecionado.";
  } else {
    const owner = systemOwner(selected);
    systemDetails.innerHTML = `
      <div><strong>${selected.name}</strong> (${selected.starType})</div>
      <div><strong>Dono:</strong> ${owner?.name || "Neutro"}</div>
      <div><strong>Ameaça:</strong> ${selected.threat}</div>
      <hr>
      ${selected.planets
        .map(
          (p) => `<div><strong>${p.name}</strong> [${p.class}] Pop:${p.population.toFixed(1)} Fel:${p.happiness.toFixed(0)} Tax:${p.tax}% Prioridade:${p.priority}</div>`
        )
        .join("")}
    `;
  }

  charactersList.innerHTML = state.characters
    .map((c) => `<div>${c.alive ? "🧬" : "⚰️"} <strong>${c.name}</strong> (${c.role}) - ${c.trait}, ${c.age} anos</div>`)
    .join("");

  eventsLog.innerHTML = state.log.slice(0, 16).map((e) => `<div>${e}</div>`).join("");
}

function render() {
  renderMap();
  renderPanels();
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const found = state.galaxy.systems.find((s) => Math.hypot(s.x - x, s.y - y) < 10);

  if (found) {
    state.selectedSystemId = found.id;
    const player = getPlayer();
    if (!found.owner && player.resources.minerais >= 40) {
      found.owner = player.id;
      player.systems.push(found.id);
      player.resources.minerais -= 40;
      state.log.unshift(`🪐 ${found.name} foi colonizado por ${player.name}.`);
    }
    render();
  }
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const found = state.galaxy.systems.find((s) => Math.hypot(s.x - x, s.y - y) < 10);
  if (!found) {
    tooltip.classList.add("hidden");
    return;
  }

  tooltip.classList.remove("hidden");
  tooltip.style.left = `${e.clientX - rect.left + 15}px`;
  tooltip.style.top = `${e.clientY - rect.top + 15}px`;
  tooltip.innerHTML = `<strong>${found.name}</strong><br>${found.starType}<br>Planetas: ${found.planets.length}`;
});

for (const [id, fn] of [
  ["new-game-btn", newGame],
  ["save-btn", saveGame],
  ["load-btn", loadGame],
  ["next-turn-btn", nextTurn],
]) {
  document.getElementById(id).addEventListener("click", fn);
}

newGame();
