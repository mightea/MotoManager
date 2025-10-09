import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import Home from "~/routes/home";
import { SettingsProvider } from "~/contexts/SettingsProvider";

describe("Home route", () => {
  it("shows the empty state when no motorcycles are available", () => {
    render(
      <MemoryRouter>
        <SettingsProvider
          settings={{
            currencies: [{ id: 1, code: "USD", label: "US Dollar" }],
            storageLocations: [],
            users: [],
          }}
        >
          <Home
            {...({
              loaderData: {
                motorcycles: [],
                items: [],
                stats: {
                  year: new Date().getFullYear(),
                  totalKmThisYear: 0,
                  totalKmOverall: 0,
                  totalActiveIssues: 0,
                  totalMaintenanceCostThisYear: 0,
                  veteranCount: 0,
                  topRider: null,
                },
              },
              matches: [],
              params: {},
            } as any)}
          />
        </SettingsProvider>
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: /noch keine motorräder/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /lege dein erstes motorrad an, um wartungen, dokumente und standorte im blick zu behalten\./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/lege jetzt los und füge dein erstes motorrad hinzu/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /dein erstes motorrad hinzufügen/i })
    ).toBeInTheDocument();
  });
});
