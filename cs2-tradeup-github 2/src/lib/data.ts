export const SITE = 'https://cs2tradeup.com';

export interface Item {
  name: string;
  rarity: string;
}

export interface Collection {
  id: string;
  name: string;
  items: Item[];
}

// Import collections at build time
import collectionsRaw from '../../public/data/collections.json';
export const COLLECTIONS: Collection[] = collectionsRaw as Collection[];

export const RARITY_ORDER = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert'];
export const RARITY_LABELS: Record<string, string> = {
  consumer: 'Consumer Grade',
  industrial: 'Industrial Grade',
  milspec: 'Mil-Spec',
  restricted: 'Restricted',
  classified: 'Classified',
  covert: 'Covert',
};
export const RARITY_COLORS: Record<string, string> = {
  consumer: '#b0c3d9',
  industrial: '#5e98d9',
  milspec: '#4b69ff',
  restricted: '#8847ff',
  classified: '#d32ce6',
  covert: '#eb4b4b',
};

export function nextRarity(rarity: string): string | null {
  const idx = RARITY_ORDER.indexOf(rarity);
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null;
  return RARITY_ORDER[idx + 1];
}

export function getItemsByRarity(collection: Collection, rarity: string): Item[] {
  return collection.items.filter(i => i.rarity === rarity);
}

export function getOutcomes(collection: Collection, inputRarity: string): Item[] {
  const next = nextRarity(inputRarity);
  if (!next) return [];
  return getItemsByRarity(collection, next);
}

export function getRaritiesInCollection(collection: Collection): string[] {
  const set = new Set(collection.items.map(i => i.rarity));
  return RARITY_ORDER.filter(r => set.has(r));
}

export function getTradeUpPairs(collection: Collection): { from: string; to: string }[] {
  const rarities = getRaritiesInCollection(collection);
  const pairs: { from: string; to: string }[] = [];
  for (let i = 0; i < rarities.length - 1; i++) {
    const from = rarities[i];
    const to = rarities[i + 1];
    if (RARITY_ORDER.indexOf(to) === RARITY_ORDER.indexOf(from) + 1) {
      pairs.push({ from, to });
    }
  }
  return pairs;
}

export function faqSchema(faqs: [string, string][]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(f => ({
      "@type": "Question",
      "name": f[0],
      "acceptedAnswer": { "@type": "Answer", "text": f[1] }
    }))
  });
}

export function breadcrumbSchema(items: [string, string?][]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((it, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": it[0],
      ...(i < items.length - 1 && it[1] ? { "item": SITE + it[1] } : {})
    }))
  });
}
