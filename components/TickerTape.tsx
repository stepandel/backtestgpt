"use client";

import { useEffect, useState } from "react";

type TapeItem = { ticker: string; price: number; change: number };

function TapeChunk({
  items,
  hidden = false,
}: {
  items: TapeItem[];
  hidden?: boolean;
}) {
  return (
    <div
      className="flex items-center w-max whitespace-nowrap"
      aria-hidden={hidden}
    >
      {items.map((it, idx) => (
        <span
          key={`${hidden ? "h" : "v"}-${it.ticker}-${idx}`}
          className="px-6"
        >
          <span className="font-medium">{it.ticker}</span>{" "}
          <span>${it.price.toFixed(2)}</span>{" "}
          <span className={it.change >= 0 ? "text-green-500" : "text-red-500"}>
            {it.change >= 0 ? "+" : ""}
            {(it.change * 100).toFixed(2)}%
          </span>
        </span>
      ))}
    </div>
  );
}

export default function TickerTape() {
  const [items, setItems] = useState<TapeItem[]>([]);

  async function fetchQuotes(tickers: string[]) {
    if (!tickers.length) return;
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as TapeItem[];
      setItems(data);
    } catch {}
  }

  useEffect(() => {
    // Load from persisted backtest if available
    try {
      const saved = localStorage.getItem("backtest:data");
      if (saved) {
        const parsed = JSON.parse(saved);
        const tickers: string[] = Array.from(
          new Set((parsed?.plan || []).map((p: any) => p.ticker))
        );
        fetchQuotes(tickers);
      }
    } catch {}

    function handler(e: any) {
      const tickers: string[] = Array.from(
        new Set((e?.detail?.plan || []).map((p: any) => p.ticker))
      );
      fetchQuotes(tickers);
    }
    window.addEventListener("backtest:results", handler);
    return () => window.removeEventListener("backtest:results", handler);
  }, []);

  if (!items.length) {
    return (
      <div className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
        Waiting for tickers…
      </div>
    );
  }

  // Build a large repeating group so each half is identical and wide enough
  const REPS = 8;
  const group: TapeItem[] = Array.from({ length: REPS }).flatMap(() => items);

  return (
    <div className="relative py-2 px-3 text-xs overflow-hidden">
      <div className="flex w-max animate-[ticker_40s_linear_infinite] will-change-transform">
        <TapeChunk items={group} />
        <TapeChunk items={group} hidden />
      </div>
    </div>
  );
}
