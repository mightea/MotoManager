import { useNavigation } from "react-router";
import { useEffect, useRef, useState } from "react";

export function LoadingIndicator() {
  const navigation = useNavigation();
  const [isHydrating, setIsHydrating] = useState(true);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsHydrating(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const active = navigation.state !== "idle" || isHydrating;

  useEffect(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (active) {
      setVisible(true);
      setWidth(0);
      // Double rAF ensures width:0 is painted before the CSS transition to 85% starts
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setWidth(85));
      });
    } else {
      setWidth(100);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 250);
    }

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-1 bg-primary"
      style={{
        width: `${width}%`,
        transition:
          width <= 0
            ? "none"
            : width === 100
              ? "width 150ms ease-out"
              : "width 3s ease-out",
      }}
    />
  );
}
