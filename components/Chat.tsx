"use client";

import { useEffect, useRef, useState } from "react";
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
  const [reasoning, setReasoning] = useState("");
  const [reasoningActive, setReasoningActive] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchStatus, setSearchStatus] = useState<
    "in_progress" | "searching" | "completed" | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchClearTimeoutRef = useRef<number | null>(null);

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
      let buffer = "";
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
        buffer += decoder.decode(value, { stream: true });
        // Process buffer for markers and normal text
        // Supported tokens:
        // - Reasoning: [[R]]<delta>, [[R:BEGIN]], [[R:END]]
        // - Search: [[S:BEGIN]], [[S:END]], [[S:QUERY]]<query>,
        //           [[S:STATUS:in_progress|searching|completed]]
        // Loop until no markers remain
        // Helper to update assistant message text
        const pushAssistant = (text: string) => {
          setMessages(
            (prev: { role: "user" | "assistant"; content: string }[]) => {
              const next: { role: "user" | "assistant"; content: string }[] = [
                ...prev,
              ];
              const idx =
                assistantIndex >= 0 ? assistantIndex : prev.length - 1;
              if (next[idx] && next[idx].role === "assistant") {
                next[idx] = { role: "assistant", content: text };
              }
              try {
                localStorage.setItem("chat:messages", JSON.stringify(next));
              } catch {}
              return next;
            }
          );
        };

        const processMarkers = () => {
          // Find earliest marker occurrence
          const idxBegin = buffer.indexOf("[[R:BEGIN]]");
          const idxEnd = buffer.indexOf("[[R:END]]");
          const idxDelta = buffer.indexOf("[[R]]");
          const idxSBegin = buffer.indexOf("[[S:BEGIN]]");
          const idxSEnd = buffer.indexOf("[[S:END]]");
          const idxSQuery = buffer.indexOf("[[S:QUERY]]");
          const idxSInProg = buffer.indexOf("[[S:STATUS:in_progress]]");
          const idxSSearch = buffer.indexOf("[[S:STATUS:searching]]");
          const idxSComplete = buffer.indexOf("[[S:STATUS:completed]]");
          let idx = -1;
          let which:
            | "BEGIN"
            | "END"
            | "DELTA"
            | "SBEGIN"
            | "SEND"
            | "SQUERY"
            | "S_IN_PROGRESS"
            | "S_SEARCHING"
            | "S_COMPLETED"
            | null = null;
          for (const [candidateIdx, tag] of [
            [idxBegin, "BEGIN"],
            [idxEnd, "END"],
            [idxDelta, "DELTA"],
            [idxSBegin, "SBEGIN"],
            [idxSEnd, "SEND"],
            [idxSQuery, "SQUERY"],
            [idxSInProg, "S_IN_PROGRESS"],
            [idxSSearch, "S_SEARCHING"],
            [idxSComplete, "S_COMPLETED"],
          ] as const) {
            if (candidateIdx !== -1 && (idx === -1 || candidateIdx < idx)) {
              idx = candidateIdx;
              which = tag as any;
            }
          }
          if (idx === -1 || which === null) {
            // No markers; treat entire buffer as normal text
            if (buffer.length > 0) {
              assistantText += buffer;
              pushAssistant(assistantText);
              buffer = "";
            }
            return false; // nothing more to process
          }

          // Emit any normal text before the marker
          if (idx > 0) {
            const normal = buffer.slice(0, idx);
            assistantText += normal;
            pushAssistant(assistantText);
            buffer = buffer.slice(idx);
          }

          // Now buffer starts with a marker
          if (which === "BEGIN") {
            buffer = buffer.slice("[[R:BEGIN]]".length);
            setReasoning("");
            setReasoningActive(true);
            return true; // continue loop
          }
          if (which === "END") {
            buffer = buffer.slice("[[R:END]]".length);
            setReasoningActive(false);
            setReasoning("");
            return true;
          }
          if (which === "SBEGIN") {
            buffer = buffer.slice("[[S:BEGIN]]".length);
            setSearchActive(true);
            setSearchStatus("in_progress");
            if (searchClearTimeoutRef.current) {
              clearTimeout(searchClearTimeoutRef.current);
              searchClearTimeoutRef.current = null;
            }
            setSearchQuery("");
            return true;
          }
          if (which === "SEND") {
            buffer = buffer.slice("[[S:END]]".length);
            setSearchActive(false);
            // Keep last known status/query briefly so the user can see it
            if (searchClearTimeoutRef.current) {
              clearTimeout(searchClearTimeoutRef.current);
            }
            searchClearTimeoutRef.current = window.setTimeout(() => {
              setSearchStatus(null);
              setSearchQuery("");
              searchClearTimeoutRef.current = null;
            }, 1500);
            return true;
          }
          if (which === "S_IN_PROGRESS") {
            buffer = buffer.slice("[[S:STATUS:in_progress]]".length);
            setSearchStatus("in_progress");
            return true;
          }
          if (which === "S_SEARCHING") {
            buffer = buffer.slice("[[S:STATUS:searching]]".length);
            setSearchStatus("searching");
            return true;
          }
          if (which === "S_COMPLETED") {
            buffer = buffer.slice("[[S:STATUS:completed]]".length);
            setSearchStatus("completed");
            return true;
          }
          // DELTA: consume marker and capture up to next marker or end
          if (which === "DELTA") {
            buffer = buffer.slice("[[R]]".length);
            // Find next marker start
            const nextIdx = Math.min(
              ...[
                "[[R:BEGIN]]",
                "[[R:END]]",
                "[[R]]",
                "[[S:BEGIN]]",
                "[[S:END]]",
                "[[S:QUERY]]",
                "[[S:STATUS:in_progress]]",
                "[[S:STATUS:searching]]",
                "[[S:STATUS:completed]]",
              ].map((t) => {
                const i = buffer.indexOf(t);
                return i === -1 ? Number.POSITIVE_INFINITY : i;
              })
            );
            if (!isFinite(nextIdx)) {
              // No following marker; take all
              setReasoning((prev) => (prev + buffer).slice(-4000));
              buffer = "";
            } else {
              const deltaText = buffer.slice(0, nextIdx);
              setReasoning((prev) => (prev + deltaText).slice(-4000));
              buffer = buffer.slice(nextIdx);
            }
            return true;
          }
          if (which === "SQUERY") {
            buffer = buffer.slice("[[S:QUERY]]".length);
            const nextIdx = Math.min(
              ...[
                "[[R:BEGIN]]",
                "[[R:END]]",
                "[[R]]",
                "[[S:BEGIN]]",
                "[[S:END]]",
                "[[S:QUERY]]",
                "[[S:STATUS:in_progress]]",
                "[[S:STATUS:searching]]",
                "[[S:STATUS:completed]]",
              ].map((t) => {
                const i = buffer.indexOf(t);
                return i === -1 ? Number.POSITIVE_INFINITY : i;
              })
            );
            if (!isFinite(nextIdx)) {
              setSearchQuery((prev) => (prev + buffer).slice(-4000));
              buffer = "";
            } else {
              const q = buffer.slice(0, nextIdx);
              setSearchQuery((prev) => (prev + q).slice(-4000));
              buffer = buffer.slice(nextIdx);
            }
            return true;
          }
          return false;
        };

        // Iterate until buffer fully processed or no markers left
        // Break to await more data if a marker is partially present at end
        let progressed = true;
        while (progressed) {
          progressed = processMarkers();
        }
      }
      const isReady = /ready to finalize plan/i.test(assistantText);
      setReady(isReady);
      setReasoning("");
      setReasoningActive(false);
      setSearchActive(false);
      // Clear search indicators shortly after completion if still pending
      if (searchClearTimeoutRef.current) {
        clearTimeout(searchClearTimeoutRef.current);
        searchClearTimeoutRef.current = null;
      }
      setSearchStatus(null);
      setSearchQuery("");
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
        {(reasoningActive ||
          searchActive ||
          searchStatus !== null ||
          searchQuery) && (
          <div className="mb-3 text-xs text-muted-foreground space-y-1">
            {reasoningActive && (
              <div>
                <span className="font-medium">Reasoning</span>: {reasoning}
              </div>
            )}
            {(searchActive || searchStatus !== null || searchQuery) && (
              <div>
                <span className="font-medium">Web search</span>
                {searchStatus ? ` — ${searchStatus}` : ""}
                {searchQuery ? ` — ${searchQuery}` : ""}
              </div>
            )}
          </div>
        )}
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
