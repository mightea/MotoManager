import { useNavigation } from "react-router";
import { useEffect, useState } from "react";

export function LoadingIndicator() {
  const navigation = useNavigation();
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsHydrating(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const active = navigation.state !== "idle" || isHydrating;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      setProgress(0);
    } else {
      // When idle, complete the progress bar then hide it
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200); // slightly longer than the transition duration
      return () => clearTimeout(timer);
    }
  }, [active]);

  useEffect(() => {
    if (!visible || !active) return;

    // Indeterminate animation simulation
    // Quickly go to 20%, then slowly to 90%
    // If it finishes before active becomes false, it stays at 90%

    let animationFrameId: number;
    let start = performance.now();

    const animate = (time: number) => {
      const elapsed = time - start;

      // Simple curve
      // 0 to 30% in 200ms
      // 30% to 80% in 3000ms
      // 80% to 95% in 10000ms

      let nextProgress = 0;
      if (elapsed < 200) {
        nextProgress = (elapsed / 200) * 30;
      } else if (elapsed < 3200) {
        nextProgress = 30 + ((elapsed - 200) / 3000) * 50;
      } else {
        nextProgress = 80 + ((elapsed - 3200) / 10000) * 15;
      }

      if (nextProgress > 95) nextProgress = 95;

      setProgress(nextProgress);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [visible, active]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-1 bg-primary transition-all duration-200 ease-out"
      style={{ width: `${progress}%`, opacity: active || progress === 100 ? 1 : 0 }}
    />
  );
}
