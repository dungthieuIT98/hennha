// RSI MTF real-time labels — the force_overlay part of rsi_ema_wma.pine.
// Editor Settings: Overlay on (main chart), Precision 2.

const MAX_LABELS = 500; // Pine max_labels_count
const TINY = 9;
const SMALL = 11;

// Pine creation order per bar. k = label offset as a share of the bar's high-low range.
const TFS = [
  { tf: '1m', mins: 1, show: 'showM1', key: 'm1', k: 0.05, size: TINY },
  { tf: '5m', mins: 5, show: 'showM5', key: 'm5', k: 0.1, size: TINY },
  { tf: '15m', mins: 15, show: 'showM15', key: 'm15', k: 0.15, size: SMALL },
  { tf: '1h', mins: 60, show: 'showH1', key: 'h1', k: 0.25, size: SMALL },
  { tf: '4h', mins: 240, show: 'showH4', key: 'h4', k: 0.35, size: SMALL },
  { tf: '1d', mins: 1440, show: 'showD1', key: 'd1', k: 0.45, size: SMALL }
];

const DEFAULT_COLORS = {
  color_m1_light: '#90caf9', color_m1_dark: '#42a5f5', color_m1_darker: '#1565c0',
  color_m5_light: '#81d4fa', color_m5_dark: '#29b6f6', color_m5_darker: '#0277bd',
  color_m15_light: '#64b5f6', color_m15_dark: '#1e88e5', color_m15_darker: '#0d47a1',
  color_h1_light: '#69f0ae', color_h1_dark: '#00c853', color_h1_darker: '#004d40',
  color_h4_light: '#ffb74d', color_h4_dark: '#f57c00', color_h4_darker: '#bf360c',
  color_d1_light: '#ba68c8', color_d1_dark: '#8e24aa', color_d1_darker: '#4a148c'
};

// bv.ma over values[start..], realigned so bars before start stay undefined (Pine's na warm-up).
function maFrom(values, start, len, type) {
  const out = new Array(values.length);
  if (start >= values.length) return out;
  const ma = bv.ma(values.slice(start), len, type);
  for (let i = 0; i < ma.length; i++) out[start + i] = ma[i] ?? undefined;
  return out;
}

// Pine ta.rsi: RMA of gains and losses, na for the first `len` bars.
function rsiOf(values, len) {
  const n = values.length;
  const gain = new Array(n);
  const loss = new Array(n);
  for (let i = 1; i < n; i++) {
    const d = values[i] - values[i - 1];
    gain[i] = d > 0 ? d : 0;
    loss[i] = d < 0 ? -d : 0;
  }
  const up = maFrom(gain, 1, len, 'RMA');
  const down = maFrom(loss, 1, len, 'RMA');
  const out = new Array(n);
  for (let i = len; i < n; i++) {
    const u = up[i];
    const d = down[i];
    out[i] = d === 0 ? 100 : u === 0 ? 0 : 100 - 100 / (1 + u / d);
  }
  return out;
}

return {
  figures: [],

  calc(dataList, indicator) {
    const inputs = indicator.extendData?.inputs || {};
    const rsiLen = inputs.rsiLen ?? 14;
    const n = dataList.length;
    const color = (id) => inputs[id] || DEFAULT_COLORS[id];
    const chartMins = bv.detectBarMs(dataList) / 60000;

    // Only timeframes above the chart's (docs' HTF rule); hidden or lower ones are never requested.
    const active = [];
    for (const t of TFS) {
      if (!(inputs[t.show] ?? true) || !(t.mins > chartMins)) continue;
      const rsi = bv.security(
        { symbol: '', timeframe: t.tf, gaps: false, lookahead: false },
        (bars) => rsiOf(bars.map((b) => b.close), rsiLen)
      );
      if (!rsi) return dataList.map(() => ({}));
      active.push({
        rsi,
        k: t.k,
        size: t.size,
        light: color(`color_${t.key}_light`),
        dark: color(`color_${t.key}_dark`),
        darker: color(`color_${t.key}_darker`)
      });
    }

    // Walk back from the newest bar so only the last MAX_LABELS labels are built,
    // the same ones Pine keeps once it starts deleting the oldest.
    const labels = [];
    for (let i = n - 1; i >= 0 && labels.length < MAX_LABELS; i--) {
      const bar = dataList[i];
      const range = bar.high - bar.low;
      for (let a = active.length - 1; a >= 0 && labels.length < MAX_LABELS; a--) {
        const t = active[a];
        const v = t.rsi[i];
        if (!Number.isFinite(v)) continue;
        const above = v >= 70;
        if (!above && v > 30) continue;
        const tone = above
          ? (v > 90 ? t.darker : v >= 80 ? t.dark : t.light)
          : (v <= 20 ? t.darker : v <= 25 ? t.dark : t.light);
        labels.push({
          index: i,
          price: above ? bar.high + range * t.k : bar.low - range * t.k,
          text: String(Math.round(v * 100) / 100), // Pine "#.##"
          above,
          color: tone,
          size: t.size
        });
      }
    }
    labels.reverse();

    indicator._rsiMtfLabels = labels;
    return dataList.map(() => ({}));
  },

  draw(args) {
    const { ctx, indicator } = args;
    const labels = indicator._rsiMtfLabels;
    if (!labels) return false;
    const { from, to } = bv.visible(args);

    ctx.save();
    ctx.setLineDash([]);
    for (const l of labels) {
      if (l.index < from || l.index > to) continue;
      bv.label(args, {
        index: l.index,
        price: l.price,
        text: l.text,
        color: '#ffffff',
        background: l.color,
        align: 'center',
        baseline: l.above ? 'bottom' : 'top',
        size: l.size
      });
    }
    ctx.restore();
    return false;
  }
};
