import { StreamingState } from "@/hooks/useStreamingChat";

interface StreamingStatusProps {
  streaming: StreamingState;
}

export default function StreamingStatus({ streaming }: StreamingStatusProps) {
  const {
    reasoningActive,
    searchActive,
    searchStatus,
    searchQuery,
    reasoning
  } = streaming;

  if (!reasoningActive && !searchActive && !searchStatus && !searchQuery) {
    return null;
  }

  return (
    <div className="mb-3 text-xs text-muted-foreground space-y-1">
      {reasoningActive && (
        <div>
          <span className="font-medium">Reasoning</span>: {reasoning}
        </div>
      )}
      {(searchActive || searchStatus || searchQuery) && (
        <div>
          <span className="font-medium">Web search</span>
          {searchStatus ? ` — ${searchStatus}` : ""}
          {searchQuery ? ` — ${searchQuery}` : ""}
        </div>
      )}
    </div>
  );
}