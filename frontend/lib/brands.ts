import type { Product } from "./api";

// Cor de cada marca para os cards sem foto.
const COLORS: Record<string, string> = {
  adobe: "#e1251b",
  airtable: "#18bfff",
  bolt: "#1389fd",
  canva: "#00c4cc",
  capcut: "#3d3d45",
  chatgpt: "#10a37f",
  claude: "#d97757",
  coursera: "#0056d2",
  crunchyroll: "#f47521",
  cursor: "#3a3a44",
  duolingo: "#46a302",
  "eleven labs": "#4a4a55",
  figma: "#a259ff",
  framer: "#0055ff",
  gemini: "#4285f4",
  grok: "#3a3a44",
  ilovepdf: "#e5322d",
  leonardo: "#8b5cf6",
  linear: "#5e6ad2",
  linkedin: "#0a66c2",
  lovable: "#ff5c8a",
  manus: "#4a4a55",
  microsoft: "#0078d4",
  netflix: "#e50914",
  notion: "#55555f",
  "prime video": "#00a8e1",
  replit: "#f26207",
  spotify: "#1db954",
  telegram: "#26a5e4",
  vpn: "#4687ff",
  wisper: "#6b4eff",
  youtube: "#e62117",
};

const GROUP_LABELS: Record<string, string> = {
  "Official Subscriptions 12m": "Assinaturas 12 meses",
  VPN: "VPN",
};

export const categoryLabel = (category: string) => GROUP_LABELS[category] ?? category;

// Categorias "guarda-chuva" não são uma marca: usa a primeira palavra do produto.
export function brandName(product: Pick<Product, "name" | "category">) {
  return product.category in GROUP_LABELS ? product.name.split(/\s+/)[0] : product.category;
}

export function brandColor(brand: string) {
  const known = COLORS[brand.toLowerCase()];
  if (known) return known;
  let hue = 0;
  for (const char of brand) hue = (hue * 31 + char.charCodeAt(0)) % 360;
  return `hsl(${hue} 55% 42%)`;
}

// Arquivos em public/logos/<slug>.png
const LOGOS = new Set(["adobe", "airtable", "arize", "avira", "bolt", "canva", "capcut", "chatgpt", "chatprd", "claude", "coursera", "crunchyroll", "cursor", "descript", "duolingo", "eleven-labs", "elevenlabs", "express", "factory", "figma", "framer", "gamma", "gemini", "granola", "grok", "gumloop", "higgsfield", "ilovepdf", "intercom", "jam", "lennys", "leonardo", "linear", "linkedin", "lovable", "magic", "manus", "microsoft", "mobbin", "n8n", "netflix", "nord", "notion", "pangram", "posthog", "prime-video", "proton", "railway", "replit", "runway", "spotify", "telegram", "wiktor-ai", "wisper", "youtube"]);

export function brandLogo(brand: string) {
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return LOGOS.has(slug) ? `/logos/${slug}.png` : null;
}
