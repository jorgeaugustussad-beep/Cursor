import { chance, pick } from "./utils.js";

const pool = [
  {
    type: "guerra",
    text: "⚔️ Uma guerra de fronteira explode em um setor disputado.",
    effect: (f) => {
      f.resources.minerais -= 20;
      f.stability -= 6;
    },
  },
  {
    type: "descoberta",
    text: "🔬 Descoberta científica acelera novas tecnologias.",
    effect: (f) => {
      f.resources.pesquisa += 35;
      f.resources.energia += 10;
    },
  },
  {
    type: "conspiração",
    text: "🕶️ Conspiração política reduz a confiança no governo.",
    effect: (f) => {
      f.resources.influencia -= 20;
      f.stability -= 8;
    },
  },
  {
    type: "contato",
    text: "👽 Novo contato alienígena abre oportunidades diplomáticas.",
    effect: (f) => {
      f.resources.influencia += 25;
      f.stability += 3;
    },
  },
];

export function rollEvent(faction, log) {
  if (!chance(0.25)) return;
  const e = pick(pool);
  e.effect(faction);
  log.unshift(e.text);
}
