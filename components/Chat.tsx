"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import ChatMessage from "@/components/ChatMessage";
import StreamingStatus from "@/components/StreamingStatus";

export default function Chat() {
  const [prompt, setPrompt] = useState("");
  const {
    messages,
    loading,
    error,
    ready,
    streaming,
    loadMessages,
    sendMessage,
    finalizePlan,
    resetChat
  } = useStreamingChat();

  useEffect(() => {
    loadMessages();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    await sendMessage(prompt);
    setPrompt("");
  }



  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 bg-gradient-to-b from-transparent via-zinc-900/20 to-zinc-900/40">
        <StreamingStatus streaming={streaming} />
        {messages.length > 0 && (
          <div className="space-y-3 text-sm">
            {messages.map((m, i) => (
              <ChatMessage key={i} message={m} />
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
            onClick={finalizePlan}
          >
            {ready ? "Finalize Plan" : "Continue Chat"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={resetChat}
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
