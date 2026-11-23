import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { MotorcycleCommandBar } from "~/components/motorcycle-command-bar";

const bikes = [
  { id: 1, make: "BMW", model: "R 1250 GS", status: "active" },
  { id: 2, make: "Yamaha", model: "Ténéré 700", status: "sold" },
];

function CurrentUrl() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="url">{`${pathname}${search}${hash}`}</output>;
}

function renderBar(extra?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <MotorcycleCommandBar bikes={bikes} />
      <CurrentUrl />
      {extra}
    </MemoryRouter>,
  );
}

const pressK = () => fireEvent.keyDown(document, { key: "k", metaKey: true });
const combobox = () => screen.getByRole("combobox", { hidden: true });
const selectedOption = () =>
  screen.getAllByRole("option", { hidden: true }).find((o) => o.getAttribute("aria-selected") === "true");

beforeAll(() => {
  // jsdom has no modal dialog support.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(cleanup);

describe("MotorcycleCommandBar", () => {
  it("opens with Cmd+K and lists bikes, tagging sold ones", () => {
    renderBar();
    pressK();
    expect(screen.getAllByRole("option", { hidden: true })).toHaveLength(2);
    expect(screen.getByText("Verkauft")).toBeTruthy();
  });

  it("does not open over another dialog", () => {
    renderBar(<dialog open aria-label="Formular" />);
    pressK();
    expect(screen.queryAllByRole("option", { hidden: true })).toHaveLength(0);
  });

  it("moves through results with the arrow keys and wraps", () => {
    renderBar();
    pressK();
    expect(selectedOption()?.textContent).toContain("BMW");
    fireEvent.keyDown(combobox(), { key: "ArrowDown" });
    expect(selectedOption()?.textContent).toContain("Yamaha");
    fireEvent.keyDown(combobox(), { key: "ArrowDown" });
    expect(selectedOption()?.textContent).toContain("BMW");
    fireEvent.keyDown(combobox(), { key: "ArrowUp" });
    expect(selectedOption()?.textContent).toContain("Yamaha");
  });

  it("drills into a bike and goes back with Backspace", () => {
    renderBar();
    pressK();
    fireEvent.keyDown(combobox(), { key: "Enter" });
    expect(screen.getAllByRole("option", { hidden: true }).length).toBeGreaterThan(2);
    expect(screen.getByText("Fahrzeug bearbeiten")).toBeTruthy();
    fireEvent.keyDown(combobox(), { key: "Backspace" });
    expect(screen.getAllByRole("option", { hidden: true })).toHaveLength(2);
  });

  it("navigates to a target found by a combined query", () => {
    renderBar();
    pressK();
    fireEvent.change(combobox(), { target: { value: "gs reifendruck" } });
    fireEvent.keyDown(combobox(), { key: "Enter" });
    expect(screen.getByTestId("url").textContent).toBe(
      "/motorcycle/bmw-r-1250-gs/1/torque-specs#pressure-heading",
    );
  });
});
