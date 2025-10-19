import { and, eq } from "drizzle-orm";
import { getDb } from "~/db";
import {
  motorcycles,
  type MaintenanceType,
  type Issue,
  type NewIssue,
  type NewMaintenanceRecord,
  type NewTorqueSpecification,
} from "~/db/schema";
import { mergeHeaders, requireUser } from "~/services/auth.server";
import type { Route } from "./+types/motorcycle";
import { data } from "react-router";

const MAINTENANCE_TYPES: readonly MaintenanceType[] = [
  "tire",
  "battery",
  "brakepad",
  "chain",
  "brakerotor",
  "fluid",
  "general",
  "repair",
  "service",
  "inspection",
] as const;

const FLUID_TYPES = [
  "engineoil",
  "gearboxoil",
  "finaldriveoil",
  "driveshaftoil",
  "forkoil",
  "breakfluid",
  "coolant",
] as const;

const BATTERY_TYPES = ["lead-acid", "gel", "agm", "lithium-ion", "other"] as const;

const TIRE_POSITIONS = ["front", "rear", "sidecar"] as const;

const OIL_TYPES = ["synthetic", "semi-synthetic", "mineral"] as const;

const ISSUE_PRIORITIES = ["low", "medium", "high"] as const satisfies readonly Issue["priority"][];
const ISSUE_STATUSES = ["new", "in_progress", "done"] as const satisfies readonly Issue["status"][];

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  const num = Number.parseFloat(String(value));
  return Number.isNaN(num) ? undefined : num;
};

const toOptionalInt = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  const num = Number.parseInt(String(value), 10);
  return Number.isNaN(num) ? undefined : num;
};

const toEnumValue = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined => {
  const str = toOptionalString(value);
  if (!str) return undefined;
  return allowed.includes(str as T) ? (str as T) : undefined;
};

export const parseMaintenancePayload = (
  fields: Record<string, FormDataEntryValue>,
  motorcycleId: number,
) => {
  const date = toOptionalString(fields.date);
  if (!date) {
    throw new Error("Datum ist erforderlich.");
  }

  const type = toEnumValue(fields.type, MAINTENANCE_TYPES);
  if (!type) {
    throw new Error("Ungültiger Wartungstyp.");
  }

  const odo = toOptionalInt(fields.odo);
  if (odo == null || odo < 0) {
    throw new Error("Kilometerstand ist erforderlich und muss positiv sein.");
  }

  const cost = toOptionalNumber(fields.cost);
  const currency =
    toOptionalString(fields.currency) ?? toOptionalString(fields.currencyCode);

  const payload: NewMaintenanceRecord = {
    motorcycleId,
    date,
    type,
    odo,
    ...(cost !== undefined ? { cost } : {}),
    ...(currency ? { currency } : {}),
  };

  const brand = toOptionalString(fields.brand);
  if (brand !== undefined) payload.brand = brand;

  const model = toOptionalString(fields.model);
  if (model !== undefined) payload.model = model;

  const tirePosition = toEnumValue(fields.tirePosition, TIRE_POSITIONS);
  if (tirePosition !== undefined) payload.tirePosition = tirePosition;

  const tireSize = toOptionalString(fields.tireSize);
  if (tireSize !== undefined) payload.tireSize = tireSize;

  const dotCode = toOptionalString(fields.dotCode);
  if (dotCode !== undefined) payload.dotCode = dotCode;

  const batteryType = toEnumValue(fields.batteryType, BATTERY_TYPES);
  if (batteryType !== undefined) payload.batteryType = batteryType;

  const fluidType = toEnumValue(fields.fluidType, FLUID_TYPES);
  if (fluidType !== undefined) payload.fluidType = fluidType;

  const viscosity = toOptionalString(fields.viscosity);
  if (viscosity !== undefined) payload.viscosity = viscosity;

  const oilType = toEnumValue(fields.oilType, OIL_TYPES);
  if (oilType !== undefined) payload.oilType = oilType;

  const inspectionLocation = toOptionalString(fields.inspectionLocation);
  if (inspectionLocation !== undefined)
    payload.inspectionLocation = inspectionLocation;

  const description = toOptionalString(fields.description);
  if (description !== undefined) payload.description = description;

  return payload;
};

