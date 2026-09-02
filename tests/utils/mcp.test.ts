import { describe, expect, it } from "vitest";
import {
  buildClaudeMcpAddCommand,
  describeExpiry,
  formatAuditArguments,
  formatRelativeTime,
  isExpired,
  truncate,
} from "~/utils/mcp";

describe("buildClaudeMcpAddCommand", () => {
  it("builds the Claude Code snippet with a placeholder by default", () => {
    expect(buildClaudeMcpAddCommand("https://moto.example.com/mcp")).toBe(
      'claude mcp add --transport http motomanager "https://moto.example.com/mcp" --header "Authorization: Bearer <TOKEN>"',
    );
  });

  it("fills in the real token", () => {
    const token = `mm_${"a".repeat(48)}`;
    expect(buildClaudeMcpAddCommand("http://localhost:3001/mcp", token)).toContain(
      `--header "Authorization: Bearer ${token}"`,
    );
  });

  it("escapes shell-significant characters inside quoted values", () => {
    expect(buildClaudeMcpAddCommand('http://x/mcp"$`', "t")).toBe(
      'claude mcp add --transport http motomanager "http://x/mcp\\"\\$\\`" --header "Authorization: Bearer t"',
    );
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-09-02T12:00:00Z");

  it("returns Nie for null", () => {
    expect(formatRelativeTime(null, now)).toBe("Nie");
  });

  it("uses coarse German buckets", () => {
    expect(formatRelativeTime("2026-09-02T11:59:30Z", now)).toBe("gerade eben");
    expect(formatRelativeTime("2026-09-02T11:55:00Z", now)).toBe("vor 5 Min.");
    expect(formatRelativeTime("2026-09-02T09:00:00Z", now)).toBe("vor 3 Std.");
    expect(formatRelativeTime("2026-09-01T11:00:00Z", now)).toBe("vor 1 Tag");
    expect(formatRelativeTime("2026-08-31T11:00:00Z", now)).toBe("vor 2 Tagen");
  });

  it("falls back to an absolute date after a month", () => {
    expect(formatRelativeTime("2026-06-01T11:00:00Z", now)).not.toMatch(/^vor /);
  });

  it("returns a dash for garbage", () => {
    expect(formatRelativeTime("not a date", now)).toBe("–");
  });
});

describe("describeExpiry / isExpired", () => {
  const now = Date.parse("2026-09-02T12:00:00Z");

  it("reports never-expiring tokens as Unbegrenzt", () => {
    expect(describeExpiry({ expiresAt: null }, now)).toBe("Unbegrenzt");
    expect(isExpired({ expiresAt: null }, now)).toBe(false);
  });

  it("distinguishes future and past expiry", () => {
    expect(describeExpiry({ expiresAt: "2026-12-01T00:00:00Z" }, now)).toMatch(/^Läuft ab am /);
    expect(isExpired({ expiresAt: "2026-12-01T00:00:00Z" }, now)).toBe(false);
    expect(describeExpiry({ expiresAt: "2026-01-01T00:00:00Z" }, now)).toMatch(/^Abgelaufen am /);
    expect(isExpired({ expiresAt: "2026-01-01T00:00:00Z" }, now)).toBe(true);
  });
});

describe("formatAuditArguments", () => {
  it("pretty-prints JSON", () => {
    expect(formatAuditArguments('{"motorcycleId":1}')).toBe('{\n  "motorcycleId": 1\n}');
  });

  it("passes non-JSON through and null as null", () => {
    expect(formatAuditArguments("plain")).toBe("plain");
    expect(formatAuditArguments(null)).toBeNull();
  });
});

describe("truncate", () => {
  it("shortens long strings with an ellipsis", () => {
    expect(truncate("a".repeat(100), 10)).toBe(`${"a".repeat(9)}…`);
    expect(truncate("short", 10)).toBe("short");
    expect(truncate(null)).toBe("–");
  });
});
