import type { ModelSeries } from "~/types/parts";

/** Catalog data the backend scrapes from a boxxerparts.de product page. */
export interface BoxxerpartsProduct {
  articleNo: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  productUrl: string;
  /** "Hersteller" as listed by the shop (often "BMW" for anything that
   *  fits a BMW — the shop files parts by bike, not by maker). */
  brand: string | null;
  oemPartNumbers: string[];
  keywords: string[];
}

/** One fitment rule that fired: the phrase found in the text and the catalog
 *  nodes it stands for. Shown in the review so the user sees WHY a Serie is
 *  proposed. */
export interface FitmentMatch {
  phrase: string;
  names: string[];
}

export interface FitmentSuggestion {
  seriesIds: number[];
  matches: FitmentMatch[];
  /** Catalog names a rule wanted but the loaded catalog does not contain. */
  unmatched: string[];
}

// Global catalog node names (migrations 015/023) the rules resolve to.
const FAMILY_5_6_7 = "R-Modelle /5 /6 /7 (1969-1984)";
const FAMILY_2V = "R-Modelle 2V (1978-1996)";
const SERIES_5 = "R 50/5, R 60/5, R 75/5 (69-73)";
const SERIES_6 = "R 60/6, R 75/6, R 90/6, R 90 S (73-76)";
const SERIES_7 = "R 60/7, R 75/7, R 80/7, R 100/7-T-S-RS-RT (76-84)";
const SERIES_G_S = "R 80 G/S, R 80 ST (80-87)";
const SERIES_R65_R80 = "R 65, R 65 RT, R 80, R 80 RT (85-95)";
const SERIES_GS_PARALEVER = "R 80 GS, R 100 GS, PD (90-95)";
const SERIES_RS_RT = "R 100 RS, R 100 RT (87-95)";
const SERIES_R80R = "R 80 R, R 100 R, Mystic (91-96)";
const SERIES_K75 = "K569 (K 75, K 75 C, K 75 S, K 75 RT)";
const SERIES_K100 = "K589 (K 100, RS, RT, LT)";

interface Rule {
  pattern: RegExp;
  names: string[];
}

/** Ordered phrase → catalog rules. boxxerparts describes fitment in prose
 *  ("für alle R2V Boxer ab 69", "R 100 / 80 GS", "ab /7 Ausnahme: R 45 und
 *  R 65"), so this is a vocabulary of the phrases their product texts use.
 *  Every rule is a proposal for review, never applied silently. */
const RULES: Rule[] = [
  // Airhead generations.
  { pattern: /\bR\s?(?:50|60|75)\s?\/\s?5\b/i, names: [SERIES_5] },
  { pattern: /\bR\s?(?:60|75|90)\s?\/\s?6\b|\bR\s?90\s?S\b/i, names: [SERIES_6] },
  { pattern: /\bR\s?(?:60|75|80|100)\s?\/\s?7\b|\bab\s?\/\s?7\b/i, names: [SERIES_7] },
  // Monolever G/S and the Paralever GS family.
  { pattern: /\bR\s?80\s?G\s?\/\s?S\b|\bR\s?80\s?ST\b/i, names: [SERIES_G_S] },
  {
    // "R 100 / 80 GS", "R 100/80 GS", "R 80GS", "R 100 GS PD", "Paralever"
    pattern: /\bR\s?(?:100|80)(?:\s?\/\s?(?:100|80))?\s?GS\b|\bParalever\b/i,
    names: [SERIES_GS_PARALEVER],
  },
  { pattern: /\bR\s?100\s?R[ST]\b/i, names: [SERIES_RS_RT] },
  { pattern: /\bR\s?(?:80|100)\s?R\b(?!\s?[ST])|\bMystic\b/i, names: [SERIES_R80R] },
  { pattern: /\bR\s?(?:45|65)\b(?!\s?(?:GS|LS))/i, names: [SERIES_R65_R80] },
  // Bricks.
  { pattern: /\bK\s?75\b/i, names: [SERIES_K75] },
  { pattern: /\bK\s?100\b/i, names: [SERIES_K100] },
];

