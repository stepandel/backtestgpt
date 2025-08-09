// @ts-nocheck
import Chat from "../components/Chat";
import Results from "../components/Results";

export default function Page() {
  return (
    <main className="container mx-auto max-w-5xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">BacktestGPT</h1>
        <p className="text-muted-foreground">
          Describe a strategy. We plan with official sources and backtest
          deterministically.
        </p>
      </header>
      <Chat />
      <Results />
    </main>
  );
}
