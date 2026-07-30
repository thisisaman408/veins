import { useEffect, useRef, useState } from "react";

/**
 * Client-side countdown timer.
 * @param {number} seconds   — total seconds to count down from
 * @param {Function} onExpire — called exactly once when timer reaches 0
 * @returns {{ remaining: number, pct: number, urgent: boolean }}
 */
export function useCountdown(seconds, onExpire) {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef  = useRef(false);
  const startRef  = useRef(Date.now());
  const totalRef  = useRef(seconds);

  useEffect(() => {
    firedRef.current  = false;
    startRef.current  = Date.now();
    totalRef.current  = seconds;
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
      return;
    }

    const id = setTimeout(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setRemaining(Math.max(0, totalRef.current - elapsed));
    }, 500);

    return () => clearTimeout(id);
  }, [remaining, onExpire]);

  const pct    = remaining / totalRef.current;       // 1.0 → 0.0
  const urgent = remaining <= 20 && remaining > 0;   // last 20 seconds

  return { remaining, pct, urgent };
}
