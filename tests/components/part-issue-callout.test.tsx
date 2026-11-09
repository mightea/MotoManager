import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PartIssueCallout, type IssueCandidate } from "~/components/part-issue-callout";
import type { PartIssueLink } from "~/types/parts";

const linked: PartIssueLink = {
  id: 3,
  motorcycleId: 7,
  motorcycleMake: "BMW",
  motorcycleModel: "R 80 GS",
  title: "Bremse quietscht",
  priority: "high",
  status: "new",
  date: "2026-10-01",
  isDone: false,
};

const candidates: IssueCandidate[] = [
  { id: 10, title: "Kette längen", priority: "medium", date: "2026-09-01", motorcycleId: 7, motorcycleLabel: "BMW R 80 GS", fits: true },
  { id: 11, title: "Blinker defekt", priority: "low", date: null, motorcycleId: 8, motorcycleLabel: "Yamaha XT", fits: false },
];

function renderCallout(props: Partial<Parameters<typeof PartIssueCallout>[0]> = {}) {
  const handlers = { onBook: vi.fn(), onLink: vi.fn(), onUnlink: vi.fn() };
  render(
    <MemoryRouter>
      <PartIssueCallout linkedIssues={[]} candidates={candidates} onHand={2} {...handlers} {...props} />
    </MemoryRouter>,
  );
  return handlers;
}

afterEach(cleanup);

describe("PartIssueCallout", () => {
  it("lists an open linked issue and books against it", () => {
    const { onBook, onUnlink } = renderCallout({ linkedIssues: [linked] });
    expect(screen.getByText("Passt zu offenem Mangel")).toBeTruthy();
    const link = screen.getByRole("link", { name: "BMW R 80 GS · Bremse quietscht" });
    expect(link.getAttribute("href")).toBe("/motorcycle/bmw-r-80-gs/7");
    expect(screen.getByText("Hoch · seit 01.10.2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Beim Mangel verbuchen" }));
    expect(onBook).toHaveBeenCalledWith(linked);
    fireEvent.click(screen.getByRole("button", { name: /Verknüpfung mit/ }));
    expect(onUnlink).toHaveBeenCalledWith(3);
  });

  it("hides done issues and offers the link action instead", () => {
    renderCallout({ linkedIssues: [{ ...linked, isDone: true, status: "done" }] });
    expect(screen.queryByText("Passt zu offenem Mangel")).toBeNull();
    expect(screen.getByRole("button", { name: /Mit Mangel verknüpfen/ })).toBeTruthy();
  });

  it("picks from fitting bikes, widening with alle anzeigen", () => {
    const { onLink } = renderCallout();
    fireEvent.click(screen.getByRole("button", { name: /Mit Mangel verknüpfen/ }));
    expect(screen.getByText("BMW R 80 GS · Kette längen")).toBeTruthy();
    expect(screen.queryByText("Yamaha XT · Blinker defekt")).toBeNull();
    fireEvent.click(screen.getByLabelText("alle anzeigen"));
    fireEvent.click(screen.getByText("Yamaha XT · Blinker defekt"));
    expect(onLink).toHaveBeenCalledWith(11);
  });
});
