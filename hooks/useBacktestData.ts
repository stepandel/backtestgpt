import { useEffect, useState } from "react";
import { safeLocalStorage } from "@/lib/storage";
import { StreamingData } from "@/types";

export function useBacktestData() {
  const [data, setData] = useState<StreamingData | null>(null);

  useEffect(() => {
    const saved = safeLocalStorage.getItem<StreamingData>("backtest:data");
    if (saved) {
      setData(saved);
    }

    function handleBacktestResults(e: CustomEvent) {
      const eventData = e.detail;
      setData(eventData);
      
      if (eventData) {
        safeLocalStorage.setItem("backtest:data", eventData);
        
        const cache = safeLocalStorage.getItem<Record<string, any>>("prices:cache") || {};
        const perTicker = eventData?.results?.perTicker || [];
        
        for (const ticker of perTicker) {
          if (!cache[ticker.ticker]) {
            cache[ticker.ticker] = { lastUpdated: Date.now() };
          }
        }
        
        safeLocalStorage.setItem("prices:cache", cache);
      }
    }

    window.addEventListener("backtest:results", handleBacktestResults as EventListener);
    return () => window.removeEventListener("backtest:results", handleBacktestResults as EventListener);
  }, []);

  return data;
}