export const parseIssuePayload = (
  fields: Record<string, FormDataEntryValue>,
  motorcycleId: number,
) => {
  const description = toOptionalString(fields.description);
  if (!description) {
    throw new Error("Beschreibung ist erforderlich.");
  }

  const priority = toEnumValue(fields.priority, ISSUE_PRIORITIES);
  if (!priority) {
    throw new Error("Ungültige Priorität.");
  }

  const status = toEnumValue(fields.status, ISSUE_STATUSES);
  if (!status) {
    throw new Error("Ungültiger Status.");
  }

  const odo = toOptionalInt(fields.odo);
  if (odo == null || odo < 0) {
    throw new Error("Kilometerstand ist erforderlich und muss positiv sein.");
  }

  const date = toOptionalString(fields.date);
  if (!date) {
    throw new Error("Datum ist erforderlich.");
  }

  return {
    motorcycleId,
    description,
    priority,
    status,
    odo,
    date,
  } satisfies NewIssue;
};

export const parseTorquePayload = (
  fields: Record<string, FormDataEntryValue>,
  motorcycleId: number,
) => {
  const category = toOptionalString(fields.category);
  const name = toOptionalString(fields.name);
  if (!category || !name) {
    throw new Error("Kategorie und Bezeichnung sind erforderlich.");
  }

  const torque = toOptionalNumber(fields.torque);
  if (torque == null) {
    throw new Error("Drehmoment ist ungültig.");
  }

  const variation = toOptionalNumber(fields.variation);
  const torqueEnd = toOptionalNumber(fields.torqueEnd);
  const mode =
    toOptionalString(fields.variationMode) === "range" ? "range" : "plusminus";
  const description =
    toOptionalString(fields.description) ??
    (fields.description === null ? null : undefined);

  if (mode === "range") {
    if (torqueEnd === undefined) {
      throw new Error("Bitte gib das Bereichsende (Nm) an.");
    }
    if (torqueEnd < torque) {
      throw new Error(
        "Das Bereichsende darf nicht kleiner als der Startwert sein.",
      );
    }
    return {
      motorcycleId,
      category,
      name,
      torque,
      variation: null,
      torqueEnd,
      ...(description !== undefined ? { description } : {}),
    } satisfies NewTorqueSpecification;
  }

  if (variation !== undefined && variation < 0) {
    throw new Error("Die Toleranz darf nicht negativ sein.");
  }

  return {
    motorcycleId,
    category,
    name,
    torque,
    variation: variation ?? null,
    torqueEnd: null,
    ...(description !== undefined ? { description } : {}),
  } satisfies NewTorqueSpecification;
};

type MotorcycleRecord = typeof motorcycles.$inferSelect;

export type MotorcycleActionSuccessContext = {
  user: Awaited<ReturnType<typeof requireUser>>["user"];
  db: Awaited<ReturnType<typeof getDb>>;
  respond: (body: unknown, init?: ResponseInit) => Response;
  motorcycleId: number;
  targetMotorcycle: MotorcycleRecord;
};

export type MotorcycleActionContext =
  | {
      error: Response;
      respond: (body: unknown, init?: ResponseInit) => Response;
    }
  | MotorcycleActionSuccessContext;

export async function getMotorcycleActionContext({
  request,
  params,
}: Route.ActionArgs): Promise<MotorcycleActionContext> {
  const { user, headers: sessionHeaders } = await requireUser(request);
  const db = await getDb();

  const respond = (body: unknown, init?: ResponseInit) =>
    data(body, {
      ...init,
      headers: mergeHeaders(sessionHeaders ?? {}),
    });

  const motorcycleId = Number.parseInt(params.motorcycleId ?? "", 10);
  if (Number.isNaN(motorcycleId)) {
    return {
      respond,
      error: respond(
        { success: false, message: "Motorrad konnte nicht ermittelt werden." },
        { status: 400 },
      ),
    };
  }

  const targetMotorcycle = await db.query.motorcycles.findFirst({
    where: and(
      eq(motorcycles.id, motorcycleId),
      eq(motorcycles.userId, user.id),
    ),
  });

  if (!targetMotorcycle) {
    return {
      respond,
      error: respond(
        { success: false, message: "Motorrad wurde nicht gefunden." },
        { status: 404 },
      ),
    };
  }

  return {
    user,
    db,
    respond,
    motorcycleId,
    targetMotorcycle,
  };
}
