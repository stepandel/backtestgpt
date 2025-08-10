"use client";

import { useEffect, useState } from "react";
import ResultsView from "@/components/ResultsView";
import { MOCK_EQUITY_CURVE } from "@/lib/mockCurve";

export default function Results() {
  const [data, setData] = useState<any | null>(null);

  function genMockCurve(finalRet: number, points = 240) {
    const out: { t: string; v: number }[] = [];
    const sign = finalRet >= 0 ? 1 : -1;
    const mag = Math.max(0.05, Math.abs(finalRet));
    // Shape parameters per requested behavior
    const earlyDipAmp = Math.min(0.35, 0.4 * mag + 0.06); // sharp drop right after announcement
    const midDipAmp = Math.min(0.22, 0.25 * mag + 0.04); // drop 2-3 days pre-rebalance
    const lateSurgeAmp = Math.min(0.35, 0.5 * mag + 0.08); // sharpest rise last day
    const trendAmp = mag; // underlying uptrend magnitude

    const ease = (x: number) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      // Upward drift toward final
      const trend = trendAmp * ease(t);
      // Very early sharp dip centered near 0.06
      const earlyDip =
        -earlyDipAmp * Math.exp(-Math.pow((t - 0.06) / 0.035, 2));
      // Pre-rebalance dip centered near 0.88
      const preRebDip = -midDipAmp * Math.exp(-Math.pow((t - 0.88) / 0.05, 2));
      // Last day surge: narrow positive Gaussian near 0.98 + end-power
      const endSpike =
        lateSurgeAmp * Math.exp(-Math.pow((t - 0.985) / 0.018, 2));
      const endPower = lateSurgeAmp * Math.pow(Math.max(0, t - 0.95) / 0.05, 3);
      // Subtle oscillation for texture
      const wave = 0.01 * Math.sin(10 * Math.PI * t);
      let path =
        trend +
        earlyDip +
        preRebDip +
        Math.max(endSpike, 0) +
        Math.max(endPower, 0) +
        wave;
      // Scale by sign
      const ret = sign * path;
      out.push({ t: String(i), v: 1 + ret });
    }
    // Force exact endpoints, keep shape, and prevent last-segment drops
    out[0].v = 1;
    const endV = 1 + finalRet;
    const pivot = Math.max(1, Math.floor(0.95 * (points - 1)));
    // Monotonic non-decreasing over the last 5%
    for (let i = pivot + 1; i < points; i++) {
      out[i].v = Math.max(out[i].v, out[i - 1].v);
    }
    // Nudge last segment up to endV without flattening details
    const currentEnd = out[points - 1].v;
    if (currentEnd !== endV) {
      const delta = endV - currentEnd;
      for (let i = pivot; i < points; i++) {
        const tt = (i - pivot) / (points - 1 - pivot || 1);
        out[i].v += delta * tt;
      }
      out[points - 1].v = endV;
    }
    return out;
  }

  useEffect(() => {
    // Restore persisted backtest
    try {
      const saved = localStorage.getItem("backtest:data");
      if (saved) {
        setData(JSON.parse(saved));
      }
    } catch {}
    function handler(e: any) {
      setData(e.detail);
      try {
        localStorage.setItem("backtest:data", JSON.stringify(e.detail));
        // Cache prices per ticker for future sessions
        const priceCacheKey = "prices:cache";
        const cache = JSON.parse(localStorage.getItem(priceCacheKey) || "{}");
        const per = e?.detail?.results?.perTicker || [];
        for (const r of per) {
          if (!cache[r.ticker]) {
            cache[r.ticker] = { lastUpdated: Date.now() };
          }
        }
        localStorage.setItem(priceCacheKey, JSON.stringify(cache));
      } catch {}
    }
    window.addEventListener("backtest:results", handler);
    return () => window.removeEventListener("backtest:results", handler);
  }, []);

  if (!data) return null;

  const { plan, results } = data;
  // Replace curve with constant mock data for demo; everything else remains real
  const demoResults = { ...results, equityCurve: MOCK_EQUITY_CURVE };

  return (
    <div className="space-y-6">
      <ResultsView plan={plan} results={demoResults} />
    </div>
  );
}
