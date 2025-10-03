import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "~/routes/home";

describe("Home route", () => {
  it("shows the empty state when no motorcycles are available", () => {
    render(
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
    );

    expect(
      screen.getByRole("heading", { name: /noch keine motorräder/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/füge dein erstes motorrad hinzu, um loszulegen/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /dein erstes motorrad hinzufügen/i })
    ).toBeInTheDocument();
  });
});
