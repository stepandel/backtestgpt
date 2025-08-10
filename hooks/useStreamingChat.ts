import { useState, useRef } from "react";
import { ChatMessage } from "@/types";
import { safeLocalStorage } from "@/lib/storage";

export interface StreamingState {
  reasoning: string;
  reasoningActive: boolean;
  searchActive: boolean;
  searchStatus: "in_progress" | "searching" | "completed" | null;
  searchQuery: string;
}

export function useStreamingChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [streaming, setStreaming] = useState<StreamingState>({
    reasoning: "",
    reasoningActive: false,
    searchActive: false,
    searchStatus: null,
    searchQuery: ""
  });
  const searchClearTimeoutRef = useRef<number | null>(null);

  const loadMessages = () => {
    const saved = safeLocalStorage.getItem<ChatMessage[]>("chat:messages");
    if (saved) {
      setMessages(saved);
      const lastAssistant = [...saved]
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistant && /ready to finalize plan/i.test(lastAssistant.content)) {
        setReady(true);
      }
    }
  };

  const sendMessage = async (prompt: string) => {
    setError(null);
    if (!prompt.trim()) return;
    
    setLoading(true);
    const userMessage: ChatMessage = { role: "user", content: prompt };
    
    setMessages((prev) => {
      const next = [...prev, userMessage];
      safeLocalStorage.setItem("chat:messages", next);
      return next;
    });

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
      let assistantIndex = -1;

      setMessages((prev) => {
        assistantIndex = prev.length;
        const next: ChatMessage[] = [...prev, { role: "assistant", content: "" }];
        safeLocalStorage.setItem("chat:messages", next);
        return next;
      });

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        const { newBuffer, newAssistantText } = processStreamBuffer(
          buffer, 
          assistantText, 
          setStreaming,
          searchClearTimeoutRef,
          (text: string) => {
            setMessages((prev) => {
              const next: ChatMessage[] = [...prev];
              const idx = assistantIndex >= 0 ? assistantIndex : prev.length - 1;
              if (next[idx] && next[idx].role === "assistant") {
                next[idx] = { role: "assistant", content: text };
              }
              safeLocalStorage.setItem("chat:messages", next);
              return next;
            });
          }
        );
        
        buffer = newBuffer;
        assistantText = newAssistantText;
      }

      const isReady = /ready to finalize plan/i.test(assistantText);
      setReady(isReady);
      
      setStreaming({
        reasoning: "",
        reasoningActive: false,
        searchActive: false,
        searchStatus: null,
        searchQuery: ""
      });
      
      if (searchClearTimeoutRef.current) {
        clearTimeout(searchClearTimeoutRef.current);
        searchClearTimeoutRef.current = null;
      }
      
      safeLocalStorage.setItem("chat:ready", isReady);
      
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const finalizePlan = async () => {
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
      
      safeLocalStorage.setItem("backtest:data", { plan, results });
      
      const event = new CustomEvent("backtest:results", {
        detail: { plan, results },
      });
      window.dispatchEvent(event);
      
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    safeLocalStorage.removeItem("chat:messages");
    safeLocalStorage.removeItem("chat:ready");
    safeLocalStorage.removeItem("backtest:data");
    safeLocalStorage.removeItem("prices:cache");
    
    setMessages([]);
    setReady(false);
    
    const event = new CustomEvent("backtest:results", { detail: null });
    window.dispatchEvent(event);
  };

  return {
    messages,
    loading,
    error,
    ready,
    streaming,
    loadMessages,
    sendMessage,
    finalizePlan,
    resetChat
  };
}

