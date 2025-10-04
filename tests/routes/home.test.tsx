import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import Home from "~/routes/home";

describe("Home route", () => {
  it("shows the empty state when no motorcycles are available", () => {
    render(
      <MemoryRouter>
        <Home
          {...({
            loaderData: {
              motorcycles: [],
              items: [],
            },
            matches: [],
            params: {},
          } as any)}
        />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: /noch keine motorräder/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/lege ein erstes motorrad an/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /dein erstes motorrad hinzufügen/i })
    ).toBeInTheDocument();
  });
});
