import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StorageLocationForm } from "~/components/storage-location-form";
import type { Location } from "~/types/db";
import type { StorageLocation } from "~/types/parts";

const storageLocations: StorageLocation[] = [
  {
    id: 7,
    userId: 1,
    name: "Regal A",
    parentId: null,
    locationId: null,
    createdAt: "2026-08-23T00:00:00Z",
    clientId: null,
    updatedAt: null,
    deletedAt: null,
  },
];

function place(id: number, name: string, type: Location["type"]): Location {
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

function renderForm() {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <StorageLocationForm
            locations={storageLocations}
            places={[
              place(11, "Garage Zuhause", "storage"),
              place(12, "Werkstatt Müller", "maintenanceShop"),
              place(13, "Tankstelle Nord", "fuelStation"),
            ]}
            onClose={vi.fn()}
          />
        ),
        action: () => null,
      },
    ],
    { initialEntries: ["/"] },
  );

  render(<RouterProvider router={router} />);
}

afterEach(cleanup);

describe("StorageLocationForm", () => {
  it("offers garages and workshops as physical locations", () => {
    renderForm();

    const placeSelect = screen.getByLabelText("Standort (Werkstatt / Garage)");
    expect(placeSelect).toHaveTextContent("Garage Zuhause");
    expect(placeSelect).toHaveTextContent("Werkstatt Müller");
    expect(placeSelect).not.toHaveTextContent("Tankstelle Nord");
  });

  it("offers storage parents and hides the physical-place selector when one is chosen", () => {
    renderForm();

    const parentSelect = screen.getByLabelText("Übergeordneter Lagerort");
    expect(parentSelect).toHaveTextContent("Regal A");

    fireEvent.change(parentSelect, { target: { value: "7" } });

    expect(screen.queryByLabelText("Standort (Werkstatt / Garage)")).not.toBeInTheDocument();
  });
});
