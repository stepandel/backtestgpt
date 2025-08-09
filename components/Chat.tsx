"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function Chat() {
  const [prompt, setPrompt] = useState(
    "Buy a stock at the official S&P 500 addition announcement and sell it at the closing cross on the day it is added to ETFs tracking the index."
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!planRes.ok) throw new Error("Planner failed");
      const plan = await planRes.json();

      console.log("plan", plan);

      const runRes = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!runRes.ok) throw new Error("Backtest failed");
      const results = await runRes.json();
      const event = new CustomEvent("backtest:results", {
        detail: { plan, results },
      });
      window.dispatchEvent(event);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your strategy with explicit entry and exit rules..."
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Planning + Backtesting…" : "Run Backtest"}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}
