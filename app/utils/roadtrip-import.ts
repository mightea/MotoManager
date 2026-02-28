export interface RoadTripFuelEntry {
  odo: number;
  date: string;
  fuelAmount: number;
  pricePerUnit: number;
  cost: number;
  latitude: number | null;
  longitude: number | null;
  fuelType: string;
  externalId: string | null;
  currency: string | null;
  currencyRate: number | null;
  locationName: string | null;
}

/**
 * Parses a RoadTrip CSV file content and extracts fuel records.
 */
export function parseRoadTripCsv(content: string): RoadTripFuelEntry[] {
  const lines = content.split(/\r?\n/);
  const fuelRecords: RoadTripFuelEntry[] = [];
  
  let inFuelSection = false;
  let headerFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === "FUEL RECORDS") {
      inFuelSection = true;
      continue;
    }

    if (inFuelSection && !headerFound) {
      if (line.startsWith("Odometer")) {
        headerFound = true;
      }
      continue;
    }

    if (inFuelSection && headerFound) {
      if (line === "" || line === "MAINTENANCE RECORDS" || line === "ROAD TRIPS" || line === "VEHICLE") {
        inFuelSection = false;
        break;
      }

      // Simple CSV split handling quotes for date
      const parts = parseCsvLine(line);
      if (parts.length < 7) continue;

      const odo = parseInt(parts[0], 10);
      const date = parseRoadTripDate(parts[2]);
      
      const fuelAmount = parseFloat(parts[3]);
      const pricePerUnit = parseFloat(parts[5]);
      const cost = parseFloat(parts[6]);
      const locationName = parts[11] || null;
      const currency = parts[17] || null;
      const currencyRate = parts[18] ? parseFloat(parts[18]) : null;
      const latitude = parts[19] ? parseFloat(parts[19]) : null;
      const longitude = parts[20] ? parseFloat(parts[20]) : null;
      const externalId = parts[21] || null;
      const octane = parts[10] || "95"; // Default if missing

      if (!isNaN(odo) && date) {
        fuelRecords.push({
          odo,
          date,
          fuelAmount,
          pricePerUnit,
          cost,
          latitude,
          longitude,
          fuelType: octane.includes("98") ? "98E5" : "95E10",
          externalId,
          currency,
          currencyRate,
          locationName
        });
      }
    }
  }

  return fuelRecords;
}

/**
 * Robustly parses a RoadTrip date string into a padded ISO-like string.
 * Format: "2019-6-15 9:51" -> "2019-06-15T09:51:00"
 */
function parseRoadTripDate(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/"/g, "").trim();
  
  // Match YYYY-MM-DD or YYYY-M-D with optional time H:mm or HH:mm
  const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (!match) return null;

  const [_, y, m, d, h = "0", min = "0"] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min.padStart(2, '0')}:00`;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Checks if a fuel entry already exists in the current maintenance history.
 */
export function isDuplicate(entry: RoadTripFuelEntry, existing: any[]): boolean {
  return existing.some(record => {
    if (record.type !== 'fuel') return false;
    
    // Compare date (ignoring time if necessary, but RoadTrip has time)
    // Most existing records might only have date YYYY-MM-DD
    const recordDate = record.date.split('T')[0];
    const entryDate = entry.date.split('T')[0];
    
    if (recordDate !== entryDate) return false;
    
    // Compare fuel data
    return (
      Math.abs((record.fuelAmount || 0) - entry.fuelAmount) < 0.01 &&
      Math.abs((record.odo || 0) - entry.odo) < 1
    );
  });
}
