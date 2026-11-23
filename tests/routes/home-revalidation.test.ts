import { createMemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { shouldRevalidate } from "~/routes/home";

async function startRouter(initialEntry = "/") {
  const loader = vi.fn(() => ({ ok: true }));
  const router = createMemoryRouter(
    [
      {
        id: "home",
        path: "/",
        loader,
        action: () => ({ success: true }),
        shouldRevalidate,
        Component: () => null,
      },
    ],
    { initialEntries: [initialEntry] },
  );
  await vi.waitFor(() => expect(router.state.initialized).toBe(true));
  loader.mockClear();
  return { router, loader };
}

describe("home shouldRevalidate", () => {
  it("reloads the garage after a bike is added", async () => {
    const { router, loader } = await startRouter();
    const formData = new FormData();
    formData.set("make", "BMW");
    await router.navigate("/", { formMethod: "post", formData });
    expect(loader).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it("reloads on an explicit revalidation", async () => {
    const { router, loader } = await startRouter("/?q=bmw");
    await router.revalidate();
    expect(loader).toHaveBeenCalledTimes(1);
    router.dispose();
  });
});
