/**
 * The 58 wilayas + delivery prices (DA). Communes load from /public/data/communes.json
 * (source: github.com/othmanus/algeria-cities, Interior Ministry list).
 *
 * Delivery prices are PLACEHOLDERS — set them to your courier's rates (Yalidine, ZR, Maystro…).
 * `desk: null` = no stop-desk in that wilaya.
 */
export type DeliveryType = "home" | "desk";

type Zone = { home: number; desk: number | null };
const ZONES: Record<"alger" | "centre" | "north" | "south" | "far", Zone> = {
  alger: { home: 400, desk: 250 },
  centre: { home: 550, desk: 350 },
  north: { home: 650, desk: 400 },
  south: { home: 850, desk: 550 },
  far: { home: 1300, desk: 900 },
};

const W: [string, string, string, keyof typeof ZONES][] = [
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

export type Wilaya = { code: string; fr: string; ar: string; home: number; desk: number | null };
export const WILAYAS: Wilaya[] = W.map(([code, fr, ar, z]) => ({ code, fr, ar, ...ZONES[z] }));
export const getWilaya = (code: string) => WILAYAS.find((w) => w.code === code);

export function deliveryFee(code: string, type: DeliveryType): number | null {
  const w = getWilaya(code);
  if (!w) return null;
  return type === "desk" ? w.desk : w.home;
}

/** Algerian mobile: 05/06/07 + 8 digits. Accepts +213 / 00213 and spaces. Returns 0XXXXXXXXX or null. */
export function normalizePhone(raw: string): string | null {
  let s = raw.replace(/[\s.\-()]/g, "");
  if (s.startsWith("+213")) s = "0" + s.slice(4);
  else if (s.startsWith("00213")) s = "0" + s.slice(5);
  else if (/^[567]\d{8}$/.test(s)) s = "0" + s;
  return /^0[567]\d{8}$/.test(s) ? s : null;
}
