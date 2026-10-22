// RSI EMA/WMA Method 1 MTF — the sub-pane part of rsi_ema_wma.pine.
// Editor Settings: Overlay off (sub-pane), Precision 2.
// The RT MTF labels (force_overlay in Pine) are a separate overlay indicator: rsi_mtf_labels.script.js.

const SOURCES = {
  open: (b) => b.open,
  high: (b) => b.high,
  low: (b) => b.low,
  close: (b) => b.close,
  hl2: (b) => (b.high + b.low) / 2,
  hlc3: (b) => (b.high + b.low + b.close) / 3,
  ohlc4: (b) => (b.open + b.high + b.low + b.close) / 4,
  hlcc4: (b) => (b.high + b.low + 2 * b.close) / 4
};

// Pine autoHtfTF(): label is the string the info box shows, tf goes to bv.security.
const AUTO_HTF = [
  { maxMin: 1, label: '5', tf: '5m' },
  { maxMin: 5, label: '15', tf: '15m' },
  { maxMin: 15, label: '60', tf: '1h' },
  { maxMin: 60, label: '240', tf: '4h' },
  { maxMin: 240, label: 'D', tf: '1d' },
  { maxMin: 1440, label: 'W', tf: '1w' }
];
const AUTO_HTF_LAST = { label: 'M', tf: '1M' };

// Pine v5 named colours used by the source.
const GREEN = '#4caf50';
const RED = '#ff5252';
const GRAY = '#787b86';
const ORANGE = '#ff9800';
const WHITE = '#ffffff';
const CELL_BG = 'rgba(54, 58, 69, 0.3)'; // color.new(color.black, 70)

function pickAutoHtf(dataList) {
  const m = bv.detectBarMs(dataList) / 60000;
  for (const step of AUTO_HTF) if (m <= step.maxMin) return step;
  return AUTO_HTF_LAST;
}

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

// Choppiness Index on the last bar only: the info box is the one place the source shows it.
function lastChop(dataList, len) {
  const n = dataList.length;
  if (n < len) return NaN;
  let atrSum = 0;
  let hi = -Infinity;
  let lo = Infinity;
  for (let k = n - len; k < n; k++) {
    const b = dataList[k];
    if (k > 0) {
      const pc = dataList[k - 1].close;
      atrSum += Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc));
    } else {
      atrSum += b.high - b.low;
    }
    if (b.high > hi) hi = b.high;
    if (b.low < lo) lo = b.low;
  }
  const range = hi - lo;
  return range > 0 ? (100 * Math.log10(atrSum / range)) / Math.log10(len) : NaN;
}