/** "2V Boxer" / "R2V" / "Zweiventiler" — the whole airhead family; with
 *  "ab 69" / "ab Baujahr 1969" the /5 /6 /7 generations are included too. */
const TWO_VALVE = /\bR\s?2\s?V\b|\b2\s?V(?:[\s-]?(?:Boxer|Modelle?))?\b|\bZweiventil/i;
const FROM_1969 = /\bab\s?(?:Baujahr\s?)?(?:19)?69\b/i;
/** "Ausnahme: R 45 und R 65" — models the seller excludes explicitly. */
const EXCLUSION = /Ausnahme:?\s*((?:R\s?\d{2,3}(?:\s?(?:und|,|\/)\s?)?)+)/i;

/** Propose catalog fitment from a boxxerparts product text (name plus
 *  description). Family-level matches collapse to the Familie node unless an
 *  exclusion forces series-level granularity. */
export function inferBoxxerpartsFitment(
  text: string,
  modelSeries: ModelSeries[],
): FitmentSuggestion {
  const normalized = text.replace(/\s+/g, " ").trim();
  const wanted = new Map<string, string>(); // name -> phrase
  const matches: FitmentMatch[] = [];

  const add = (phrase: string, names: string[]) => {
    const fresh = names.filter((name) => !wanted.has(name));
    for (const name of fresh) wanted.set(name, phrase);
    if (fresh.length > 0) matches.push({ phrase, names: fresh });
  };

  const exclusion = normalized.match(EXCLUSION);
  const excludedModels = exclusion
    ? (exclusion[1].match(/R\s?\d{2,3}/gi) ?? []).map((m) => m.replace(/\s+/g, " ").toUpperCase())
    : [];
  const isExcluded = (name: string) =>
    excludedModels.some((model) => new RegExp(`\\b${model.replace(" ", "\\s?")}\\b`, "i").test(name));

  const twoValve = normalized.match(TWO_VALVE);
  if (twoValve) {
    if (excludedModels.length > 0) {
      // "alle 2V Modelle ab /7, Ausnahme R 45 und R 65": expand the family
      // into its Serien so the excluded ones can be left out.
      const family = modelSeries.find((node) => node.name === FAMILY_2V);
      const children = family
        ? modelSeries.filter((node) => node.parentId === family.id && !isExcluded(node.name))
        : [];
      add(twoValve[0], children.length > 0 ? children.map((node) => node.name) : [FAMILY_2V]);
    } else {
      add(twoValve[0], [FAMILY_2V]);
    }
    const from1969 = normalized.match(FROM_1969);
    if (from1969) add(`${twoValve[0]} ${from1969[0]}`, [FAMILY_5_6_7]);
  }

  for (const rule of RULES) {
    const match = normalized.match(rule.pattern);
    if (!match) continue;
    // A positive mention inside the exclusion clause is not a fitment.
    if (exclusion && exclusion[0].includes(match[0])) continue;
    add(match[0], rule.names.filter((name) => !isExcluded(name)));
  }

  const byName = new Map(modelSeries.map((node) => [node.name, node]));
  const seriesIds: number[] = [];
  const unmatched: string[] = [];
  for (const name of wanted.keys()) {
    const node = byName.get(name);
    if (node) {
      seriesIds.push(node.id);
    } else {
      unmatched.push(name);
    }
  }

  // A Serie already covered by its proposed Familie is redundant.
  const ids = new Set(seriesIds);
  const collapsed = seriesIds.filter((id) => {
    const node = byName.get([...byName.values()].find((n) => n.id === id)?.name ?? "");
    return !(node?.parentId != null && ids.has(node.parentId));
  });

  return { seriesIds: collapsed.sort((a, b) => a - b), matches, unmatched };
}
