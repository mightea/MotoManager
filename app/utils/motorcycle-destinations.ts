import { createMotorcycleSlug } from "~/utils/motorcycle";
import { searchTokens, tokenMatchesFields } from "~/utils/motorcycle-search";

/** Dialogs of the bike page that can be opened through `?open=`. */
export const BIKE_OPEN_ACTIONS = ["edit", "maintenance", "issue", "owners", "odometer"] as const;
export type BikeOpenAction = (typeof BIKE_OPEN_ACTIONS)[number];

export function parseBikeOpenAction(value: string | null): BikeOpenAction | null {
  return BIKE_OPEN_ACTIONS.find((action) => action === value) ?? null;
}

export type BikeDestination = {
  id: string;
  group: "Bereich" | "Aktion";
  label: string;
  aliases: readonly string[];
  /** Appended to the bike's base path. */
  suffix: string;
};

export const BIKE_DESTINATIONS: readonly BikeDestination[] = [
  { id: "overview", group: "Bereich", label: "Übersicht", aliases: ["uebersicht", "historie", "start"], suffix: "" },
  { id: "documents", group: "Bereich", label: "Dokumente", aliases: ["papiere", "unterlagen"], suffix: "/documents" },
  { id: "workshop", group: "Bereich", label: "Werkstattdaten", aliases: ["specs"], suffix: "/torque-specs" },
  { id: "pressure", group: "Bereich", label: "Reifendruck", aliases: ["luftdruck", "reifen"], suffix: "/torque-specs#pressure-heading" },
  { id: "torque", group: "Bereich", label: "Anzugsmomente", aliases: ["drehmoment", "schrauben", "torque"], suffix: "/torque-specs#torque-heading" },
  { id: "parts", group: "Bereich", label: "Teile", aliases: ["ersatzteile"], suffix: "/parts" },
  { id: "edit", group: "Aktion", label: "Fahrzeug bearbeiten", aliases: ["einstellungen", "settings", "ändern", "kennzeichen", "vin"], suffix: "?open=edit" },
  { id: "maintenance", group: "Aktion", label: "Wartung erfassen", aliases: ["service", "eintrag", "tanken"], suffix: "?open=maintenance" },
  { id: "issue", group: "Aktion", label: "Mangel erfassen", aliases: ["defekt", "problem"], suffix: "?open=issue" },
  { id: "owners", group: "Aktion", label: "Vorbesitzer verwalten", aliases: ["halter", "besitzer"], suffix: "?open=owners" },
  { id: "odometer", group: "Aktion", label: "Tachowechsel erfassen", aliases: ["kilometer", "km"], suffix: "?open=odometer" },
];

type SearchableBike = { id: number; make: string; model: string };

export type BikeCommandResult<B extends SearchableBike> =
  | { kind: "bike"; bike: B }
  | { kind: "destination"; bike: B; destination: BikeDestination };

export function bikeDestinationHref(bike: SearchableBike, destination: BikeDestination): string {
  return `/motorcycle/${createMotorcycleSlug(bike.make, bike.model)}/${bike.id}${destination.suffix}`;
}

const destinationFields = (destination: BikeDestination) => [destination.label, ...destination.aliases];

/** The targets of one bike that match the query (all of them when it's empty). */
export function filterBikeDestinations(query: string): BikeDestination[] {
  const tokens = searchTokens(query);
  return BIKE_DESTINATIONS.filter((destination) =>
    tokens.every((token) => tokenMatchesFields(token, destinationFields(destination))),
  );
}

/**
 * Search across bikes and their targets, so "tenere teile" finds that page
 * directly. Bikes matching the whole query come first. A target only appears
 * when at least one token isn't explained by the bike's name, otherwise typing
 * a bike's name would list all of its targets.
 */
export function searchBikeCommands<B extends SearchableBike>(
  bikes: readonly B[],
  query: string,
  limit = 30,
): BikeCommandResult<B>[] {
  const tokens = searchTokens(query);
  const bikeResults: BikeCommandResult<B>[] = [];
  const destinationResults: BikeCommandResult<B>[] = [];

  for (const bike of bikes) {
    const nameFields = [bike.make, bike.model];
    const unmatched = tokens.filter((token) => !tokenMatchesFields(token, nameFields));
    if (unmatched.length === 0) {
      bikeResults.push({ kind: "bike", bike });
      continue;
    }
    for (const destination of BIKE_DESTINATIONS) {
      const fields = destinationFields(destination);
      if (unmatched.every((token) => tokenMatchesFields(token, fields))) {
        destinationResults.push({ kind: "destination", bike, destination });
      }
    }
  }

  return [...bikeResults, ...destinationResults].slice(0, limit);
}
