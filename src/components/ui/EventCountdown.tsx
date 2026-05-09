"use client";

import { useEffect, useState } from "react";

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
};

type EventCountdownProps = {
  targetDate: string;
};

function getCountdownParts(targetDate: string): CountdownParts | null {
  const targetTime = new Date(targetDate).getTime();
  const diff = targetTime - Date.now();

  if (!Number.isFinite(targetTime) || diff <= 0) {
    return null;
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

export default function EventCountdown({ targetDate }: EventCountdownProps) {
  const [parts, setParts] = useState<CountdownParts | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    function updateCountdown() {
      setParts(getCountdownParts(targetDate));
      setIsReady(true);
    }

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 60000);

    return () => window.clearInterval(interval);
  }, [targetDate]);

  if (!isReady || !parts) {
    return null;
  }

  return (
    <div className="premium-surface rounded-[26px] p-5">
      <p className="kicker">Cuenta regresiva</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Días", parts.days],
          ["Horas", parts.hours],
          ["Min", parts.minutes],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-[#f6f1e8] px-3 py-4 text-center">
            <p className="font-display text-3xl font-extrabold text-[var(--ivbcc-navy)]">
              {value}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
