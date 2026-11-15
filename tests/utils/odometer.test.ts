import { describe, expect, it } from "vitest";
import { odometerOffsetAt, toInstrumentReading, toTotalOdometer, todayISO } from "~/utils/odometer";

const swap = { date: "2018-11-22", readingBefore: 70000, readingAfter: 7000 };
const rollover = { date: "2010-05-01", readingBefore: 99999, readingAfter: 0 };

describe("odometerOffsetAt", () => {
  it("is zero without changes or without a date", () => {
    expect(odometerOffsetAt(undefined, "2026-11-15")).toBe(0);
    expect(odometerOffsetAt([], "2026-11-15")).toBe(0);
    expect(odometerOffsetAt([swap], null)).toBe(0);
  });

  it("counts changes dated on or before the day", () => {
    expect(odometerOffsetAt([swap], "2018-11-21")).toBe(0);
    expect(odometerOffsetAt([swap], "2018-11-22")).toBe(63000);
    expect(odometerOffsetAt([swap], "2026-11-15T08:30:00Z")).toBe(63000);
  });

  it("adds up several changes", () => {
    expect(odometerOffsetAt([rollover, swap], "2012-01-01")).toBe(99999);
    expect(odometerOffsetAt([rollover, swap], "2020-01-01")).toBe(162999);
  });
});

describe("conversion", () => {
  it("turns a stored total into the instrument reading and back", () => {
    expect(toInstrumentReading(71402, [swap], "2023-02-02")).toBe(8402);
    expect(toTotalOdometer(8560, [swap], "2026-11-15")).toBe(71560);
  });

  it("leaves values before the change untouched", () => {
    expect(toInstrumentReading(68420, [swap], "2007-03-15")).toBe(68420);
    expect(toTotalOdometer(68420, [swap], "2007-03-15")).toBe(68420);
  });
});

describe("todayISO", () => {
  it("formats the local day", () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
