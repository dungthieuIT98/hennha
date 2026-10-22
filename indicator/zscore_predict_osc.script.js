// Z-Score Predictive Zones [AlgoPoint] — the oscillator part of zscore_predict.pine.
// Editor Settings: Overlay off (sub-pane), Precision 2.
// The price bands (force_overlay in Pine) are a separate overlay indicator: zscore_predict_bands.script.js.
// Keep Z-Score Length / Smoothing / Lookback Depth / Thershold the same in both.

// Pine ta.sma + ta.stdev (population), sliding Welford so large prices do not lose precision.
function meanStdev(values, len) {
  const n = values.length;
  const mean = new Array(n);
  const sd = new Array(n);
  let m = 0;
  let m2 = 0;
  for (let i = 0; i < n; i++) {
    const x = values[i];
    if (i < len) {
      const d = x - m;
      m += d / (i + 1);
      m2 += d * (x - m);
    } else {
      const old = values[i - len];
      const next = m + (x - old) / len;
      m2 += (x - old) * (x - next + old - m);
      m = next;
    }
    if (i >= len - 1) {
      mean[i] = m;
      sd[i] = Math.sqrt(Math.max(m2, 0) / len);
    }
  }
  return { mean, sd };
}

// Pine ta.vwma: sma(src * volume) / sma(volume), na while any bar in the window is na.
function vwmaOf(values, vol, len) {
  const n = values.length;
  const out = new Array(n);
  let sumPV = 0;
  let sumV = 0;
  let missing = 0;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    const w = vol[i];
    if (Number.isFinite(v) && Number.isFinite(w)) {
      sumPV += v * w;
      sumV += w;
    } else {
      missing++;
    }
    if (i >= len) {
      const ov = values[i - len];
      const ow = vol[i - len];
      if (Number.isFinite(ov) && Number.isFinite(ow)) {
        sumPV -= ov * ow;
        sumV -= ow;
      } else {
        missing--;
      }
    }
    if (i >= len - 1 && missing === 0 && sumV !== 0) out[i] = sumPV / sumV;
  }
  return out;
}

// Pine array.unshift + array.pop past `size`: the last `size` values and their running sum.
function makeRing(size) {
  return { buf: new Array(size), head: 0, count: 0, sum: 0 };
}

function ringAdd(r, v) {
  if (r.count === r.buf.length) r.sum -= r.buf[r.head];
  else r.count++;
  r.buf[r.head] = v;
  r.sum += v;
  r.head = (r.head + 1) % r.buf.length;
}

// Pine core: z-score of close smoothed by VWMA, and the average of the last `depth` pivot
// highs above +thresh / pivot lows below -thresh (2 / -2 until the first one).
function zLevels(dataList, length, smooth, depth, thresh) {
  const n = dataList.length;
  const close = new Array(n);
  const vol = new Array(n);
  for (let i = 0; i < n; i++) {
    close[i] = dataList[i].close;
    vol[i] = dataList[i].volume;
  }
  const { mean, sd } = meanStdev(close, length);
  const rawZ = new Array(n);
  for (let i = 0; i < n; i++) if (sd[i] > 0) rawZ[i] = (close[i] - mean[i]) / sd[i];
  const z = vwmaOf(rawZ, vol, smooth);

  const top = new Array(n);
  const bot = new Array(n);
  const tops = makeRing(depth);
  const bots = makeRing(depth);
  for (let i = 0; i < n; i++) {
    // ta.pivothigh / ta.pivotlow (z, 1, 1): the previous bar is the pivot, confirmed on this one.
    if (i >= 2) {
      const a = z[i - 2];
      const b = z[i - 1];
      const c = z[i];
      if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
        if (b > a && b >= c && b > thresh) ringAdd(tops, b);
        if (b < a && b <= c && b < -thresh) ringAdd(bots, b);
      }
    }
    top[i] = tops.count ? tops.sum / tops.count : 2.0;
    bot[i] = bots.count ? bots.sum / bots.count : -2.0;
  }
  return { close, vol, mean, sd, z, top, bot };
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

// One sub-path per run of bars where both edges exist: along the upper edge, back along the lower.
function fillBetween(args, from, to, upper, lower) {
  const { ctx } = args;
  let start = -1;
  for (let i = from; i <= to + 1; i++) {
    const ok = i <= to && Number.isFinite(upper(i)) && Number.isFinite(lower(i));
    if (ok && start < 0) start = i;
    if (ok || start < 0) continue;
    ctx.moveTo(bv.xOfIndex(args, start), bv.yOfPrice(args, upper(start)));
    for (let k = start + 1; k < i; k++) ctx.lineTo(bv.xOfIndex(args, k), bv.yOfPrice(args, upper(k)));
    for (let k = i - 1; k >= start; k--) ctx.lineTo(bv.xOfIndex(args, k), bv.yOfPrice(args, lower(k)));
    ctx.closePath();
    start = -1;
  }
}

