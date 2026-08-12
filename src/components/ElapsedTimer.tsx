import { useEffect, useState } from "react";

export const formatElapsed = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

interface ElapsedTimerProps {
  /** ISO date when the order went to the kitchen */
  start: string;
  /** ISO date when the order was closed. When absent, the timer keeps running. */
  end?: string | null;
  className?: string;
}

/** Live timer from the moment the order reaches the kitchen until it is closed. */
export const ElapsedTimer = ({ start, end, className }: ElapsedTimerProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (end) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [end]);

  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : now;

  return <span className={className}>{formatElapsed(endMs - startMs)}</span>;
};
