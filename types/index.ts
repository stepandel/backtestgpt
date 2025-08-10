export interface BacktestPlan {
  ticker: string;
  entry: { 
    url?: string;
    [key: string]: any;
  };
  exit: { 
    url?: string;
    [key: string]: any;
  };
}

export interface StatsData {
  totalReturn: number;
  maxDrawdown: number;
  sharpe: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  trades: number;
}

export interface EquityPoint {
  date: string;
  value: number;
}

export interface TickerResult {
  ticker: string;
  totalReturn: number;
  maxDrawdown: number;
  sharpe: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  trades: number;
}

export interface BacktestResults {
  stats: StatsData;
  equityCurve: EquityPoint[];
  perTicker: TickerResult[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamingData {
  plan: BacktestPlan[];
  results: BacktestResults;
}