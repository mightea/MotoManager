import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MaintenanceForm } from "~/components/maintenance-form";
import { UmamiProvider } from "~/components/umami-provider";
import type { Location } from "~/types/db";

function location(id: number, name: string, type: Location["type"]): Location {
  return {
    id,
    name,
    type,
    latitude: null,
    longitude: null,
    userId: 1,
    createdAt: "2026-08-23T00:00:00Z",
    updatedAt: null,
  };
}

afterEach(cleanup);

describe("MaintenanceForm", () => {
  it("offers workshops for an explicit motorcycle location change", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <UmamiProvider>
              <MaintenanceForm
                motorcycleId={1}
                defaultOdo={59092}
                userLocations={[
                  location(1, "Garage Katunga", "storage"),
                  location(2, "Werkstatt Müller", "maintenanceShop"),
                  location(3, "Tankstelle Nord", "fuelStation"),
                ]}
                onCancel={vi.fn()}
              />
            </UmamiProvider>
          ),
          action: () => null,
        },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByLabelText("Typ"), { target: { value: "location" } });

    const select = screen.getByLabelText("Standort / Werkstatt");
    expect(select).toHaveTextContent("Garage Katunga");
    expect(select).toHaveTextContent("Werkstatt Müller");
    expect(select).not.toHaveTextContent("Tankstelle Nord");
  });
});
