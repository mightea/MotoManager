import type { MaintenanceRecord, MaintenanceType, Location, FluidType, TirePosition, BatteryType } from "~/db/schema";

export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  tire: "Reifenwechsel",
  battery: "Batterie",
  brakepad: "Bremsbeläge",
  chain: "Kette",
  brakerotor: "Bremsscheibe",
  fluid: "Flüssigkeit",
  general: "Allgemein",
  repair: "Reparatur",
  service: "Service",
  inspection: "MFK",
  location: "Standort",
};

export const fluidTypeLabels: Record<FluidType, string> = {
  engineoil: "Motoröl",
  gearboxoil: "Getriebeöl",
  finaldriveoil: "Kardanöl",
  driveshaftoil: "Kardanwellenöl",
  forkoil: "Gabelöl",
  breakfluid: "Bremsflüssigkeit",
  coolant: "Kühlflüssigkeit",
};

export const tirePositionLabels: Record<TirePosition, string> = {
  front: "Vorne",
  rear: "Hinten",
  sidecar: "Beiwagen",
};

export const batteryTypeLabels: Record<BatteryType, string> = {
  "lead-acid": "Blei-Säure",
  gel: "Gel",
  agm: "AGM",
  "lithium-ion": "Lithium-Ionen",
  other: "Andere",
};

/**
 * Summarizes a maintenance record into a concise German text.
 */
export function summarizeMaintenanceRecord(record: MaintenanceRecord, userLocations?: Location[]): string {
  const parts: string[] = [];

  switch (record.type) {
    case "tire": {
      const brandModel = [record.brand, record.model].filter(Boolean).join(" ");
      if (brandModel) parts.push(brandModel);
      
      if (record.tirePosition) {
        parts.push(`(${tirePositionLabels[record.tirePosition] || record.tirePosition})`);
      }
      
      if (record.tireSize) parts.push(record.tireSize);
      if (record.dotCode) {
        // Format DOT code if it's 4 digits
        const dotMatch = record.dotCode.match(/(\d{2})(\d{2})$/);
        const formattedDot = dotMatch ? `${dotMatch[1]}/${dotMatch[2]}` : record.dotCode;
        parts.push(`DOT ${formattedDot}`);
      }
      return parts.length > 0 ? parts.join(" ") : "Reifenwechsel";
    }

    case "battery": {
      const brandModel = [record.brand, record.model].filter(Boolean).join(" ");
      if (brandModel) parts.push(brandModel);
      if (record.batteryType) {
        parts.push(`(${batteryTypeLabels[record.batteryType] || record.batteryType})`);
      }
      return parts.length > 0 ? parts.join(" ") : "Batteriewechsel";
    }

    case "fluid": {
      if (record.fluidType) {
        parts.push(fluidTypeLabels[record.fluidType] || record.fluidType);
      }
      if (record.brand) parts.push(record.brand);
      if (record.viscosity) parts.push(record.viscosity);
      return parts.length > 0 ? parts.join(" ") : "Flüssigkeitswechsel";
    }

    case "inspection": {
      return record.inspectionLocation ? `MFK bei ${record.inspectionLocation}` : "MFK";
    }

    case "location": {
      const loc = userLocations?.find(l => l.id === record.locationId);
      return loc ? `Standortwechsel nach ${loc.name}` : "Standortwechsel";
    }

    case "brakepad":
    case "brakerotor":
    case "chain":
    case "repair":
    case "service":
    case "general": {
      // For these types, try brand/model, otherwise fall back to description or type label
      const brandModel = [record.brand, record.model].filter(Boolean).join(" ");
      if (brandModel) return brandModel;
      if (record.description) return record.description;
      return maintenanceTypeLabels[record.type];
    }

    default:
      return record.description || maintenanceTypeLabels[record.type as MaintenanceType] || "Wartung";
  }
}