return {
  figures: [
    { key: 'z', type: 'line', title: 'Z-Score: ', styles: ({ data }) => ({ color: data?.current?.zc ?? '#673ab6', size: 2 }) },
    { key: 'zero', type: 'line', title: 'Zero: ', styles: () => ({ color: '#787b86', size: 1, style: 'dashed', dashedValue: [2, 2] }) },
    { key: 'avgTop', type: 'line', title: 'Avg Resistance: ', styles: () => ({ color: 'rgba(242, 54, 69, 0.8)', size: 1 }) },
    { key: 'avgBot', type: 'line', title: 'Avg Support: ', styles: () => ({ color: 'rgba(8, 153, 129, 0.8)', size: 1 }) },
    { key: 'mid', type: 'line', title: 'Midline: ', styles: () => ({ color: 'rgba(255, 255, 255, 0.5)', size: 1 }) }
  ],

  calc(dataList, indicator) {
    const {
      length = 144,
      smooth = 20,
      history_depth = 25,
      z_thersh = 1.5,
      slope_lookback = 12,
      slope_threshold = 1.0,
      show_midline = true,
      show_sideways_bg = true
    } = indicator.extendData?.inputs || {};
    const n = dataList.length;
    if (n === 0) return [];

    const { close, vol, mean, sd, z, top, bot } = zLevels(dataList, length, smooth, history_depth, z_thersh);

    // Sideways filter: % drift of the VWMA(4) resistance-low / support-high bands over slope_lookback bars.
    const resLow = new Array(n);
    const supHigh = new Array(n);
    for (let i = 0; i < n; i++) {
      if (sd[i] === undefined) continue;
      resLow[i] = mean[i] + top[i] * sd[i];
      supHigh[i] = mean[i] + bot[i] * sd[i];
    }
    const resSmooth = vwmaOf(resLow, vol, 4);
    const supSmooth = vwmaOf(supHigh, vol, 4);
    const drift = (s, i) => {
      const back = s[i - slope_lookback];
      const prev = Number.isFinite(back) ? back : s[i]; // nz(x[n], x)
      return Number.isFinite(prev) && prev !== 0 ? (Math.abs(s[i] - prev) / prev) * 100 : 0;
    };

    const rsima = maFrom(rsiOf(close, 14), 14, 9, 'EMA');
    const sideways = new Array(n);
    const res = new Array(n);
    for (let i = 0; i < n; i++) {
      sideways[i] = show_sideways_bg && (drift(resSmooth, i) + drift(supSmooth, i)) / 2 <= slope_threshold;
      const r = rsima[i];
      res[i] = {
        z: z[i],
        zc: r > 80 ? '#822f90' : r > 60 ? '#6f37ab' : r < 20 ? '#525d91' : r < 40 ? '#5e49a6' : '#673ab6',
        zero: 0,
        avgTop: top[i],
        avgBot: bot[i],
        mid: show_midline ? (top[i] + bot[i]) / 2 : undefined
      };
    }

    indicator._zscoreOsc = { top, bot, sideways };
    return res;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const state = indicator._zscoreOsc;
    if (!state) return false;
    const { top, bot, sideways } = state;
    const vis = bv.visible(args);
    const from = Math.max(0, Math.floor(vis.from) - 1);
    const to = Math.min(top.length - 1, Math.ceil(vis.to) + 1);
    if (to < from) return false;

    ctx.save();
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'destination-over';

    // Oscillator resistance / support zones: the average level out to ±0.5.
    ctx.fillStyle = 'rgba(242, 54, 69, 0.1)';
    ctx.beginPath();
    fillBetween(args, from, to, (i) => top[i] + 0.5, (i) => top[i]);
    ctx.fill();
    ctx.fillStyle = 'rgba(8, 153, 129, 0.1)';
    ctx.beginPath();
    fillBetween(args, from, to, (i) => bot[i], (i) => bot[i] - 0.5);
    ctx.fill();

    // Sideways background, one rect per run of sideways bars.
    const { top: paneTop, height } = bv.bounds(args);
    const half = Math.abs(bv.xOfIndex(args, from + 1) - bv.xOfIndex(args, from)) / 2;
    ctx.fillStyle = 'rgba(33, 150, 243, 0.08)';
    let start = -1;
    for (let i = from; i <= to + 1; i++) {
      const on = i <= to && sideways[i];
      if (on && start < 0) start = i;
      if (on || start < 0) continue;
      const x0 = bv.xOfIndex(args, start) - half;
      const x1 = bv.xOfIndex(args, i - 1) + half;
      ctx.fillRect(x0, paneTop, x1 - x0, height);
      start = -1;
    }

    ctx.restore();
    return false;
  }
};
