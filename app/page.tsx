// @ts-nocheck
import Shell from "../components/Shell";
import { DollarSign, LineChart, RefreshCw } from "lucide-react";
import TickerTape from "../components/TickerTape";

export default function Page() {
  return (
    <main className="mx-auto max-w-[1600px] px-2 md:px-4 space-y-4 md:space-y-3">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">BacktestGPT</h1>
              <p className="text-sm text-muted-foreground">
                Plan with official sources. Execute deterministically.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <LineChart className="h-4 w-4" /> Markets open 9:30–16:00 ET
          </div>
        </div>
        <div className="relative overflow-hidden rounded-md border bg-background/40 text-muted-foreground">
          <TickerTape />
        </div>
      </header>
      <Shell />
    </main>
  );
}
