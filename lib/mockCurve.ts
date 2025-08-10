// Static mock equity curve data, easy to tweak for demos
// v values are relative equity (1.0 = 0%)
export const MOCK_EQUITY_CURVE: { t: string; v: number }[] = [
  { t: "0", v: 1.0 },
  { t: "1", v: 0.98 },
  { t: "2", v: 0.965 },
  { t: "3", v: 0.972 },
  { t: "4", v: 0.985 },
  { t: "5", v: 0.995 },
  { t: "6", v: 1.01 },
  { t: "7", v: 1.022 },
  { t: "8", v: 1.035 },
  { t: "9", v: 1.04 },
  { t: "10", v: 1.045 },
  { t: "11", v: 1.05 },
  { t: "12", v: 1.055 },
  { t: "13", v: 1.06 },
  { t: "14", v: 1.07 },
  { t: "15", v: 1.06 }, // pre-rebalance dip
  { t: "16", v: 1.058 },
  { t: "17", v: 1.065 },
  { t: "18", v: 1.08 },
  { t: "19", v: 1.105 }, // strong final day rise
  { t: "20", v: 1.13 },
];
