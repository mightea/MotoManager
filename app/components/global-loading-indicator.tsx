import { useEffect, useMemo, useRef, useState } from "react";
import { useFetchers, useNavigation, useRevalidator } from "react-router";

const HIDE_DELAY_MS = 120;

export function GlobalLoadingIndicator() {
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const revalidator = useRevalidator();
  const [isVisible, setIsVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isBusy = useMemo(() => {
    if (navigation.state !== "idle") {
      return true;
    }

    if (revalidator.state === "loading") {
      return true;
    }

    return fetchers.some((fetcher) => fetcher.state !== "idle");
  }, [fetchers, navigation.state, revalidator.state]);

  useEffect(() => {
    if (isBusy) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setIsVisible(true);
      return;
    }

    if (isVisible) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        hideTimeoutRef.current = null;
      }, HIDE_DELAY_MS);
    }
  }, [isBusy, isVisible]);

  useEffect(
    () => () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    },
    [],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="mx-auto h-1 w-full max-w-6xl overflow-hidden rounded-b-full bg-primary/20">
        <div className="h-full w-full origin-left animate-global-loading bg-primary" />
      </div>
    </div>
  );
}
