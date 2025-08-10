// @ts-nocheck
import Chat from "../components/Chat";
import Results from "../components/Results";
import { DollarSign, LineChart, RefreshCw } from "lucide-react";

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
        <div className="relative overflow-hidden rounded-md border bg-background/40">
          <div className="animate-[ticker_40s_linear_infinite] whitespace-nowrap py-2 px-3 text-xs text-muted-foreground">
            <span className="mx-6">
              S&P 500 rebalances drive index-add flows…
            </span>
            <span className="mx-6">
              Use official S&P DJI press releases for dates…
            </span>
            <span className="mx-6">
              Auction exits default to exchange closing cross…
            </span>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-12 gap-2 md:gap-3">
        <div className="col-span-12 md:col-span-4 rounded-md border h-[calc(100vh-200px)] overflow-hidden">
          <Chat />
        </div>
        <div className="col-span-12 md:col-span-8 rounded-md border p-2 md:p-3 h-[calc(100vh-200px)] overflow-auto">
          <Results />
        </div>
      </div>
    </main>
  );
}