function processStreamBuffer(
  buffer: string,
  assistantText: string,
  setStreaming: React.Dispatch<React.SetStateAction<StreamingState>>,
  searchClearTimeoutRef: React.MutableRefObject<number | null>,
  pushAssistant: (text: string) => void
): { newBuffer: string; newAssistantText: string } {
  let newBuffer = buffer;
  let newAssistantText = assistantText;

  const processMarkers = (): boolean => {
    const markers = [
      { marker: "[[R:BEGIN]]", type: "R_BEGIN" },
      { marker: "[[R:END]]", type: "R_END" },
      { marker: "[[R]]", type: "R_DELTA" },
      { marker: "[[S:BEGIN]]", type: "S_BEGIN" },
      { marker: "[[S:END]]", type: "S_END" },
      { marker: "[[S:QUERY]]", type: "S_QUERY" },
      { marker: "[[S:STATUS:in_progress]]", type: "S_IN_PROGRESS" },
      { marker: "[[S:STATUS:searching]]", type: "S_SEARCHING" },
      { marker: "[[S:STATUS:completed]]", type: "S_COMPLETED" }
    ];

    let idx = -1;
    let activeMarker: typeof markers[0] | null = null;

    for (const m of markers) {
      const candidateIdx = newBuffer.indexOf(m.marker);
      if (candidateIdx !== -1 && (idx === -1 || candidateIdx < idx)) {
        idx = candidateIdx;
        activeMarker = m;
      }
    }

    if (idx === -1 || !activeMarker) {
      if (newBuffer.length > 0) {
        newAssistantText += newBuffer;
        pushAssistant(newAssistantText);
        newBuffer = "";
      }
      return false;
    }

    if (idx > 0) {
      const normal = newBuffer.slice(0, idx);
      newAssistantText += normal;
      pushAssistant(newAssistantText);
      newBuffer = newBuffer.slice(idx);
    }

    // Process the marker
    switch (activeMarker.type) {
      case "R_BEGIN":
        newBuffer = newBuffer.slice(activeMarker.marker.length);
        setStreaming(prev => ({ ...prev, reasoning: "", reasoningActive: true }));
        break;
      case "R_END":
        newBuffer = newBuffer.slice(activeMarker.marker.length);
        setStreaming(prev => ({ ...prev, reasoningActive: false, reasoning: "" }));
        break;
      case "S_BEGIN":
        newBuffer = newBuffer.slice(activeMarker.marker.length);
        if (searchClearTimeoutRef.current) {
          clearTimeout(searchClearTimeoutRef.current);
          searchClearTimeoutRef.current = null;
        }
        setStreaming(prev => ({ 
          ...prev, 
          searchActive: true, 
          searchStatus: "in_progress",
          searchQuery: "" 
        }));
        break;
      case "S_END":
        newBuffer = newBuffer.slice(activeMarker.marker.length);
        setStreaming(prev => ({ ...prev, searchActive: false }));
        if (searchClearTimeoutRef.current) {
          clearTimeout(searchClearTimeoutRef.current);
        }
        searchClearTimeoutRef.current = window.setTimeout(() => {
          setStreaming(prev => ({ ...prev, searchStatus: null, searchQuery: "" }));
          searchClearTimeoutRef.current = null;
        }, 1500);
        break;
      case "S_IN_PROGRESS":
        newBuffer = newBuffer.slice(activeMarker.marker.length);
        setStreaming(prev => ({ ...prev, searchStatus: "in_progress" }));
        break;
      case "S_SEARCHING":
        newBuffer = newBuffer.slice(activeMarker.marker.length);
        setStreaming(prev => ({ ...prev, searchStatus: "searching" }));
        break;
      case "S_COMPLETED":
        newBuffer = newBuffer.slice(activeMarker.marker.length);
        setStreaming(prev => ({ ...prev, searchStatus: "completed" }));
        break;
      case "R_DELTA":
        newBuffer = newBuffer.slice(activeMarker.marker.length);
        const nextIdx = Math.min(
          ...markers.map(m => {
            const i = newBuffer.indexOf(m.marker);
            return i === -1 ? Number.POSITIVE_INFINITY : i;
          })
        );
        if (!isFinite(nextIdx)) {
          setStreaming(prev => ({ ...prev, reasoning: (prev.reasoning + newBuffer).slice(-4000) }));
          newBuffer = "";
        } else {
          const deltaText = newBuffer.slice(0, nextIdx);
          setStreaming(prev => ({ ...prev, reasoning: (prev.reasoning + deltaText).slice(-4000) }));
          newBuffer = newBuffer.slice(nextIdx);
        }
        break;
      case "S_QUERY":
        newBuffer = newBuffer.slice(activeMarker.marker.length);
        const nextIdxQuery = Math.min(
          ...markers.map(m => {
            const i = newBuffer.indexOf(m.marker);
            return i === -1 ? Number.POSITIVE_INFINITY : i;
          })
        );
        if (!isFinite(nextIdxQuery)) {
          setStreaming(prev => ({ ...prev, searchQuery: (prev.searchQuery + newBuffer).slice(-4000) }));
          newBuffer = "";
        } else {
          const queryText = newBuffer.slice(0, nextIdxQuery);
          setStreaming(prev => ({ ...prev, searchQuery: (prev.searchQuery + queryText).slice(-4000) }));
          newBuffer = newBuffer.slice(nextIdxQuery);
        }
        break;
    }
    
    return true;
  };

  let progressed = true;
  while (progressed) {
    progressed = processMarkers();
  }

  return { newBuffer, newAssistantText };
}