// Z-Score Predictive Zones [AlgoPoint] — the price-band part (force_overlay) of zscore_predict.pine.
// Editor Settings: Overlay on (main chart), Precision = the symbol's price decimals (2 for BTCUSDT, 5 for EURUSD).
// Keep Z-Score Length / Smoothing / Lookback Depth / Thershold the same as in zscore_predict_osc.

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
  // Pine's "Chart Resistance High" / "Chart Support Low" are fully transparent: they only bound the fills.
  figures: [
    { key: 'resBot', type: 'line', title: 'Resistance Low: ', styles: () => ({ color: 'rgba(242, 54, 69, 0.5)', size: 1 }) },
    { key: 'supTop', type: 'line', title: 'Support High: ', styles: () => ({ color: 'rgba(8, 153, 129, 0.5)', size: 1 }) }
  ],

  calc(dataList, indicator) {
    const { length = 144, smooth = 20, history_depth = 25, z_thersh = 1.5 } = indicator.extendData?.inputs || {};
    const n = dataList.length;
    if (n === 0) return [];

    const { vol, mean, sd, top, bot } = zLevels(dataList, length, smooth, history_depth, z_thersh);
    const resHigh = new Array(n);
    const resLow = new Array(n);
    const supHigh = new Array(n);
    const supLow = new Array(n);
    for (let i = 0; i < n; i++) {
      if (sd[i] === undefined) continue;
      resLow[i] = mean[i] + top[i] * sd[i];
      resHigh[i] = mean[i] + (top[i] + 0.5) * sd[i];
      supHigh[i] = mean[i] + bot[i] * sd[i];
      supLow[i] = mean[i] + (bot[i] - 0.5) * sd[i];
    }
    const resTop = vwmaOf(resHigh, vol, 4);
    const resBot = vwmaOf(resLow, vol, 4);
    const supTop = vwmaOf(supHigh, vol, 4);
    const supBot = vwmaOf(supLow, vol, 4);

    const res = new Array(n);
    for (let i = 0; i < n; i++) res[i] = { resBot: resBot[i], supTop: supTop[i] };

    indicator._zscoreBands = { resTop, resBot, supTop, supBot };
    return res;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const state = indicator._zscoreBands;
    if (!state) return false;
    const { resTop, resBot, supTop, supBot } = state;
    const vis = bv.visible(args);
    const from = Math.max(0, Math.floor(vis.from) - 1);
    const to = Math.min(resTop.length - 1, Math.ceil(vis.to) + 1);
    if (to < from) return false;

    ctx.save();
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'destination-over'; // candles stay on top

    ctx.fillStyle = 'rgba(242, 54, 69, 0.15)';
    ctx.beginPath();
    fillBetween(args, from, to, (i) => resTop[i], (i) => resBot[i]);
    ctx.fill();
    ctx.fillStyle = 'rgba(8, 153, 129, 0.15)';
    ctx.beginPath();
    fillBetween(args, from, to, (i) => supTop[i], (i) => supBot[i]);
    ctx.fill();

    ctx.restore();
    return false;
  }
};
