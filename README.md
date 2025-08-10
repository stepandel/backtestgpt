## BacktestGPT (Prototype)

An experimental Next.js + TypeScript app for LLM-assisted market event research and deterministic backtesting. The UI features a chat-driven planner, streaming reasoning and web search indicators, and a Wall Street–themed dashboard with an interactive equity curve.

### Key Features

- **Two‑stage planner**
  - Stage 1: Interactive research chat with GPT‑5 + web search, streams responses and live status
  - Stage 2: Structures the transcript into a strict `Plan[]` via a tool function
- **Deterministic backtest** on daily OHLCV (Polygon SDK or mock), with per‑ticker stats
- **Dashboard UI** with stats cards, a draggable‑handles equity curve, per‑ticker table, and a live ticker tape
- **Streaming UX** with ephemeral “Reasoning …” and “Web search — status — query” indicators
- **LocalStorage** persistence for chat, readiness flag, results, and price cache

### Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- OpenAI `responses` API (GPT‑5) with `web_search_preview`
- `@polygon.io/client-js` for historical prices
- SVG charting (custom) + `ResizeObserver`

## Requirements

- Node.js 18+
- `pnpm` package manager
- Optional env vars:
  - `OPENAI_API_KEY` (to enable Stage 1 chat + Stage 2 structuring)
  - `POLYGON_API_KEY` (for real price data; otherwise mock)

## Quickstart

1. Install dependencies

```bash
pnpm install
```

2. Create an `.env.local` in the repo root (optional but recommended):

```bash
OPENAI_API_KEY=sk-...
POLYGON_API_KEY=...
```

3. Run the dev server

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Project Structure (selected)

- `app/`
  - `page.tsx`: main layout (chat left, dashboard right)
  - `api/chat/route.ts`: Stage 1 research chat (streaming)
  - `api/plan/route.ts`: Stage 2 plan structuring
  - `api/run/route.ts`: backtest execution
  - `api/quotes/route.ts`: mock quotes for ticker tape
- `components/`
  - `Chat.tsx`: chat UI, markdown rendering, streaming indicators
  - `Results.tsx` + `ResultsView.tsx`: results container + view
  - `Charts/EquityCurve.tsx`: interactive curve (draggable entry/exit)
  - `TickerTape.tsx`, `Shell.tsx`, `StatsCards.tsx`, `Table.tsx`
- `engine/`: strategy execution and compute
- `lib/`: env, prices provider, and `mockCurve.ts`

## Environment

- `lib/env.ts` treats `OPENAI_API_KEY` and `POLYGON_API_KEY` as optional.
  - Without `OPENAI_API_KEY`: `/api/chat` returns a message explaining chat is disabled.
  - Without `POLYGON_API_KEY`: the backtest uses mock prices; the equity curve is always mock for demo.

## Planner Flow

- **Stage 1 (Chat)**: `POST /api/chat`
  - Model: `gpt-5` + `web_search_preview` tool
  - System prompt enforces: official sources only, ET timezone, max 5 tickers, markdown output, and to end with “Ready to finalize plan”.
  - Streaming response:
    - Answer deltas are sent as plain text
    - Reasoning deltas are tagged as `[[R]]...`, with lifecycle markers `[[R:BEGIN]]` and `[[R:END]]`
    - Web search status uses:
      - `[[S:BEGIN]]`, `[[S:END]]`
      - `[[S:STATUS:in_progress|searching|completed]]`
      - `[[S:QUERY]]<query>` (when available from the event)
- **Stage 2 (Structuring)**: `POST /api/plan`
  - Parses the Stage 1 transcript and calls GPT‑5 with the `officialEventExtractor` function tool
  - Enforces max 5 tickers; returns `Plan[]`

## Backtesting

- `engine/compute.ts` runs a deterministic backtest on daily bars
- `lib/prices.ts` fetches aggregates using `@polygon.io/client-js`
- Stats: mean P&L, median P&L, hit rate with fraction, per‑ticker results
- Equity curve: always uses `lib/mockCurve.ts` for demo visuals

## UI/UX Notes

- Chat renders assistant messages as Markdown (`react-markdown` + `remark-gfm` + `remark-breaks`)
- Streaming indicators at the top of the chat area:
  - “Reasoning: <live text>” (ephemeral)
  - “Web search — <status> — <query>” (ephemeral; briefly persists on completion)
- Chat panel is resizable (collapsed / 1/3 / full) via `Shell.tsx`
- Ticker tape in the header uses `/api/quotes` (mock)

## Persistence (localStorage)

- `chat:messages`: full chat history
- `chat:ready`: whether Stage 1 ended with “Ready to finalize plan”
- `backtest:data`: `{ plan, results }` from `/api/run`
- `prices:cache`: cached price series (when available)
- Reset via the “Reset” button in the chat footer

## API Endpoints

- `POST /api/chat` — body: `{ messages: { role, content }[] }` — streams `text/plain`
- `POST /api/plan` — body: `{ transcript }` — returns `Plan[]`
- `POST /api/run` — body: `{ plan }` — returns `{ results }`
- `GET /api/quotes?tickers=...` — returns mock quotes for ticker tape

## Troubleshooting

- Polygon aggregates date format must be `YYYY-MM-DD` for `from`/`to`
- If chat streaming stops unexpectedly, ensure `OPENAI_API_KEY` is set and the model is `gpt-5`
- The app intentionally uses a mock equity curve for demo consistency

## Scripts

Typical Next.js scripts:

```bash
pnpm dev         # start dev server
pnpm build       # build for production
pnpm start       # start production server
```

## License

Prototype – not for production use.
