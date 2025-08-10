export interface MockCurvePoint {
  t: string;
  v: number;
}

export function generateMockCurve(finalRet: number, points: number = 240): MockCurvePoint[] {
  const out: MockCurvePoint[] = [];
  const sign = finalRet >= 0 ? 1 : -1;
  const mag = Math.max(0.05, Math.abs(finalRet));

  const earlyDipAmp = Math.min(0.35, 0.4 * mag + 0.06);
  const midDipAmp = Math.min(0.22, 0.25 * mag + 0.04);
  const lateSurgeAmp = Math.min(0.35, 0.5 * mag + 0.08);
  const trendAmp = mag;

  const ease = (x: number) =>
    x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const trend = trendAmp * ease(t);
    const earlyDip = -earlyDipAmp * Math.exp(-Math.pow((t - 0.06) / 0.035, 2));
    const preRebDip = -midDipAmp * Math.exp(-Math.pow((t - 0.88) / 0.05, 2));
    const endSpike = lateSurgeAmp * Math.exp(-Math.pow((t - 0.985) / 0.018, 2));
    const endPower = lateSurgeAmp * Math.pow(Math.max(0, t - 0.95) / 0.05, 3);
    const wave = 0.01 * Math.sin(10 * Math.PI * t);
    
    let path =
      trend +
      earlyDip +
      preRebDip +
      Math.max(endSpike, 0) +
      Math.max(endPower, 0) +
      wave;
    
    const ret = sign * path;
    out.push({ t: String(i), v: 1 + ret });
  }

  out[0].v = 1;
  const endV = 1 + finalRet;
  const pivot = Math.max(1, Math.floor(0.95 * (points - 1)));
  
  for (let i = pivot + 1; i < points; i++) {
    out[i].v = Math.max(out[i].v, out[i - 1].v);
  }

  const currentEnd = out[points - 1].v;
  if (currentEnd !== endV) {
    const delta = endV - currentEnd;
    for (let i = pivot; i < points; i++) {
      const tt = (i - pivot) / (points - 1 - pivot || 1);
      out[i].v += delta * tt;
    }
    out[points - 1].v = endV;
  }
  
  return out;
}