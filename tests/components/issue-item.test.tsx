import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { IssueItem } from "~/components/issue-item";
import type { Issue } from "~/types/db";

const baseIssue: Issue = {
  id: 1,
  motorcycleId: 2,
  odo: 1200,
  title: "Bremse quietscht",
  description: null,
  descriptionMarkup: null,
  priority: "high",
  status: "new",
  date: "2026-10-01",
};

const formatter = new Intl.DateTimeFormat("de-CH");

function renderItem(issue: Issue) {
  return render(
    <MemoryRouter>
      <IssueItem issue={issue} dateFormatter={formatter} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("IssueItem linked parts", () => {
  it("shows nothing extra when the backend sends no linkedParts", () => {
    renderItem(baseIssue);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links a part in stock", () => {
    renderItem({
      ...baseIssue,
      linkedParts: [{ id: 5, name: "Bremsbeläge", partNumber: "34 11", onHand: 2 }],
    });
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/parts/5");
    expect(link.textContent).toBe("Teil auf Lager: Bremsbeläge · 2 Stk →");
  });

  it("marks a linked part without stock", () => {
    renderItem({
      ...baseIssue,
      linkedParts: [{ id: 6, name: "Dichtung", partNumber: "11 12", onHand: 0 }],
    });
    expect(screen.getByRole("link").textContent).toBe("Teil verknüpft: Dichtung · nicht auf Lager");
  });
});
