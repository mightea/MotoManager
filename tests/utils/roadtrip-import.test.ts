import { describe, it, expect } from "vitest";
import { parseRoadTripCsv, isDuplicate, type RoadTripFuelEntry } from "~/utils/roadtrip-import";

describe("RoadTrip Import Utility", () => {
  describe("parseRoadTripCsv", () => {
    it("should parse a valid RoadTrip CSV with multiple sections", () => {
      const csvContent = `
ROAD TRIP CSV ",."
Version,Language
1900,en

FUEL RECORDS
Odometer (km),Trip Distance,Date,Fill Amount,Fill Units,Price per Unit,Total Price,Partial Fill,L/100 km,Note,Octane,Location,Payment,Conditions,Reset,Categories,Flags,Currency Code,Currency Rate,Latitude,Longitude,ID,Trip Comp Fuel Economy,Trip Comp Avg. Speed,Trip Comp Temperature,Trip Comp Drive Time,Tank Number
77311,,"2019-6-15 9:51",10.4,L,1.66,17.26,,,,,,,,Reset,,9,,1,47.041214,9.432396,2,,,,,0
77555,244,"2019-7-6 15:20",18,L,1.67,30.06,,7.377,,,,,,,,0,,1,47.367582,8.494134,4,,,,,0

MAINTENANCE RECORDS
Description,Date,Odometer (km),Cost,Note,Location,Type,Subtype,Payment,Categories,Reminder Interval,Reminder Distance,Flags,Currency Code,Currency Rate,Latitude,Longitude,ID,Notification Interval,Notification Distance
"Sitzbankbezug","2019-6-16",77400,92,,,Expense,,,,,,0,,1,,,5,,
      `;

      const result = parseRoadTripCsv(csvContent);

      expect(result).toHaveLength(2);
      
      // First entry
      expect(result[0]).toEqual({
        odo: 77311,
        date: "2019-06-15T09:51:00",
        fuelAmount: 10.4,
        pricePerUnit: 1.66,
        cost: 17.26,
        latitude: 47.041214,
        longitude: 9.432396,
        fuelType: "95E10 Bleifrei 95",
        externalId: "2",
        currency: null,
        currencyRate: 1,
        locationName: null
      });

      // Second entry (checking date padding)
      expect(result[1].date).toBe("2019-07-06T15:20:00");
      expect(result[1].fuelAmount).toBe(18);
    });

    it("should parse currency and conversion rate correctly", () => {
      const csvContent = `FUEL RECORDS
Odometer (km),Trip Distance,Date,Fill Amount,Fill Units,Price per Unit,Total Price,Partial Fill,L/100 km,Note,Octane,Location,Payment,Conditions,Reset,Categories,Flags,Currency Code,Currency Rate,Latitude,Longitude,ID,Trip Comp Fuel Economy,Trip Comp Avg. Speed,Trip Comp Temperature,Trip Comp Drive Time,Tank Number
3982,273,"2017-7-18 18:43",14.6,L,1.304,19.04,,5.348,,,,,,,,0,EUR,0.832141,48.026022,10.327992,32,,,,,0`;
      
      const result = parseRoadTripCsv(csvContent);
      expect(result[0]).toMatchObject({
        currency: "EUR",
        currencyRate: 0.832141,
        cost: 19.04
      });
    });

    it("should parse location name correctly", () => {
      const csvContent = `FUEL RECORDS
Odometer (km),Trip Distance,Date,Fill Amount,Fill Units,Price per Unit,Total Price,Partial Fill,L/100 km,Note,Octane,Location,Payment,Conditions,Reset,Categories,Flags,Currency Code,Currency Rate,Latitude,Longitude,ID,Trip Comp Fuel Economy,Trip Comp Avg. Speed,Trip Comp Temperature,Trip Comp Drive Time,Tank Number
2239,247,"2017-5-6 14:21",13.28,L,1.49,19.79,,5.3765,,,"Stiefenhofer Motos",,,,,0,,1,47.381289,8.531055,18,,,,,0`;
      
      const result = parseRoadTripCsv(csvContent);
      expect(result[0].locationName).toBe("Stiefenhofer Motos");
    });

    it("should handle single digit months and days correctly", () => {
      const csvLine = '77311,,"2019-1-5 9:5",10.4,L,1.66,17.26,,,,,,,,Reset,,9,,1,47.041214,9.432396,2,,,,,0';
      const csvContent = `FUEL RECORDS
Odometer (km),Trip Distance,Date,...
${csvLine}`;
      
      const result = parseRoadTripCsv(csvContent);
      expect(result[0].date).toBe("2019-01-05T09:05:00");
    });

    it("should detect fuel type based on octane", () => {
      const csvContent = `FUEL RECORDS
Odometer (km),Trip Distance,Date,Fill Amount,Fill Units,Price per Unit,Total Price,Partial Fill,L/100 km,Note,Octane,Location,Payment,Conditions,Reset,Categories,Flags,Currency Code,Currency Rate,Latitude,Longitude,ID,Trip Comp Fuel Economy,Trip Comp Avg. Speed,Trip Comp Temperature,Trip Comp Drive Time,Tank Number
1000,,"2020-01-01 12:00",10,L,1.5,15,,,,98,,,,,,,,1,47,8,1,,,,,0`;
      
      const result = parseRoadTripCsv(csvContent);
      expect(result[0].fuelType).toBe("98E5 Super Plus");
    });

    it("should return an empty array if no FUEL RECORDS section is found", () => {
      const csvContent = `MAINTENANCE RECORDS
...`;
      const result = parseRoadTripCsv(csvContent);
      expect(result).toHaveLength(0);
    });
  });

  describe("isDuplicate", () => {
    const entry: RoadTripFuelEntry = {
      odo: 5000,
      date: "2025-05-01T10:00:00",
      fuelAmount: 15.5,
      pricePerUnit: 1.8,
      cost: 27.9,
      latitude: null,
      longitude: null,
      fuelType: "95E10 Bleifrei 95",
      externalId: "1",
      currency: null,
      currencyRate: null,
      locationName: null
    };

    it("should return true for an exact match", () => {
      const existing = [
        { type: "fuel", date: "2025-05-01", fuelAmount: 15.5, odo: 5000 }
      ];
      expect(isDuplicate(entry, existing)).toBe(true);
    });

    it("should return true for a close match (floating point / slight odo diff)", () => {
      const existing = [
        { type: "fuel", date: "2025-05-01", fuelAmount: 15.501, odo: 5000.4 }
      ];
      expect(isDuplicate(entry, existing)).toBe(true);
    });

    it("should return false if dates differ", () => {
      const existing = [
        { type: "fuel", date: "2025-05-02", fuelAmount: 15.5, odo: 5000 }
      ];
      expect(isDuplicate(entry, existing)).toBe(false);
    });

    it("should return false if amount differs significantly", () => {
      const existing = [
        { type: "fuel", date: "2025-05-01", fuelAmount: 10.5, odo: 5000 }
      ];
      expect(isDuplicate(entry, existing)).toBe(false);
    });

    it("should return false if odometer differs significantly", () => {
      const existing = [
        { type: "fuel", date: "2025-05-01", fuelAmount: 15.5, odo: 5100 }
      ];
      expect(isDuplicate(entry, existing)).toBe(false);
    });

    it("should ignore non-fuel records", () => {
      const existing = [
        { type: "service", date: "2025-05-01", odo: 5000 }
      ];
      expect(isDuplicate(entry, existing)).toBe(false);
    });
  });
});
