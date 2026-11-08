import { describe, expect, it } from "vitest";
import { appConnectLink } from "~/utils/app-connect";

describe("appConnectLink", () => {
  it("encodes server and username", () => {
    expect(appConnectLink("https://api.example.com/", "marc")).toBe(
      "motomanager://connect?server=https%3A%2F%2Fapi.example.com&user=marc",
    );
  });

  it("leaves out an empty username", () => {
    expect(appConnectLink("http://localhost:3001", "")).toBe(
      "motomanager://connect?server=http%3A%2F%2Flocalhost%3A3001",
    );
  });

  it("resolves a relative backend URL against the page origin", () => {
    expect(appConnectLink("/api-proxy", "marc", "https://moto.example.com")).toBe(
      "motomanager://connect?server=https%3A%2F%2Fmoto.example.com%2Fapi-proxy&user=marc",
    );
  });
});
