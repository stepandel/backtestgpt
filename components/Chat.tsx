"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function Chat() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [ready, setReady] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: prompt }],
        }),
      });
      if (!chatRes.ok) throw new Error("Chat failed");
      const data = await chatRes.json();
      const assistant = data.content as string;
      const nextMsgs: { role: "user" | "assistant"; content: string }[] = [
        ...messages,
        { role: "user", content: prompt },
        { role: "assistant", content: assistant },
      ];
      setMessages(nextMsgs);
      setReady(/ready to finalize plan/i.test(assistant));
      setPrompt("");
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onFinalize() {
    if (!messages.length) return;
    setLoading(true);
    setError(null);
    try {
      const transcript = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n\n");
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!planRes.ok) throw new Error("Structuring failed");
      const plan = await planRes.json();
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
    } catch (e: any) {
      setError(e?.message || "Unknown error");
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
          {loading ? "Thinking…" : "Send"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading || !ready}
          onClick={onFinalize}
        >
          {ready ? "Finalize Plan" : "Continue Chat"}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
      {messages.length > 0 && (
        <div className="mt-4 space-y-2 text-sm">
          {messages.map((m, i) => (
            <div key={i} className="whitespace-pre-wrap">
              <span className="font-medium">{m.role}:</span> {m.content}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
