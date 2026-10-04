/**
 * The 58 wilayas and the starting delivery prices (DA). Prices are edited from /admin → Delivery.
 * Communes load from /public/data/communes.json (source: github.com/othmanus/algeria-cities,
 * Interior Ministry list).
 *
 * Each wilaya belongs to a price zone; a wilaya can also have its own prices or be switched off.
 * `desk: null` = no stop-desk.
 */
import type { Delivery, Wilaya, Zone } from "./types";

const ZONES: Zone[] = [
  { id: "alger", name: "Alger", home: 400, desk: 250 },
  { id: "centre", name: "Centre", home: 550, desk: 350 },
  { id: "north", name: "North", home: 650, desk: 400 },
  { id: "south", name: "South", home: 850, desk: 550 },
  { id: "far", name: "Far south", home: 1300, desk: 900 },
];

const W: [string, string, string, string][] = [
  ["01", "Adrar", "أدرار", "far"],
  ["02", "Chlef", "الشلف", "north"],
  ["03", "Laghouat", "الأغواط", "south"],
  ["04", "Oum El Bouaghi", "أم البواقي", "north"],
  ["05", "Batna", "باتنة", "north"],
  ["06", "Béjaïa", "بجاية", "north"],
  ["07", "Biskra", "بسكرة", "south"],
  ["08", "Béchar", "بشار", "south"],
  ["09", "Blida", "البليدة", "centre"],
  ["10", "Bouira", "البويرة", "north"],
  ["11", "Tamanrasset", "تمنراست", "far"],
  ["12", "Tébessa", "تبسة", "north"],
  ["13", "Tlemcen", "تلمسان", "north"],
  ["14", "Tiaret", "تيارت", "north"],
  ["15", "Tizi Ouzou", "تيزي وزو", "north"],
  ["16", "Alger", "الجزائر", "alger"],
  ["17", "Djelfa", "الجلفة", "south"],
  ["18", "Jijel", "جيجل", "north"],
  ["19", "Sétif", "سطيف", "north"],
  ["20", "Saïda", "سعيدة", "north"],
  ["21", "Skikda", "سكيكدة", "north"],
  ["22", "Sidi Bel Abbès", "سيدي بلعباس", "north"],
  ["23", "Annaba", "عنابة", "north"],
  ["24", "Guelma", "قالمة", "north"],
  ["25", "Constantine", "قسنطينة", "north"],
  ["26", "Médéa", "المدية", "north"],
  ["27", "Mostaganem", "مستغانم", "north"],
  ["28", "M'Sila", "المسيلة", "north"],
  ["29", "Mascara", "معسكر", "north"],
  ["30", "Ouargla", "ورقلة", "south"],
  ["31", "Oran", "وهران", "north"],
  ["32", "El Bayadh", "البيض", "south"],
  ["33", "Illizi", "إليزي", "far"],
  ["34", "Bordj Bou Arreridj", "برج بوعريريج", "north"],
  ["35", "Boumerdès", "بومرداس", "centre"],
  ["36", "El Tarf", "الطارف", "north"],
  ["37", "Tindouf", "تندوف", "far"],
  ["38", "Tissemsilt", "تيسمسيلت", "north"],
  ["39", "El Oued", "الوادي", "south"],
  ["40", "Khenchela", "خنشلة", "north"],
  ["41", "Souk Ahras", "سوق أهراس", "north"],
  ["42", "Tipaza", "تيبازة", "centre"],
  ["43", "Mila", "ميلة", "north"],
  ["44", "Aïn Defla", "عين الدفلى", "north"],
  ["45", "Naâma", "النعامة", "south"],
  ["46", "Aïn Témouchent", "عين تموشنت", "north"],
  ["47", "Ghardaïa", "غرداية", "south"],
  ["48", "Relizane", "غليزان", "north"],
  ["49", "Timimoun", "تيميمون", "far"],
  ["50", "Bordj Badji Mokhtar", "برج باجي مختار", "far"],
  ["51", "Ouled Djellal", "أولاد جلال", "south"],
  ["52", "Béni Abbès", "بني عباس", "far"],
  ["53", "In Salah", "عين صالح", "far"],
  ["54", "In Guezzam", "عين قزام", "far"],
  ["55", "Touggourt", "تقرت", "south"],
  ["56", "Djanet", "جانت", "far"],
  ["57", "El M'Ghair", "المغير", "south"],
  ["58", "El Meniaa", "المنيعة", "south"],
];

export const WILAYA_LIST = W.map(([code, fr, ar]) => ({ code, fr, ar }));

export const DEFAULT_DELIVERY: Delivery = {
  zones: ZONES,
  rules: Object.fromEntries(W.map(([code, , , zone]) => [code, { zone }])),
  freeOver: 0,
};

export type ResolvedWilaya = Wilaya & { zone: string; off: boolean; custom: boolean };

/** Every wilaya with its final prices (custom price > zone price). */
export function resolveWilayas(d: Delivery): ResolvedWilaya[] {
  return WILAYA_LIST.map((w) => {
    const rule = d.rules[w.code] ?? { zone: d.zones[0]?.id ?? "" };
    const zone = d.zones.find((z) => z.id === rule.zone) ?? d.zones[0];
    const prices = rule.custom ?? { home: zone?.home ?? 0, desk: zone?.desk ?? null };
    return { ...w, home: prices.home, desk: prices.desk, zone: zone?.id ?? "", off: !!rule.off, custom: !!rule.custom };
  });
}

export const wilayaLabel = (code: string) => {
  const w = WILAYA_LIST.find((x) => x.code === code);
  return w ? `${w.code} ${w.fr}` : code;
};

/** Algerian mobile: 05/06/07 + 8 digits. Accepts +213 / 00213 and spaces. Returns 0XXXXXXXXX or null. */
export function normalizePhone(raw: string): string | null {
  let s = raw.replace(/[\s.\-()]/g, "");
  if (s.startsWith("+213")) s = "0" + s.slice(4);
  else if (s.startsWith("00213")) s = "0" + s.slice(5);
  else if (/^[567]\d{8}$/.test(s)) s = "0" + s;
  return /^0[567]\d{8}$/.test(s) ? s : null;
}
