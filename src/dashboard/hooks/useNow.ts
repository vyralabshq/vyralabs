import { useEffect, useState } from "react";

/** Ticking clock. Re-renders on an interval so age/freshness readouts stay current.
 *  This is the only place the dashboard reads the wall clock; parseSnapshot takes it
 *  as an argument and stays pure. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
