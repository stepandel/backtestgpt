// @ts-nocheck
import Chat from "../components/Chat";
import Results from "../components/Results";

export default function Page() {
  return (
    <main className="container mx-auto max-w-7xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">BacktestGPT</h1>
        <p className="text-muted-foreground">
          Describe a strategy. We plan with official sources and backtest
          deterministically.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-md border h-[calc(100vh-200px)] overflow-hidden">
          <Chat />
        </div>
        <div className="rounded-md border p-4 h-[calc(100vh-200px)] overflow-auto">
          <Results />
        </div>
      </div>
    </main>
  );
}
