"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export default function Chat() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("chat:messages");
      if (saved) {
        const parsed = JSON.parse(saved) as {
          role: "user" | "assistant";
          content: string;
        }[];
        setMessages(parsed);
        const lastAssistant = [...parsed]
          .reverse()
          .find((m) => m.role === "assistant");
        if (
          lastAssistant &&
          /ready to finalize plan/i.test(lastAssistant.content)
        )
          setReady(true);
      }
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!prompt.trim()) return;
    setLoading(true);
    const userMessage = { role: "user" as const, content: prompt };
    setMessages((prev: { role: "user" | "assistant"; content: string }[]) => {
      const next: { role: "user" | "assistant"; content: string }[] = [
        ...prev,
        userMessage,
      ];
      try {
        localStorage.setItem("chat:messages", JSON.stringify(next));
      } catch {}
      return next;
    });
    setPrompt("");
    try {
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      if (!chatRes.ok || !chatRes.body) throw new Error("Chat failed");
      const reader = chatRes.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      // create streaming assistant message placeholder
      let assistantIndex = -1;
      setMessages((prev: { role: "user" | "assistant"; content: string }[]) => {
        assistantIndex = prev.length;
        const next: { role: "user" | "assistant"; content: string }[] = [
          ...prev,
          { role: "assistant", content: "" },
        ];
        try {
          localStorage.setItem("chat:messages", JSON.stringify(next));
        } catch {}
        return next;
      });
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;
        const text = assistantText;
        setMessages(
          (prev: { role: "user" | "assistant"; content: string }[]) => {
            const next: { role: "user" | "assistant"; content: string }[] = [
              ...prev,
            ];
            // Ensure last message is assistant placeholder
            const idx = assistantIndex >= 0 ? assistantIndex : prev.length - 1;
            if (next[idx] && next[idx].role === "assistant") {
              next[idx] = { role: "assistant", content: text };
            }
            try {
              localStorage.setItem("chat:messages", JSON.stringify(next));
            } catch {}
            return next;
          }
        );
      }
      const isReady = /ready to finalize plan/i.test(assistantText);
      setReady(isReady);
      try {
        localStorage.setItem("chat:ready", JSON.stringify(isReady));
      } catch {}
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
      const transcript = messages[messages.length - 1].content;
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
      try {
        localStorage.setItem(
          "backtest:data",
          JSON.stringify({ plan, results })
        );
      } catch {}
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

  function onReset() {
    try {
      localStorage.removeItem("chat:messages");
      localStorage.removeItem("chat:ready");
      localStorage.removeItem("backtest:data");
      localStorage.removeItem("prices:cache");
    } catch {}
    setMessages([]);
    setPrompt("");
    setReady(false);
    const event = new CustomEvent("backtest:results", { detail: null });
    window.dispatchEvent(event);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 bg-gradient-to-b from-transparent via-zinc-900/20 to-zinc-900/40">
        {messages.length > 0 && (
          <div className="space-y-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-md px-3 py-2 ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        ul: ({ node, ...props }) => (
                          <ul
                            className="list-disc pl-5 my-2 space-y-1"
                            {...props}
                          />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol
                            className="list-decimal pl-5 my-2 space-y-1"
                            {...props}
                          />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2
                            className="text-xl font-semibold mt-3 mb-1"
                            {...props}
                          />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3
                            className="text-lg font-semibold mt-3 mb-1"
                            {...props}
                          />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="whitespace-pre-wrap" {...props} />
                        ),
                        code: ({ className, children, ...props }) => (
                          <code
                            className={`bg-black/30 rounded px-1 ${
                              className || ""
                            }`}
                            {...props}
                          >
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  ) : (
                    <>{m.content}</>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <form
        onSubmit={onSubmit}
        className="border-t p-3 grid grid-cols-12 gap-3 items-end"
      >
        <div className="col-span-12">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your strategy with explicit entry and exit rules..."
            className="min-h-[64px] md:min-h-[96px] max-h-60"
          />
        </div>
        <div className="col-span-12 md:col-span-7 text-xs text-muted-foreground">
          Tip: Ask for specific entry/exit criteria and cite official sources.
          When done, type "Ready to finalize plan".
        </div>
        <div className="col-span-12 md:col-span-5 flex items-center justify-end gap-2">
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
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={onReset}
          >
            Reset
          </Button>
        </div>
        {error && (
          <span className="col-span-12 text-sm text-destructive">{error}</span>
        )}
      </form>
    </div>
  );
}
