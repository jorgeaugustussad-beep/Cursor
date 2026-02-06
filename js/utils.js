export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = (arr) => arr[randInt(0, arr.length - 1)];
export const chance = (p) => Math.random() < p;

const syllables = ["ar", "zen", "tor", "lia", "vek", "ion", "pra", "dul", "shi", "mon", "kra", "nel"];
export function generateName(parts = 2) {
  let n = "";
  for (let i = 0; i < parts; i++) n += pick(syllables);
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
