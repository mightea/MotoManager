import type { ModelSeries } from "~/types/parts";

/** Normalized view of a BMWBike part, ready to prefill the PartForm. */
export interface BmwbikePart {
  name: string;
  partNumber: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  compatNames: string[];
}

export interface CompatMapping {
  seriesIds: number[];
  unmatched: string[];
}

const BMWBIKE_API = "https://admin.bmwbike.com/ss/api/v1";

// BMWBike's shop search runs on Algolia; these are the public, search-only
// credentials embedded in their own frontend (bmwbike.com). Queries on the
// space-stripped `article_no_search` attribute resolve part numbers to the
// part slug the metadata API understands.
const ALGOLIA_APP_ID = "J5Z2XFBN3D";
const ALGOLIA_SEARCH_KEY = "0e975644d59dfe63927b2be969b3addb";
const ALGOLIA_INDEX = "bmw_products_index_prod";

/** Extract the part slug from a BMWBike URL ("https://bmwbike.com/de/part/<slug>",
 *  any locale) or accept a bare slug. Returns null for anything else. */
export function parseBmwbikeSlug(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-z0-9-]+$/i.test(trimmed)) return trimmed.toLowerCase();
  try {
    const url = new URL(trimmed);
    if (!/(^|\.)bmwbike\.com$/.test(url.hostname)) return null;
    const match = url.pathname.match(/\/part\/([a-z0-9-]+)\/?$/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Resolve a BMW part number ("61 31 2 300 383", any separators) to the
 *  BMWBike part slug via their public Algolia search index. Returns null
 *  when the shop doesn't carry the number. */
export async function findBmwbikeSlugByPartNumber(partNumber: string): Promise<string | null> {
  const normalized = partNumber.replace(/[^0-9A-Za-z]/g, "");
  if (!normalized) return null;
  const response = await fetch(
    `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-algolia-application-id": ALGOLIA_APP_ID,
        "x-algolia-api-key": ALGOLIA_SEARCH_KEY,
      },
      body: JSON.stringify({
        query: normalized,
        hitsPerPage: 1,
        restrictSearchableAttributes: ["article_no_search"],
        attributesToRetrieve: ["article_no_search", "slug"],
      }),
    },
  );
  if (!response.ok) return null;
  const payload = await response.json();
  const hit = payload?.hits?.[0];
  // Exact match only — a fuzzy hit for a different number must not enrich.
  if (!hit || hit.article_no_search !== normalized || typeof hit.slug !== "string") {
    return null;
  }
  return hit.slug;
}

/** Fetch part metadata from BMWBike's open API (CORS is `*`, no auth). */
export async function fetchBmwbikePart(slug: string): Promise<BmwbikePart> {
  const response = await fetch(`${BMWBIKE_API}/metadata/part/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    throw new Error(`BMWBike-Teil nicht gefunden (HTTP ${response.status})`);
  }
  const payload = await response.json();
  const data = payload?.data;
  const jsonLd = payload?.jsonLd;
  if (!data?.article_no) {
    throw new Error("BMWBike-Antwort enthält keine Teilenummer.");
  }
  const compat: unknown[] = Array.isArray(jsonLd?.isAccessoryOrSparePartFor)
    ? jsonLd.isAccessoryOrSparePartFor
    : [];
  const price = Number(jsonLd?.offers?.price);
  return {
    name: data.description_de || data.name || data.article_no,
    partNumber: data.article_no,
    description: jsonLd?.category?.de || null,
    imageUrl: data.image_url || null,
    price: Number.isFinite(price) && price > 0 ? price : null,
    currency: jsonLd?.offers?.priceCurrency || null,
    compatNames: compat
      .map((v) => (v as { name?: string })?.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0),
  };
}

/** Map BMWBike vehicle names onto catalog entries by exact name (the catalog
 *  mirrors their structure). Collapse: when every child of a Serie matched,
 *  link the Serie itself instead of the individual Modelle — covers the same
 *  bikes and keeps the fitment list short. */
export function mapCompatibility(
  compatNames: string[],
  modelSeries: ModelSeries[],
): CompatMapping {
  const byName = new Map(modelSeries.map((node) => [node.name, node]));
  const matched = new Set<number>();
  const unmatched: string[] = [];
  for (const name of new Set(compatNames)) {
    const node = byName.get(name);
    if (node) {
      matched.add(node.id);
    } else {
      unmatched.push(name);
    }
  }

  const childrenOf = new Map<number, number[]>();
  for (const node of modelSeries) {
    if (node.parentId != null) {
      childrenOf.set(node.parentId, [...(childrenOf.get(node.parentId) ?? []), node.id]);
    }
  }
  // Bottom-up single pass is enough: collapsing Modelle into a Serie could in
  // principle cascade to the Familie, but a part fitting a whole Familie is
  // not something the source data produces.
  for (const [parentId, children] of childrenOf) {
    if (children.length > 0 && children.every((id) => matched.has(id))) {
      for (const id of children) matched.delete(id);
      matched.add(parentId);
    }
  }

  return { seriesIds: [...matched].sort((a, b) => a - b), unmatched };
}
