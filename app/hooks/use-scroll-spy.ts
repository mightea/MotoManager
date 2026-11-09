import { useEffect, useState } from "react";

/**
 * Which of the given section ids is "current" for a side menu: the last
 * section whose top has passed the upper third of the viewport. At the very
 * bottom of the page the last section on screen wins, so short final
 * sections can still be highlighted.
 */
export function useScrollSpy(ids: string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  // Stable key so the listener isn't rebuilt on every render.
  const key = ids.join(" ");

  useEffect(() => {
    const sectionIds = key.split(" ").filter(Boolean);
    let frame = 0;

    const update = () => {
      frame = 0;
      const elements = sectionIds
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el != null);
      if (elements.length === 0) return;

      const viewport = window.innerHeight;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const threshold = atBottom ? viewport : viewport * 0.33;

      let current = elements[0].id;
      for (const el of elements) {
        if (el.getBoundingClientRect().top <= threshold) current = el.id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);

  return active;
}