return {
  figures: [
    { key: 'rsi', type: 'line', title: 'RSI: ', styles: () => ({ color: '#ffeb3b', size: 3 }) },
    { key: 'wma', type: 'line', title: 'WMA: ', styles: () => ({ color: '#e53935', size: 3 }) },
    { key: 'ema', type: 'line', title: 'EMA: ', styles: () => ({ color: '#00c853', size: 2 }) },
    { key: 'htfWma', type: 'line', title: 'HTF WMA: ', styles: () => ({ color: 'rgba(255, 255, 255, 0.8)', size: 4 }) },
    { key: 'ob', type: 'line', title: 'OB Line: ', styles: () => ({ color: '#757575', size: 2, style: 'dashed', dashedValue: [4, 4] }) },
    { key: 'os', type: 'line', title: 'OS Line: ', styles: () => ({ color: '#9e9e9e', size: 2, style: 'dashed', dashedValue: [4, 4] }) },
    { key: 'mid', type: 'line', title: 'Middle Line: ', styles: () => ({ color: '#2962ff', size: 1 }) }
  ],

  calc(dataList, indicator) {
    const {
      src = 'close',
      rsiLen = 14,
      emaRsiLen = 9,
      wmaRsiLen = 21,
      midLine = 50,
      autoHtf = true,
      manualHtf = '1D',
      htfWmaLen = 21,
      htfSlope = 2,
      showHtf = true,
      showInfo = true,
      ciLen = 14,
      ciThr = 50
    } = indicator.extendData?.inputs || {};
    const n = dataList.length;
    if (n === 0) return [];

    const srcOf = SOURCES[src] || SOURCES.close;
    const htf = autoHtf ? pickAutoHtf(dataList) : { label: manualHtf || 'Chart', tf: manualHtf };

    // Pine htfCalc(): WMA of the HTF RSI read one HTF bar back with lookahead on, so each
    // chart bar sees the last completed HTF value and history does not repaint.
    const htfVals = bv.security(
      { symbol: '', timeframe: htf.tf, gaps: false, lookahead: true },
      (bars) => {
        const wmaH = maFrom(rsiOf(bars.map(srcOf), rsiLen), rsiLen, htfWmaLen, 'WMA');
        return bars.map((_, i) => ({ cur: wmaH[i - 1], prev: wmaH[i - htfSlope - 1] }));
      }
    );
    if (!htfVals) return dataList.map(() => ({}));

    const rsi = rsiOf(dataList.map(srcOf), rsiLen);
    const ema = maFrom(rsi, rsiLen, emaRsiLen, 'EMA');
    const wma = maFrom(rsi, rsiLen, wmaRsiLen, 'WMA');

    const res = new Array(n);
    for (let i = 0; i < n; i++) {
      res[i] = {
        rsi: rsi[i],
        wma: wma[i],
        ema: ema[i],
        htfWma: showHtf ? htfVals[i]?.cur : undefined,
        ob: 70,
        os: 30,
        mid: midLine
      };
    }

    let info = null;
    if (showInfo) {
      const h = htfVals[n - 1];
      const hasHtf = h && Number.isFinite(h.cur) && Number.isFinite(h.prev);
      const bull = hasHtf && h.cur > h.prev;
      const bear = hasHtf && h.cur < h.prev;
      const chop = lastChop(dataList, ciLen);
      const trending = chop < ciThr;
      info = [
        ['HTF', htf.label, WHITE],
        ['Bias', bull ? 'BULL' : bear ? 'BEAR' : 'NEUTRAL', bull ? GREEN : bear ? RED : GRAY],
        ['CI', Number.isFinite(chop) ? chop.toFixed(1) : 'NaN', WHITE],
        ['Mkt', trending ? 'TREND' : 'CHOP', trending ? GREEN : ORANGE]
      ];
    }

    indicator._rsiEmaWma = { rsi, mid: midLine, info };
    return res;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const state = indicator._rsiEmaWma;
    if (!state) return false;
    const { rsi, mid, info } = state;

    ctx.save();
    ctx.setLineDash([]);

    // OB / OS fill between RSI and the middle line, under the lines.
    const vis = bv.visible(args);
    const from = Math.max(0, Math.floor(vis.from));
    const to = Math.min(rsi.length - 1, Math.ceil(vis.to));
    const yMid = bv.yOfPrice(args, mid);
    const fillSide = (above, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      let open = false;
      let lastX = 0;
      for (let i = from; i <= to; i++) {
        const v = rsi[i];
        if (v === undefined) continue;
        const x = bv.xOfIndex(args, i);
        const y = bv.yOfPrice(args, above ? Math.max(v, mid) : Math.min(v, mid));
        if (!open) {
          ctx.moveTo(x, yMid);
          open = true;
        }
        ctx.lineTo(x, y);
        lastX = x;
      }
      if (open) {
        ctx.lineTo(lastX, yMid);
        ctx.closePath();
        ctx.fill();
      }
    };
    if (Number.isFinite(yMid) && to >= from) {
      ctx.globalCompositeOperation = 'destination-over';
      fillSide(true, 'rgba(255, 82, 82, 0.5)');
      fillSide(false, 'rgba(33, 150, 243, 0.5)');
      ctx.globalCompositeOperation = 'source-over';
    }

    // Info box, top right of the pane like Pine's table.
    if (info) {
      const { right, top } = bv.bounds(args);
      const pad = 6;
      const rowH = 18;
      const gap = 1;
      ctx.font = bv.font(args, { size: 11 }).css;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      let w0 = 0;
      let w1 = 0;
      for (const [k, v] of info) {
        w0 = Math.max(w0, ctx.measureText(k).width);
        w1 = Math.max(w1, ctx.measureText(v).width);
      }
      w0 += pad * 2;
      w1 += pad * 2;
      const x0 = right - w0 - w1 - gap - 4;
      const x1 = x0 + w0 + gap;
      for (let r = 0; r < info.length; r++) {
        const [k, v, color] = info[r];
        const y = top + 4 + r * (rowH + gap);
        ctx.fillStyle = CELL_BG;
        ctx.fillRect(x0, y, w0, rowH);
        ctx.fillRect(x1, y, w1, rowH);
        ctx.fillStyle = WHITE;
        ctx.fillText(k, x0 + pad, y + rowH / 2);
        ctx.fillStyle = color;
        ctx.fillText(v, x1 + pad, y + rowH / 2);
      }
    }

    ctx.restore();
    return false;
  }
};
