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
      const dateRaw = parts[2].replace(/"/g, ""); // "2019-6-15 9:51"
      
      // RoadTrip date format: "YYYY-M-D H:mm" -> ISO "YYYY-MM-DDTHH:mm:00"
      const dateParts = dateRaw.split(/[ -:]/);
      if (dateParts.length < 5) continue;
      
      const year = dateParts[0];
      const month = dateParts[1].padStart(2, '0');
      const day = dateParts[2].padStart(2, '0');
      const hour = dateParts[3].padStart(2, '0');
      const minute = dateParts[4].padStart(2, '0');
      
      const date = `${year}-${month}-${day}T${hour}:${minute}:00`;
      
      const fuelAmount = parseFloat(parts[3]);
      const pricePerUnit = parseFloat(parts[5]);
      const cost = parseFloat(parts[6]);
      const latitude = parts[19] ? parseFloat(parts[19]) : null;
      const longitude = parts[20] ? parseFloat(parts[20]) : null;
      const externalId = parts[21] || null;
      const octane = parts[10] || "95E10 Bleifrei 95"; // Default if missing

      if (!isNaN(odo) && date) {
        fuelRecords.push({
          odo,
          date,
          fuelAmount,
          pricePerUnit,
          cost,
          latitude,
          longitude,
          fuelType: octane.includes("98") ? "98E5 Super Plus" : "95E10 Bleifrei 95",
          externalId
        });
      }
    }
  }

  return fuelRecords;
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
