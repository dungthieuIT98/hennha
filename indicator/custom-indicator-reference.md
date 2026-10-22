# Custom Indicator & Drawing API Developer Reference Guide
**Platform Engine**: The Free Chart (Powered by KlineCharts v10+ JavaScript Engine)
**Target Audience**: Developers, Quants, and AI Assistants (Claude, ChatGPT, Grok, Gemini, DeepSeek, Cursor)

---

## 0. Zero-Shot Master System Prompt for AI Models

For source conversion, download the source-specific prompt from the guide page and attach this
reference beside it. The target-runtime contract below applies to PineScript, MetaTrader MQL4/MQL5,
and indicators created from scratch:

```text
You are a Senior Quantitative Developer specializing in building high-performance technical indicators for The Free Chart (powered by KlineCharts v10+ JavaScript Canvas Engine).

Your task is to convert or create a custom indicator faithfully. Report every unsupported or
approximated behavior instead of claiming false parity.

CRITICAL ARCHITECTURE INVARIANTS:
1. COMPATIBILITY REPORT + CONDITIONAL CODE OUTPUT: First provide a short plain-text compatibility
   report. If required source, data, or semantics are missing, list each blocker, request only the
   missing material, and STOP after the report: do not fabricate code. Otherwise provide exactly
   two distinct fenced code blocks and no other fenced blocks:
   - Block 1 (JSON): Inputs Tab schema array defining all user-configurable parameters.
   - Block 2 (JavaScript): Script Tab pure JavaScript factory function returning the indicator object.

2. INPUTS TAB (JSON SCHEMA):
   - Every configurable parameter (length, multiplier, color, toggle, clock time, dropdown) MUST be declared in the JSON schema array:
     [
       { "id": "len", "name": "Period Length", "type": "int", "defval": 14, "min": 1, "max": 500, "step": 1 },
       { "id": "mult", "name": "Multiplier", "type": "float", "defval": 2.0, "min": 0.1, "max": 10.0, "step": 0.1 },
       { "id": "showSignal", "name": "Show Signals", "type": "bool", "defval": true },
       { "id": "bullColor", "name": "Bullish Color", "type": "color", "defval": "#089981", "tab": "style" },
       { "id": "bearColor", "name": "Bearish Color", "type": "color", "defval": "#f23645", "tab": "style" },
       { "id": "startTime", "name": "London Start Time (UTC)", "type": "time", "defval": "07:00" },
       { "id": "endTime", "name": "London End Time (UTC)", "type": "time", "defval": "16:00" },
       { "id": "sessionTime", "name": "London Session (UTC)", "type": "session", "defval": "07:00-16:00" },
       { "id": "maType", "name": "MA Method", "type": "select", "options": ["SMA", "EMA", "WMA", "RMA"], "defval": "EMA" }
     ]
   - CRITICAL TIME RULE: Use "time" with 24-hour "HH:MM" for one clock value and "session" with
     "HH:MM-HH:MM" for one start/end window. NEVER use int or float for hours/minutes of the day.
     In calc(), parse a clock with bv.parseClock(val, fallbackMinutes).
   - CRITICAL TIMEZONE RULE: For any wall-clock or session logic in a named zone, use the bv time
     helpers, which keep Pine's names: bv.hour/minute/second/dayofweek/dayofmonth/month/year(t, tz),
     bv.timestamp(tz, y, m, d, h, mi, s), bv.time(t, session, tz) (null outside, Pine's na),
     bv.session(t, session, tz) -> { start, end, tradingDay } | null, bv.syminfo().timezone.
     With tz omitted they use the symbol's EXCHANGE timezone, exactly like Pine. NEVER call
     Intl.DateTimeFormat, toLocaleString or toLocaleDateString inside a per-bar loop: calc() reruns
     over every bar on every tick, and one Intl call per bar freezes the chart.
   - A "select" may contain at most 40 options. Preserve source enum values and defaults exactly;
     if the source exceeds the cap, report it instead of silently dropping choices.
   - SYMBOL AND TIMEFRAME INPUTS: Pine `input.symbol` -> `"type": "symbol"` (a symbol picker; value
     `"BINANCE:ETHUSDT"`, `""` = the chart's symbol); Pine `input.timeframe` and MQL
     `ENUM_TIMEFRAMES` inputs -> `"type": "timeframe"` (a dropdown; value `"240"`, `"1D"`, `""` = the
     chart's timeframe). Pass both values straight into `bv.security({ symbol, timeframe })`.
   - MANDATORY 1:1 DEFAULT SETTINGS MATCH ("defval"): Every parameter's "defval" in the JSON schema MUST EXACTLY MATCH the source default. Never invent new defaults, change default colors, or flip booleans.
   - RESERVED INPUT IDS — NEVER DECLARE THESE: "showPriceLabel" is owned by the platform. Every indicator that declares at least one figure automatically receives a "Price label" checkbox (default ON) that toggles the value tag on the PRICE SCALE (the chip on the right-hand axis, next to the current price). That tag is painted by the chart engine from the chart's own settings and never reads an indicator's, so an input of your own under this id would be a dead control. Do not declare it, and do not read it in calc() / draw(). This does NOT apply to "showLabels", which is a different, script-owned toggle for text your own draw() paints on the canvas with bv.label.

3. SCRIPT TAB (JAVASCRIPT FACTORY FUNCTION):
   - Must evaluate as a function returning an object:
     return {
       // Name, placement (main chart / sub-pane) and precision are set in the editor's Settings.
       // name, shortName, precision, series, styles, minValue and maxValue returned here are IGNORED.
       figures: [ ... ],
       calc(dataList, indicator) { ... },
       draw(args) { ... }
     };

4. DATA CALCULATION INVARIANTS (`calc`):
   - ALWAYS read parameters from `indicator.extendData?.inputs` with safe default fallbacks:
     const { len = 14, mult = 2.0, showSignal = true } = indicator.extendData?.inputs || {};
   - Return array MUST match `dataList.length` EXACTLY. Return `{}` or `{ key: undefined }` for warmup bars without enough history. NEVER slice, filter, or mutate `dataList`.
   - Each candle in `dataList` has: `{ timestamp, open, high, low, close, volume }`.
   - OTHER TIMEFRAMES AND SYMBOLS: Read them with `bv.security(spec, expression)` (Pine `request.security`) and `bv.securityLowerTf(spec, expression)` (Pine `request.security_lower_tf`), never by re-aggregating `dataList`. `spec = { symbol, timeframe, gaps, lookahead, calcBarsCount }`; `symbol: ''` and `timeframe: ''` mean the chart's own. `expression(bars)` runs on the REQUESTED bars (oldest first) and returns one value per requested bar; the result has one entry per chart bar, or is `undefined` while the data loads (the chart recalculates by itself), so ALWAYS guard: `if (!v) return dataList.map(() => ({}));`. `lookahead: false` (default) never leaks the future. A lower timeframe gives one intrabar per chart bar with `bv.security`, or an array per chart bar with `bv.securityLowerTf`. Limits: 40 symbol/timeframe pairs per script, 200,000 intrabars per script, lower timeframes only from 1s/1m/5m/15m/30m/1h/4h/1d/1w/1M. Full contract in §5.6. Aggregate locally only to DRAW higher-timeframe candles or boxes of the chart's own symbol.
   - Ticks, Bid/Ask, spread, DOM, terminal history and broker time remain unavailable and must be listed in the compatibility report.

5. DECLARATIVE FIGURES & DYNAMIC STYLES:
   - Supported figure types are `line`, `bar`, `rect`, `circle`, and `text`. Draw signal arrows with `bv.label`, `bv.text`, or Canvas rather than inventing an `arrow` figure type.
   - MANDATORY BINDING FOR COLOR/WIDTH INPUTS: KlineCharts paints figures with static default palette colors unless `styles` is defined! If you provide color or width inputs, you MUST bind them via a `styles` callback:
     styles: ({ indicator }) => ({
       color: indicator?.extendData?.inputs?.maColor || '#2962ff',
       size: indicator?.extendData?.inputs?.maWidth || 2
     })
   - SETTINGS TABS: every input stays on the Inputs tab unless it carries `"tab": "style"`; nothing moves on its own. Add `"tab": "style"` to color, line-width and line-style inputs (e.g. `maColor` and `maWidth` above) so they show on the Style tab, and give each one a name that says what it paints ("Asia Color", never a bare "Color"): on Style it no longer sits next to its toggle. Never put `"tab"` on bool toggles (Show X): they stay on Inputs. `"group"` does not move an input.
   - For dynamic colors based on bar calculations (e.g. MACD / Squeeze Momentum):
     styles: ({ data, indicator }) => {
       const current = data?.current; // NEVER use ({ bar }) as bar is undefined!
       const prev = data?.prev;
       const val = current?.val ?? 0;
       return { color: val > 0 ? '#00e676' : '#ff5252' };
     }

6. DIRECT CANVAS 2D DRAWING (`draw`):
   - For custom shapes, zones, order blocks, trendlines, breakout labels, FVGs, SMC, and FUTURE PROJECTIONS (e.g. Ichimoku Cloud / Displaced Moving Averages with offset > 0):
     draw({ ctx, bounding, xAxis, yAxis, indicator }) {
       ctx.save();
       ctx.setLineDash([]); // CRITICAL: Always reset line dash immediately to prevent dashed grid line leakage!
       // Convert indices to X: xAxis.convertToPixel(barIndex) — supports future indices beyond live candle!
       // For future displaced indicators (offset > 0), use realFrom & realTo from args.chart.getVisibleRange().
       // Convert prices to Y: yAxis.convertToPixel(price)
       // Draw zones under candles: ctx.globalCompositeOperation = 'destination-over'
       // Viewport culling for 60fps: if (x2 < 0 || x1 > bounding.width) continue;
       ctx.restore();
       return false; // figures still need the engine's default painter
     }
   - DRAW RETURN CONTRACT: return true only when draw() deliberately painted the entire indicator
     and the engine must suppress every declared figure. Return false (or nothing) when figures
     still need normal painting. A true return with figures commonly makes valid plots disappear.
   - THE `bv` DRAWING HELPERS FAIL SILENTLY — this is the single most common reason a script runs with no error and paints nothing. `bv.box`, `bv.line`, `bv.label` and `bv.text` place shapes by BAR INDEX and PRICE, never by pixel, and they return `false` instead of throwing when the spec is wrong, because an exception on the paint path would take down the whole chart pane. So a misspelt key or a pixel coordinate leaves a blank chart with NO console error. Correct keys: `bv.box(args, { fromIndex, toIndex, top, bottom, color, fillOpacity, borderOpacity, under, text })`; `bv.line(args, { fromIndex, toIndex, price | fromPrice + toPrice, color, width, opacity, dash: [4, 4] })` — there is NO `style` option; `bv.label(args, { index, price, text, color, background, align, baseline, size, offsetX, offsetY })` — `color` is the TEXT colour, `background` the chip, and there is NO `textColor`. Full tables in Section 5.
   - PIXEL-SIZED SHAPES ARE NOT A GAP: a volume histogram whose width is a share of the pane, or a full-height divider, cannot be expressed by `bv.box`. Paint those on `args.ctx` yourself and position them with `bv.bounds`, `bv.xOfIndex`, `bv.yOfPrice` and `bv.halfBar(args, index)` — pass the bar index so an edge meets that bar's own width (Volume candles pack quiet bars narrower).
   - VERTICAL TIME LINES: When the source draws full-height time markers, NEVER substitute them with candle bounding boxes. Draw strokes from Canvas `top` to `bottom` and add clean labels above the candle.
   - COUNTDOWN TIMERS FOR HTF: When the source displays a higher-timeframe close countdown, calculate the true remaining time in `HH:MM:SS` format, not a bar count.

7. TA MATH RECIPES (Embed directly into `calc()`):
   - SMA:
     function calcSMA(src, len) {
       const res = new Array(src.length); let sum = 0;
       for (let i = 0; i < src.length; i++) {
         sum += (src[i] ?? 0);
         if (i >= len) sum -= (src[i - len] ?? 0);
         res[i] = i >= len - 1 ? sum / len : undefined;
       }
       return res;
     }
   - EMA:
     function calcEMA(src, len) {
       const res = new Array(src.length); const k = 2 / (len + 1);
       let ema = null, sum = 0;
       for (let i = 0; i < src.length; i++) {
         const v = src[i];
         if (v === undefined || isNaN(v)) { res[i] = undefined; continue; }
         if (ema === null) { sum += v; if (i === len - 1) { ema = sum / len; res[i] = ema; } }
         else { ema = k * v + (1 - k) * ema; res[i] = ema; }
       }
       return res;
     }
   - Moving averages: DO NOT hand-write one. `bv.ma(values, length, 'SMA'|'EMA'|'WMA'|'RMA')`
     is in scope for the whole script, `calc()` included, and matches the platform's own
     indicators — Wilder's smoothing (RMA) included, which is what RSI and ATR need.
   - ATR:
     function calcATR(dataList, len = 14) {
       const tr = new Array(dataList.length);
       for (let i = 0; i < dataList.length; i++) {
         const h = dataList[i].high, l = dataList[i].low;
         const prevC = i > 0 ? dataList[i - 1].close : dataList[i].open;
         tr[i] = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
       }
       return bv.ma(tr, len, 'RMA');
     }
   - Volume profile: DO NOT hand-write one.
     const { from, to } = bv.visibleBars(args, dataList);
     const profile = bv.volumeProfile(args, dataList.slice(from, to),
                                      { rowLayout: 'rows', rowCount: 24, valueAreaPercent: 70 });
     // -> { ok, bins, poc, vah, val, pocIndex, valIndex, vahIndex, maxBin, maxAbsDelta,
     //      totalVolume, usedTickVolume, low, high, rowHeight }, deeply frozen.
     //    each bin: { low, high, mid, up, down, total }
     //    bins from valIndex..vahIndex are the value area.
     // A histogram row is a PIXEL-width shape, so bv.box cannot express it — bv.box spans bar
     // INDEXES. Paint the rows on args.ctx with fillRect, and use bv.line for the level lines.
     const dev = bv.developingLevels(dataList.slice(from, to), opts, { valueArea: true });
   - Pivots:
     function calcPivots(dataList, left = 10, right = 10) {
       const ph = new Array(dataList.length).fill(null), pl = new Array(dataList.length).fill(null);
       for (let i = left + right; i < dataList.length; i++) {
         const p = i - right, tH = dataList[p].high, tL = dataList[p].low;
         let isPh = true, isPl = true;
         for (let k = p - left; k <= i; k++) {
           if (k === p) continue;
           if (dataList[k].high > tH) isPh = false;
           if (dataList[k].low < tL) isPl = false;
         }
         if (isPh) ph[i] = { index: p, price: tH };
         if (isPl) pl[i] = { index: p, price: tL };
       }
       return { ph, pl };
     }

8. WHAT THE SCRIPT CONTROLS & SUB-PANES:
   - Only `figures`, `calc`, `draw` and `createTooltipDataSource` are read from the returned object.
     The name, the Overlay switch (on = main chart, off = sub-pane) and the precision come from the
     editor's Settings; `name`, `shortName`, `precision`, `series`, `styles`, `minValue` and `maxValue` in the
     returned object are ignored. State the intended placement and precision in the compatibility
     report ("Overlay: off (sub-pane), Precision: 2").
   - A sub-pane always auto-fits the values on screen. To keep an oscillator's 30 / 70 guides in view,
     return them as constant figures on every bar.
   - Figure `styles` callbacks run for every visible bar on every repaint: read values and return a
     small object; never loop, sort or format strings inside them.

9. HARD LIMITS:
   - Script source is limited to `500 * 1024` characters.
   - Inputs are limited to 200 entries; text defaults are limited to 200 characters; each select is
     limited to 40 options.
   - Split an oversized source into coherent, independently useful indicators. Never silently truncate or hide dropped behavior.

10. SECURITY BOUNDARY:
   - Do not emit network calls, DOM access, browser storage, cookies, dynamic evaluation/import,
     timers, workers, prototype mutation, obfuscation, DLL/file/terminal/account access, telemetry,
     licensing checks, or persistence.
   - Strip trading and I/O side effects. Custom indicators calculate and draw only.

11. PERFORMANCE — THE CHART MUST NOT LAG:
   calc() runs on the chart's main thread over EVERY bar on EVERY price update, even while the
   indicator is hidden; draw() runs on every repaint; figure styles callbacks run per visible bar per
   repaint. Anything in the per-bar loop is multiplied by the bar count and again by every tick.
   - NEVER call Intl.DateTimeFormat / formatToParts / toLocaleString / toLocaleDateString /
     toLocaleTimeString inside a per-bar loop. Creating the formatter once does NOT help:
     formatToParts is the cost (270 ms per recalculation at 50,000 one-minute bars, against 11 ms
     through bv.session). NEVER use local Date getters (getHours, getDay, getDate): they use each
     viewer's computer timezone. Use bv.hour / bv.tzParts / bv.time / bv.session with an explicit tz;
     getUTC* is fine for UTC.
   - NO inner loop that walks back over history at every bar (rolling sum, highest, lowest): use
     running totals and bv.ma. Only short fixed lookbacks may be walked.
   - NO find / filter / indexOf / includes / some, and NO unshift / shift / splice(0), on arrays that
     grow with history inside the bar loop. Keep the item being built in a variable; keep a short
     list of still-active items (unmitigated, unexpired) and remove each as it finishes.
   - Parse inputs (split, regex, JSON.parse, bv.parseClock) ONCE before the loop. Do not build
     throwaway arrays (slice, spread, map/filter chains) per bar.
   - Bound every loop by dataList.length or a fixed count; never a while whose exit depends on a value
     that can be NaN. One loop of 10,000,000 passes, or 60 s of busy time, is stopped and the line
     goes blank.
   - When only the last N sessions or structures are drawn, start the scan shortly before them
     (keeping warm-up bars) instead of walking the whole history.
   - draw(): cull every shape with bv.visible(args) BEFORE converting coordinates; no calculation (no
     loops over dataList, no bv.ma, no sorting or searching); ctx.save() and ctx.setLineDash([]) once
     at the start and ctx.restore() once at the end; one path and one stroke per colour; set ctx.font
     outside loops; no shadowBlur or ctx.filter.
   - No console.log.

12. STATE:
   - NEVER write to indicator.extendData: no `indicator.extendData = …` and no extra fields on it. It
     holds the user's saved settings (extendData.inputs); replacing it wipes them, and changing it
     makes the chart recalculate as if a setting changed.
   - Per-bar values go in the array calc() returns. Shapes for draw() go on your own field
     (`indicator._yourName = { … }`), computed in calc() and only read in draw(). Keep only what is
     drawn (for example the last 50 boxes), never a copy of dataList.
```

### MetaTrader (.mq4/.mq5) source boundaries

MQL is not translated safely by replacing syntax. Audit the complete source bundle first: the main
`.mq4`/`.mq5`, every project `.mqh`, and the source of every custom indicator it calls. Compiled
`.ex4`/`.ex5` files cannot be recovered into source.

#### Required result classes

Assign every material source behavior exactly one result in the compatibility report:

| Result | Meaning |
|---|---|
| **Exact/near-exact** | Reproduced from current-chart OHLCV with equivalent state, warmup, gaps, shifts, and visuals. |
| **Static visual approximation** | The calculable visual meaning remains, but tick order, interaction, broker state, or another unavailable behavior is explicitly reduced. |
| **Unsupported and removed** | Side effect or service is outside the indicator sandbox and is omitted openly. |
| **Blocked pending source/input** | Faithful calculation is impossible until a named dependency, contract, or required value is supplied. Stop before generating code. |

#### Audit in this order

1. **Classify on two axes.** Identify the program type: custom indicator, EA/robot, script/service,
   library, or incomplete source. Separately record whether it uses plots/buffers, tick-driven
   state, trades/accounts, chart interaction, other symbols/timeframes, terminal services, and
   external dependencies. A file named “indicator” may still trade; an EA may be mostly visual.
2. **Close the dependency graph.** Inventory `#include`, `#import`, `#resource`, helper classes,
   called functions, `iCustom`, and `IndicatorCreate(IND_CUSTOM)`. A missing `.mqh` or custom
   indicator is blocking when it supplies calculations, constants, state, buffers, or geometry.
   An EX4/EX5 embedded with `#resource` and loaded via `iCustom` is still a missing calculation
   dependency. Bitmap/sound resources may instead be removed and disclosed. Never guess a buffer
   contract or silently substitute close price.
3. **Trace lifecycle and resets.** Inspect legacy `init/start/deinit` and modern
   `OnInit/OnCalculate/OnDeinit`, both MQL5 `OnCalculate` signatures, `begin`, `rates_total`,
   `prev_calculated`, `IndicatorCounted`, new-bar gates, global/static variables, and reset paths.
   Prefer deterministic recomputation from `dataList`; any JavaScript cache must reset when symbol,
   timeframe, inputs, or history changes as MQL initialization would.
4. **Normalize indexing only after tracing it.** Inspect `ArraySetAsSeries`, `ArrayGetAsSeries`,
   `SetIndexBuffer`, each loop direction, and each caller/callee boundary. Shift `0` means the
   current forming bar for a series array. In MQL5, `CopyBuffer(..., start_pos=0, ...)` addresses the
   current bar first but writes copied values oldest-first in physical memory regardless of the
   recipient array's `as_series` flag. The final JavaScript result alone is normalized to the
   platform's chronological `dataList` order.
5. **Preserve bar-state semantics honestly.** Record current-bar repainting, closed-bar freezes,
   warmup, `EMPTY_VALUE` or custom empty sentinels, `PLOT_DRAW_BEGIN`, signed shifts, and partial
   recalculation. `OnTick` is not equivalent to one OHLC evaluation per bar. Intrabar tick order,
   repeated same-bar actions, Bid/Ask crossings, and historical spread cannot be reconstructed;
   offer a labelled bar-close approximation only when that still represents the source logic.
6. **Audit data and metadata requirements.** The runtime exposes only current-chart
   `{ timestamp, open, high, low, close, volume }`. Its single `volume` field must not be treated as
   both MQL tick volume and real volume. Other symbols and other timeframes, higher or lower, ARE
   available through `bv.security` / `bv.securityLowerTf` (§5.6): map `iClose/iOpen/iHigh/iLow/
   iVolume/iTime(sym, period, shift)`, `iMA`/`iRSI`/other `i*` on another symbol or period,
   `CopyRates`/`CopyClose`/… and `iBarShift` with the §5.6 conversion map. Ticks, Bid/Ask, spread,
   DOM, broker/server time and terminal history are unavailable. MQL datetime is epoch seconds;
   `timestamp` is epoch milliseconds.
   `_Symbol`/`_Period` map to the current chart (`symbol: ''`, `timeframe: ''`), but `_Point`, `_Digits`, tick size, contract
   properties, account properties, symbol identity inside `calc()`, and broker timezone are not
   automatically available. Require explicit safe inputs when calculation depends on them.
7. **Trace indicator calls by language version.** MQL4 built-in/custom indicator calls usually
   return the requested shifted value directly. MQL5 calls generally create handles, then use
   `BarsCalculated` and `CopyBuffer`. Preserve handle chains, source buffer number, requested range,
   shift, applied-price source, MA method, and warmup. Map `PRICE_CLOSE`, `PRICE_OPEN`, `PRICE_HIGH`,
   `PRICE_LOW`, `PRICE_MEDIAN`, `PRICE_TYPICAL`, and `PRICE_WEIGHTED` explicitly. Map
   `MODE_SMA`/`MODE_EMA`/`MODE_SMMA`/`MODE_LWMA` to `bv.ma` SMA/EMA/RMA/WMA only after checking the
   source's seed and warmup. Recreate other standard indicator math from current-chart data or a
   documented `bv` helper; `iCustom` requires the dependency source and its buffer contract.
8. **Map inputs by meaning, not storage type.** Preserve configurable `input`, `sinput`, and legacy
   `extern` defaults and labels. Safe integer -> `int`; floating point -> `float`; boolean ->
   `bool`; MQL color -> CSS `color`; enum -> `select`; string -> `text`; one clock -> `time`; one
   window -> `session`; absolute datetime/static anchor -> `text` in `YYYY-MM-DD HH:MM` plus a
   `float` price when required. `input group` is presentation only. Apply the 200-input,
   200-character text, and 40-option select limits before emitting JSON.
9. **Preserve numeric semantics.** MQL integer division truncates toward zero (`3 / 2 == 1`), while
   JavaScript `/` produces `1.5`. Audit casts, modulo, signedness, overflow, `NormalizeDouble`,
   equality, NaN/infinity, bitmasks, and shifts. MQL `long`/`ulong` can exceed JavaScript's exact
   integer range (`Number.MAX_SAFE_INTEGER`); JavaScript bitwise operations coerce to signed 32-bit.
   Block or disclose logic that requires wider exact integers. Never send `EMPTY_VALUE`, NaN,
   infinity, or BigInt to a chart figure.
10. **Trace every visual contract.** Read `#property indicator_*`, MQL4 `SetIndex*`, MQL5
    `IndicatorSet*`/`PlotIndexSet*`, buffer roles (`INDICATOR_DATA`, `INDICATOR_COLOR_INDEX`,
    `INDICATOR_CALCULATIONS`), pane, bounds, levels, precision, labels, gaps, palette, widths,
    line styles, order, and shifts. Use declarative figures for simple values and documented Canvas
    patterns for compound or displaced visuals.
11. **Convert chart objects as static visuals only.** Lines, rectangles, triangles, channels,
    Fibonacci levels, arrows, and text are possible when their time/price anchors are derivable.
    Mouse/keyboard events, selection, dragging, buttons, editable controls, nested charts, bitmaps,
    asynchronous object queues, timeframe visibility flags, and persistence do not remain
    interactive. Replace user-picked anchors with explicit time/price inputs or mark them
    unsupported, and list dropped properties.
12. **Treat an EA as visualization, never execution or backtest parity.** Trace `OnTick`,
    `OnTrade`, `OnTradeTransaction`, and helper calls, then draw only signals and SL/TP levels that
    are derivable from bar data. Remove orders/positions, account/history/margin state, lots,
    slippage, magic numbers, broker fills, tester optimization, and MarketBook/DOM behavior.
13. **Remove unavailable services openly.** This includes DLL/`#import`, file/database access,
    sockets/`WebRequest`, email/FTP/notifications/sound, terminal globals, chart/template mutation,
    timers, licensing/identity, telemetry, persistence, network/DOM/browser storage, dynamic
    evaluation/import, workers, and prototype mutation. Do not emulate them secretly.

#### All MQL plot families

MQL5 defines 18 drawing types. Audit them even when a source sets the type dynamically:

| Family | MQL draw types | Typical target |
|---|---|---|
| Hidden/calculation | `DRAW_NONE` | Calculation-only key; no figure. |
| Lines | `DRAW_LINE`, `DRAW_SECTION` | `line` figure; preserve gaps/segments. |
| Histograms | `DRAW_HISTOGRAM`, `DRAW_HISTOGRAM2` | `bar` or Canvas; the two-buffer variant needs both endpoints. |
| Markers | `DRAW_ARROW` | `bv.label`, `bv.text`, `circle`, or Canvas; preserve arrow code/offset approximately. |
| Connected pairs | `DRAW_ZIGZAG` | Canvas/polyline with source gap and pairing rules. |
| Areas | `DRAW_FILLING` | Canvas fill between two buffers. |
| Synthetic price bars | `DRAW_BARS`, `DRAW_CANDLES` | Canvas using all OHLC buffers; do not replace with one line. |
| Per-point color variants | `DRAW_COLOR_LINE`, `DRAW_COLOR_SECTION`, `DRAW_COLOR_HISTOGRAM`, `DRAW_COLOR_HISTOGRAM2`, `DRAW_COLOR_ARROW`, `DRAW_COLOR_ZIGZAG`, `DRAW_COLOR_BARS`, `DRAW_COLOR_CANDLES` | Same geometry plus the `INDICATOR_COLOR_INDEX` palette buffer. |

MQL4's `DRAW_LINE`, `DRAW_SECTION`, `DRAW_HISTOGRAM`, `DRAW_ARROW`, `DRAW_ZIGZAG`, `DRAW_NONE`,
and compatible color/style settings map into the same audit. A successful conversion preserves or
explicitly approximates every plot; no buffer may disappear merely because it is not buffer 0.

#### Required compatibility report and output gate

The report must state the program classification, dependency inventory, data/timeframe needs,
current-bar/repaint behavior, plot/buffer/object inventory, exact mappings, static approximations,
removed side effects, unsupported requirements, and blockers.

- If any blocker remains, stop after the report and request the missing source or input. Emit no
  placeholder JSON or JavaScript.
- Otherwise emit exactly two fenced blocks: Inputs JSON first, JavaScript factory second.
- A large source near the 500 KB limit should be split only at coherent, independently useful
  visual boundaries, with every omitted subsystem named.

---

## 1. System Architecture & Lifecycle

Custom Indicators in The Free Chart run directly inside the chart's 60fps rendering pipeline using standard JavaScript (ES6+). Every custom indicator consists of two files/tabs:

1. **Inputs Tab (JSON Schema)**: Defines user-configurable properties (lengths, colors, modes) rendered into a native UI settings modal.
2. **Script Tab (JavaScript Factory Function)**: Compiled as a function that receives the `bv` helper API and returns an object with `figures`, `calc()`, and optional `draw()`. It runs in the viewer's browser, on the same thread that paints the chart, so a slow `calc()` or `draw()` makes the chart lag (see Section 8). The name, placement and precision are set in the editor's Settings.

```javascript
// Indicator Structure (Script Tab)
return {
  // Name, placement (main chart / sub-pane) and precision are set in the editor's Settings.
  // name / shortName / precision / series / styles / minValue / maxValue returned here are ignored.
  
  // 1. Declarative plots (Lines, Bars, Circles)
  figures: [ ... ],

  // 2. Data calculation logic (Mandatory)
  calc(dataList, indicator) { ... },

  // 3. 2D Canvas Drawing (Optional: Zones, Boxes, Lines, Labels, SMC)
  draw(args) { ... }
};
```

> **💡 Best Practice — Indicator Naming**: Give your custom indicator a unique and descriptive name (e.g., `My Strategy Pro`, `RSI Divergence [Custom]`). Avoid using identical names to default built-ins (e.g. `RSI`, `MACD`, `EMA`) to avoid naming collisions and ensure easy discovery under **My scripts**.

---

## 2. Inputs Schema (Inputs Tab)

The **Inputs Tab** accepts a JSON Array of parameter definitions:

```json
[
  { "id": "length", "name": "Period Length", "type": "int", "defval": 14, "min": 1, "max": 500, "step": 1 },
  { "id": "mult", "name": "Multiplier", "type": "float", "defval": 2.0, "min": 0.1, "max": 10.0, "step": 0.1 },
  { "id": "showBands", "name": "Show Bands", "type": "bool", "defval": true },
  { "id": "bullColor", "name": "Bullish Color", "type": "color", "defval": "#089981", "tab": "style" },
  { "id": "bearColor", "name": "Bearish Color", "type": "color", "defval": "#f23645", "tab": "style" },
  { "id": "sessionTime", "name": "London Session (UTC)", "type": "session", "defval": "07:00-16:00" },
  { "id": "maType", "name": "MA Method", "type": "select", "options": ["EMA", "SMA", "WMA", "RMA"], "defval": "EMA" }
]
```
> [!IMPORTANT]
> **STRICT 1:1 SOURCE DEFAULT SETTINGS MATCH (`defval`)**:
> When porting an existing PineScript or MQL indicator, every parameter's `"defval"` in the JSON schema MUST MATCH the source default 1:1. Never change default colors, invent different lengths or thresholds, or flip default booleans.

### Supported Input Types:
| Type | Description | UI Component | Properties |
|---|---|---|---|
| `"int"` | Integer number | Number input with spin buttons | `id`, `name`, `defval`, `min`, `max`, `step` |
| `"float"` | Floating point number | Number input with decimal step | `id`, `name`, `defval`, `min`, `max`, `step` |
| `"bool"` | Boolean toggle | Checkbox (left-aligned preceding label) | `id`, `name`, `defval` (`true` / `false`) |
| `"color"` | Hex color string | Palette Color Picker popover | `id`, `name`, `defval` — `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()/rgba()`, or `"transparent"` / `"none"` for "do not paint" |
| `"session"` | Time window range | Double Time Dropdowns `[ HH:MM 🕒 ] — [ HH:MM 🕒 ]` | `id`, `name`, `defval` (`"07:00-16:00"`) |
| `"time"` | Single time or range | Time Dropdown `[ HH:MM 🕒 ]` (15-min intervals) | `id`, `name`, `defval` (`"07:00"`) |
| `"text"` | Single line text | Input text box | `id`, `name`, `defval` (max 200 chars) |
| `"select"` | Dropdown menu | Single select popover menu | `id`, `name`, `options: ["A", "B"]` (max 40), `defval` |
| `"symbol"` | Another symbol | Symbol picker (the Compare search) with a reset to the chart symbol | `id`, `name`, `defval` (`""` = chart symbol, or `"BINANCE:ETHUSDT"`); the script receives `"EXCHANGE:SYMBOL"` or `""` |
| `"timeframe"` | Another timeframe | Dropdown of the chart's timeframes plus "Chart timeframe" | `id`, `name`, `defval` (`""` = chart timeframe, or a resolution: `"60"`, `"240"`, `"1D"`, `"1W"`, `"1M"`) |

### Which tab an input appears on

The settings dialog splits inputs across two tabs. Only where a control is drawn changes: every
value still reaches your script as `indicator.extendData.inputs[id]`.

- Nothing moves on its own: a `"color"` input stays on the **Inputs** tab like any other until it
  carries `"tab": "style"`.
- Add `"tab": "style"` to any input to move it to the **Style** tab. Use it for colors, line widths
  and line-style selects. The dialog never guesses: a width is an `int` like a length, and a color's
  name does not say what it paints.
- Give every input you move a name that says what it paints: `"Asia Color"`, not `"Color"`. On the
  Style tab it no longer sits next to its toggle, so its name is all the user has to go on. A
  Pine-style script that names seven colors `"Color"` and explains each by its position reads fine
  on Inputs and is unusable on Style.
- Visibility toggles (`"Show Asia"`) stay on the **Inputs** tab. Do not put `"tab"` on them.
- `"tab"` is not `"group"`. A Pine-style `"group"` title is accepted and ignored; it moves nothing.
  Any `"tab"` value other than `"style"` is ignored too, never a validation error.

```json
[
  { "id": "length", "name": "Length", "type": "int", "defval": 20, "min": 1, "max": 500 },
  { "id": "showAsia", "name": "Show Asia", "type": "bool", "defval": true },
  { "id": "lineColor", "name": "Line Color", "type": "color", "defval": "#2962ff", "tab": "style" },
  { "id": "lineWidth", "name": "Line Width", "type": "int", "defval": 2, "min": 1, "max": 4, "tab": "style" }
]
```

Inputs tab: Length, Show Asia. Style tab: Line Color, Line Width.

A figure also gets its own Style rows (Colour, Thickness, Line style) from the slot the dialog
writes. When your figure's `styles` callback decides a value itself — the usual binding to an input
color — the matching row is hidden, so your input is the one control for it.

### Reserved: the platform's own inputs

One control is added for you and **must not be declared**:

| Id | Control | Appears on | Default |
|---|---|---|---|
| `showPriceLabel` | **Price label** checkbox | any indicator whose `figures` array is non-empty | on |

It toggles the tag on the **price scale** showing that indicator's latest value. The chart engine
paints that tag from global chart styles and never consults an indicator's own settings, so a value
your script owns could never reach it — the host reads this one, not your script. Declaring it
yourself produces a second control that does nothing.

An indicator with `figures: []` puts nothing on the price scale and correctly gets no such row.

`showLabels` is a **different** control and remains yours: it governs text your own `draw()` paints
on the canvas with `bv.label`, not the axis tag. The chart-wide switch on the price scale's
right-click menu still wins when it is off.

### Accessing Inputs in Script:
```javascript
const {
  length = 14,
  mult = 2.0,
  showBands = true,
  bullColor = '#089981',
  bearColor = '#f23645',
  sessionTime = '07:00-16:00'
} = indicator.extendData?.inputs || {};
```

---

## 3. Datafeed Structure (`dataList`)

The `calc(dataList, indicator)` function receives the complete array of historical candles. Each element `dataList[i]` contains:

```javascript
{
  timestamp: 1672531140000, // Unix timestamp in milliseconds (UTC)
  open: 1825.50,            // Open price (Number)
  high: 1830.20,            // High price (Number)
  low: 1822.10,             // Low price (Number)
  close: 1828.75,           // Close price (Number)
  volume: 145020            // Volume (Number)
}
```

### Critical Rules for `calc()`:
1. **Length Invariant**: `calc()` **MUST** return an array whose length is **EXACTLY EQUAL** to `dataList.length`.
2. **Missing / Warmup Bars**: For bars prior to the calculation period, return `{}` or `{ key: undefined }` (or `NaN`), never slice the array.
3. **No Mutations**: Never mutate properties of `dataList`.

---

## 4. Source → Pure JavaScript TA Math Library

Use the runtime helper algorithms in `calc()` to reproduce source calculations without external dependencies:

```javascript
// ─── Simple Moving Average (SMA) ───
function calcSMA(src, len) {
  const n = src.length;
  const res = new Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const val = src[i];
    sum += (val ?? 0);
    if (i >= len) sum -= (src[i - len] ?? 0);
    res[i] = i >= len - 1 ? sum / len : undefined;
  }
  return res;
}

// ─── Exponential Moving Average (EMA) ───
function calcEMA(src, len) {
  const n = src.length;
  const res = new Array(n);
  const alpha = 2 / (len + 1);
  let ema = null;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const val = src[i];
    if (val === undefined || isNaN(val)) { res[i] = undefined; continue; }
    if (ema === null) {
      sum += val;
      if (i === len - 1) { ema = sum / len; res[i] = ema; }
    } else {
      ema = alpha * val + (1 - alpha) * ema;
      res[i] = ema;
    }
  }
  return res;
}

// ─── Wilder's Smoothing / RMA (Used in RSI & ATR) ───
function calcRMA(src, len) {
  const n = src.length;
  const res = new Array(n);
  const alpha = 1 / len;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const val = src[i];
    if (i < len) {
      sum += (val ?? 0);
      res[i] = sum / (i + 1);
    } else {
      res[i] = alpha * (val ?? 0) + (1 - alpha) * res[i - 1];
    }
  }
  return res;
}

// ─── Average True Range (ATR) ───
function calcATR(dataList, len = 14) {
  const n = dataList.length;
  const tr = new Array(n);
  for (let i = 0; i < n; i++) {
    const h = dataList[i].high;
    const l = dataList[i].low;
    const prevC = i > 0 ? dataList[i - 1].close : dataList[i].open;
    tr[i] = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
  }
  return calcRMA(tr, len);
}

// ─── Standard Deviation (StDev) ───
function calcStDev(src, len) {
  const n = src.length;
  const res = new Array(n);
  const sma = calcSMA(src, len);
  for (let i = 0; i < n; i++) {
    if (i < len - 1 || sma[i] === undefined) { res[i] = undefined; continue; }
    let sumSq = 0;
    for (let k = i - len + 1; k <= i; k++) {
      const d = src[k] - sma[i];
      sumSq += d * d;
    }
    res[i] = Math.sqrt(sumSq / len);
  }
  return res;
}

// ─── Linear Regression (LinReg) ───
function calcLinReg(src, len, offset = 0) {
  const n = src.length;
  const res = new Array(n);
  for (let i = 0; i < n; i++) {
    if (i < len - 1) { res[i] = undefined; continue; }
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let k = 0; k < len; k++) {
      const x = k;
      const y = src[i - len + 1 + k];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    const slope = (len * sumXY - sumX * sumY) / (len * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / len;
    res[i] = intercept + slope * (len - 1 - offset);
  }
  return res;
}

// ─── Pivot High & Pivot Low Detection ───
function calcPivots(dataList, leftBars = 10, rightBars = 10) {
  const n = dataList.length;
  const ph = new Array(n).fill(null);
  const pl = new Array(n).fill(null);
  for (let i = leftBars + rightBars; i < n; i++) {
    const p = i - rightBars;
    const targetH = dataList[p].high;
    const targetL = dataList[p].low;
    let isPh = true, isPl = true;
    for (let k = p - leftBars; k <= i; k++) {
      if (k === p) continue;
      if (dataList[k].high > targetH) isPh = false;
      if (dataList[k].low < targetL) isPl = false;
    }
    if (isPh) ph[i] = { index: p, price: targetH };
    if (isPl) pl[i] = { index: p, price: targetL };
  }
  return { ph, pl };
}
```

---

## 5. The `bv` Helper API (Drawing, Geometry & Maths)

`bv` is injected into every script. You cannot import anything, so `bv` plus the raw `ctx` that
`draw(args)` hands you is the whole toolbox.

> [!CAUTION]
> **Two rules that cause silent blank charts.**
>
> 1. **`bv.box`, `bv.line`, `bv.label` and `bv.text` place shapes by BAR INDEX and PRICE — never by
>    pixel.** Pass a pixel where an index belongs and nothing paints.
> 2. **They return `false` instead of throwing.** An exception while painting would take down the
>    whole pane, not just your indicator, so every helper treats a bad spec as "draw nothing". A
>    misspelt option therefore produces a blank chart with **no console error and no editor error**.
>
> If your `draw` runs and nothing appears, check your spec keys against the tables below first.
>
> Shapes that are genuinely pixel-sized — a volume histogram whose width is a share of the pane, a
> full-height session divider — are not a gap. Paint those on `ctx` yourself, positioned with
> `bv.bounds`, `bv.xOfIndex`, `bv.yOfPrice` and `bv.halfBar(args, index)`.

### 5.1 Drawing primitives

| Helper | Spec keys | Notes |
|---|---|---|
| `bv.box(args, spec)` | `fromIndex`, `toIndex`, `top`, `bottom`, `color`, `fillOpacity` (0.1), `borderOpacity` (0.55), `under` (true), `text`, `textOpacity` (0.9), `minTextWidth` (34), `padding` (4) | Rectangle across bars and prices. Fill and border both derive from `color`. `borderOpacity: 0` draws no border. `under: true` composites beneath the candles, which is what you want for session shading. |
| `bv.line(args, spec)` | `fromIndex`, `toIndex`, `price` **or** `fromPrice` + `toPrice`, `color`, `width` (1), `opacity` (1), `dash` | `price` is the horizontal shorthand. Dashes are an array — `dash: [4, 4]`. There is **no** `style: 'dashed'` option. |
| `bv.label(args, spec)` | `index`, `price`, `text`, `color`, `background`, `align` (`'left'`), `baseline` (`'bottom'`), `size`, `weight`, `padding` (4), `offsetX`, `offsetY`, `opacity` (1) | `color` is the TEXT colour and `background` the chip behind it. Omit `background` for plain text. There is **no** `textColor`. An empty `text` paints nothing. |
| `bv.text(args, spec)` | same as `bv.label` | `bv.label` with the chip forced off. There is **no** `font` key — size comes from `size` / `weight`. |

```javascript
// Session shading, under the candles, with its name above it
bv.box(args, {
  fromIndex: openIdx, toIndex: closeIdx,
  top: sessionHigh, bottom: sessionLow,
  color: inputs.sessionColor, fillOpacity: 0.12, borderOpacity: 0.6,
  under: true, text: 'London'
});

// A level, dashed, across the bars it describes
bv.line(args, { fromIndex: from, toIndex: to - 1, price: poc, color: '#f23645', width: 2 });
bv.line(args, { fromIndex: from, toIndex: to - 1, price: vah, color: '#2962ff', dash: [4, 4] });

// A chip, and the same thing as plain text
bv.label(args, { index: i, price: bar.high, text: 'BOS', color: '#ffffff', background: '#10b981', align: 'center' });
bv.text(args,  { index: i, price: bar.high, text: 'BOS', color: '#10b981', align: 'center', offsetY: -8 });
```

### 5.2 Geometry — everything here returns PIXELS

| Helper | Returns | Notes |
|---|---|---|
| `bv.bounds(args)` | `{ left, top, width, height, right, bottom }` | The pane being painted. |
| `bv.visible(args)` | `{ from, to }` | The viewport's bar range, **UNCLAMPED** — its right edge deliberately runs past the last bar to describe the empty space there. This is the RIGHT one for culling (`if (shape.toIndex < from || shape.fromIndex > to) return`), because a shape projected past the last candle is still on screen. Never slice `dataList` with it. |
| `bv.visibleBars(args, dataList)` | `{ from, to }` | The same range clamped to bars that exist. **Slice with this one.** |
| `bv.halfBar(args, index?)` | `number` | Half a candle's width. Add or subtract it to turn a bar index into a bar EDGE. Pass the bar's `index` for that bar's own half width: on Volume candles bars are packed and a quiet bar is narrower. Without an index, the standard half width. |
| `bv.xOfIndex(args, index)` | `number` | X pixel for a bar index. `NaN` if the axis cannot place it. |
| `bv.yOfPrice(args, price)` | `number` | Y pixel for a price. `NaN` if the axis cannot place it. |

```javascript
// The correct way to narrow a range, and the reason bv.visible alone is wrong
const { from, to } = bv.visibleBars(args, dataList);
const window = dataList.slice(from, to);

// A pixel-space shape bv.box cannot express: a bar whose width is a share of the pane
const { left, right } = bv.bounds(args);
ctx.save();
ctx.globalCompositeOperation = 'destination-over';   // candles are painted BEFORE indicators
ctx.fillStyle = bv.withAlpha(inputs.color, 0.45);
ctx.fillRect(right, bv.yOfPrice(args, row.high), -(right - left) * 0.3 * share, rowHeight);
ctx.restore();
```

### 5.3 Colour, time and text formatting

| Helper | Returns | Notes |
|---|---|---|
| `bv.withAlpha(color, alpha)` | `string` | `#089981` -> `rgba(8, 153, 129, alpha)`; `#rgb` expands first. Anything it cannot parse is returned untouched, so an existing `rgba(...)` degrades to "use as given" rather than to a broken colour. |
| `bv.clamp(v, lo, hi)` | `number` | Clamp a scalar. Use it on pixel coordinates before painting: a shape a thousand screens wide is legal arithmetic and a pathological rectangle for the rasteriser. |
| `bv.parseClock(text, fallback = 0)` | `number` | `'13:30'` -> `810` minutes since midnight. Returns `fallback` for anything unparseable, so a bad `time` input cannot leak `NaN` into your maths. |
| `bv.inWindow(t, start, end)` | `boolean` | Session test in minutes, wrapping midnight. End-exclusive. |
| `bv.windowMinutes(start, end)` | `number` | Session length in minutes, wrapping midnight. |
| `bv.detectBarMs(dataList)` | `number` | The chart's bar interval, measured from the data rather than assumed. Needed to project past the last candle, where there are no bars to read an interval from. |
| `bv.font(args, { size, weight })` | `{ css, size, color }` | The chart's own axis typography. Assign `ctx.font = bv.font(args).css` so your canvas text follows a theme change instead of freezing at one hard-coded font. |
| `bv.precision(args)` | `number` | The symbol's price decimals, `2` when unknown. |
| `bv.priceText(args, value, decimals)` | `string` | A price formatted the way the chart itself prints it, thousands separator and decimal folding included. `decimals` defaults to `bv.precision(args)`. Prefer it over `toFixed` so your labels match the price scale. |

### 5.4 Maths — do not hand-write these

| Helper | Returns | Notes |
|---|---|---|
| `bv.ma(values, length, type)` | `Array<number\|null>` | `'SMA'`, `'EMA'`, `'WMA'` or `'RMA'`. A non-array source gives `[]`. **Mind the warm-up: SMA and WMA are `null` for the first `length - 1` bars, but EMA and RMA seed on the first value and return a number from bar 0.** An unrecognised type behaves as WMA. |
| `bv.volumeProfile(args, bars, opts)` | frozen object | `opts`: `rowLayout` (`'rows'` \| `'ticks'`), `rowCount`, `ticksPerRow`, `tickSize`, `valueAreaPercent`. Returns `{ ok, bins, poc, vah, val, pocIndex, valIndex, vahIndex, maxBin, maxAbsDelta, totalVolume, usedTickVolume, low, high, rowHeight }`, each bin `{ low, high, mid, up, down, total }`. Bins `valIndex..vahIndex` are the value area. Rows cap at 500; past that you get `{ ok: false, reason: 'too-many-rows' }`. |
| `bv.developingLevels(bars, opts, { valueArea })` | `{ poc, vah, val }` | One entry per bar, `null` until defined. Same `opts` as `bv.volumeProfile`. VAH and VAL are only filled when `valueArea: true`. |

**The profile result is deeply frozen and cached.** Pass `args` as the first argument and repeated
frames reuse the same object instead of rebinning — the cache is keyed to your indicator instance and
to the settings plus the bar range, so a scroll or a settings change rebuilds it and nothing else
does. Read the result; never write to it.

```javascript
const { from, to } = bv.visibleBars(args, dataList);
const opts = { rowLayout: 'rows', rowCount: inputs.rows, valueAreaPercent: inputs.vaPercent };
const profile = bv.volumeProfile(args, dataList.slice(from, to), opts);
if (!profile.ok) return;

for (let i = 0; i < profile.bins.length; i++) {
  const bin = profile.bins[i];
  if (!bin.total) continue;
  const inValueArea = i >= profile.valIndex && i <= profile.vahIndex;
  // ... paint bin.total / profile.maxBin of the available width, at bv.yOfPrice(args, bin.mid)
}
```

### 5.5 Time & sessions (Pine-style)

Same names, arguments and numbering as Pine, so a conversion is a rename. All of them are cheap
enough to call once per bar: a zone's UTC offset is cached per hour, so they cost about as much as
plain `Date` arithmetic.

**Default timezone = the symbol's exchange timezone**, like Pine's `syminfo.timezone`
(`America/New_York` for OANDA gold and US indices, `UTC` for crypto). The chart's display-timezone
setting never changes a result, which is also Pine's rule.

**`tz` accepts** an IANA name (`'America/New_York'`, `'Europe/London'`), `'UTC'`, or a fixed offset
in Pine's sign: `'UTC+7'`, `'GMT-03:30'`, `'GMT+0100'` (`UTC+7` is 7 hours AHEAD of UTC). Omitted,
`null`, `''` or `'exchange'` means the exchange timezone. An unknown zone returns `NaN`/`null` and
logs one console warning.

| Helper | Pine | Returns |
|---|---|---|
| `bv.hour(t, tz)`, `bv.minute`, `bv.second` | `hour(time, tz)` … | `0–23`, `0–59`, `0–59` |
| `bv.dayofweek(t, tz)` | `dayofweek(time, tz)` | **Sunday = 1** … Saturday = 7 |
| `bv.dayofmonth(t, tz)`, `bv.month`, `bv.year` | `dayofmonth` … | `1–31`, **January = 1**, full year |
| `bv.tzParts(t, tz)` | — | `{ year, month, dayofmonth, hour, minute, second, dayofweek, minuteOfDay, offsetMinutes }` in one lookup, or `null` |
| `bv.timestamp(tz, y, m, d, h = 0, mi = 0, s = 0)` | `timestamp(tz, …)` | UTC ms. A local time skipped by DST moves forward by the gap; a repeated one takes the earlier instant. Out-of-range fields roll over like `Date`. |
| `bv.time(t, session, tz)` | `time(tf, session, tz)` | `t` inside the session, `null` (Pine's `na`) outside |
| `bv.session(t, session, tz)` | `time_tradingday` & co. | `{ start, end, tradingDay }` (UTC ms) of the session instance containing `t`, or `null`. `tradingDay` is 00:00 UTC of the trading date. |
| `bv.syminfo()` | `syminfo.*` | `{ ticker, timezone, session }` of the chart's symbol |

**Session strings:** `'0930-1600'`, `'0930-1600:23456'` (Pine day digits, Sunday = 1),
`'09:30-16:00'` (the `session` input's own format) or `'24x7'`. The end is exclusive. A start at or
after the end is an overnight session: `'1800-1700'` runs from 18:00 to 17:00 the next day and
belongs to the day it ENDS on (Sunday evening is Monday's session), and the day digits filter on
that trading day. `'1700-1700'` is a 24-hour session from 17:00.

**Read `bv.syminfo()` before any `await`.** The exchange timezone is known while `calc()` and
`draw()` run synchronously. After an `await` the default falls back to `UTC`, so capture it first:
`const tz = bv.syminfo().timezone;`.

```javascript
calc(dataList, indicator) {
  const tz = bv.syminfo().timezone;              // or an input: 'America/New_York'
  return dataList.map((bar) => {
    const s = bv.session(bar.timestamp, '1800-1700', tz);  // the trading day this bar belongs to
    const isRth = bv.time(bar.timestamp, '0930-1600:23456', 'America/New_York') !== null;
    return { rth: isRth ? bar.close : null, dayOpen: s && s.start === bar.timestamp ? bar.open : null };
  });
}
```

---

### 5.6 Other timeframes & symbols — `bv.security` / `bv.securityLowerTf`

Read another timeframe (higher or lower) or another symbol inside `calc()`. These are the Pine
`request.security` and `request.security_lower_tf`. They work in scripts you write in the editor.

```javascript
const calc = (dataList, indicator) => {
  const { symbol = '', timeframe = '240', length = 20 } = indicator.extendData?.inputs || {};
  // EMA computed on the REQUESTED bars (an EMA of H4 closes), then placed on every chart bar.
  const ema = bv.security({ symbol, timeframe }, (bars) => bv.ma(bars.map((b) => b.close), length, 'EMA'));
  if (!ema) return dataList.map(() => ({}));      // still loading: the chart recalculates by itself
  return dataList.map((_, i) => ({ ema: ema[i] }));
};
```

| `spec` field | Meaning |
|---|---|
| `symbol` | `''` = the chart's symbol; `'BINANCE:ETHUSDT'` or `'ETHUSDT-binance'` |
| `timeframe` | `''` = the chart's; `'15m'`, `'4h'`, `'1d'`, `'1w'`, `'1M'`, or a resolution `'240'`, `'1D'` |
| `lookahead` | `false` (default): a chart bar sees the newest requested bar that had CLOSED by its own close, so history shows only what was known live. `true`: the requested bar that contains the chart bar (shows the future on history, repaints) |
| `gaps` | `false` (default): the value carries forward on every chart bar. `true`: a value only on the chart bar where a new one first appears, `undefined` elsewhere |
| `calcBarsCount` | `0` / omitted: as many requested bars as the chart holds, widened to cover the chart's time span. A positive number: at least that many requested bars. On a lower timeframe it is the number of intrabars wanted |

- **`expression(bars)`** runs on the REQUESTED series' bars `{ timestamp, open, high, low, close,
  volume }`, oldest first, and must return an array with one value per requested bar. Without it each
  value is the requested bar itself.
- **Result:** one entry per chart bar, or `undefined` while the data loads. Always guard it.
- **Alignment** is by each bar's real (session-aware) close time, so daily and weekly bars of
  forex, metals and stocks line up with their exchange sessions.
- **The forming chart bar** shows the developing requested bar.
- **Lower timeframe:** `bv.security` gives ONE intrabar per chart bar: the last one (`lookahead:
  false`) or the first (`lookahead: true`); the forming chart bar always shows the newest.
  `bv.securityLowerTf(spec, expression)` gives EVERY intrabar of each chart bar as an array, oldest
  first, `[]` where there is none. Its timeframe must be lower than or equal to the chart's.

```javascript
// Volume of every 5m bar inside each chart bar (e.g. on a 1h chart: arrays of 12)
const vols = bv.securityLowerTf({ timeframe: '5m' }, (bars) => bars.map((b) => b.volume));
if (!vols) return dataList.map(() => ({}));
return dataList.map((_, i) => ({ total: vols[i].reduce((s, v) => s + v, 0), count: vols[i].length }));
```

**Limits**

- 40 different symbol/timeframe pairs per script. Calling the same pair again is free.
- 200,000 intrabars per script, shared by all its lower-timeframe requests in call order. Chart bars
  older than that get `[]` (or `undefined` from `bv.security`).
- A lower timeframe must be one of `1s` (where the symbol has seconds), `1m`, `5m`, `15m`, `30m`,
  `1h`, `4h`, `1d`, `1w`, `1M`.
- Scripts that call these run on the main thread, not the background calculator.
- Not available in the repository's built-in indicator modules (`utils/klineCustomIndicators/`): there
  the call throws "not available here yet".

**Alerts.** An indicator using `bv.security` can be used in an alert on OANDA, Binance and NASDAQ
symbols at 1m to 1M. Every series it requests must be on those exchanges and timeframes, and a lower
timeframe than the chart's is refused for alerts. The alert reads the other series as it is stored
when the chart bar is evaluated.

**Conversion map**

| Source | Use |
|---|---|
| Pine `request.security(sym, tf, expr, gaps, lookahead)` | `bv.security({ symbol, timeframe, gaps, lookahead }, (bars) => …)` |
| Pine `request.security_lower_tf(sym, tf, expr)` | `bv.securityLowerTf({ symbol, timeframe }, (bars) => …)` |
| Pine `input.symbol` / `input.timeframe` | input types `"symbol"` / `"timeframe"` |
| MQL `iClose/iOpen/iHigh/iLow/iVolume/iTime(sym, period, shift)` | Build the shifted field inside the expression, then let `bv.security` align it: `bv.security({ symbol, timeframe }, (bars) => bars.map((_, i) => bars[i - shift]?.close))`. Never apply `shift` by looking back CHART bars on the aligned result. |
| MQL `iMA` / `iRSI` / other `i*` on another symbol or period | The indicator computed on the requested bars: `bv.security({ symbol, timeframe }, (bars) => bv.ma(bars.map((b) => b.close), n, 'EMA'))` |
| MQL `CopyRates` / `CopyClose` / … on another symbol or period | The `bars` argument of the expression (oldest first, unlike MQL series order) |
| MQL `iBarShift(sym, period, time)` | Not needed: the alignment is done for you; inside the expression use bar timestamps |
| MQL `PERIOD_*` lower than the chart | `bv.securityLowerTf` (all intrabars) or `bv.security` (one intrabar) |
| MQL `PERIOD_M1` … `PERIOD_MN1`, `_Symbol` | `'1m'` … `'1M'`, `''` |

## 6. Declarative Plots (`figures`)

`figures` defines standard chart plots that scale automatically with the price or oscillator axis:

> **Declaring a figure also gets you the price-scale tag, for free.** Every figure's latest value is
> shown as a tag on the price scale, and your indicator's settings automatically gain a **Price
> label** checkbox (on by default) to turn those tags off. You declare nothing for this — see
> *Reserved: the platform's own inputs* in section 2. An indicator that declares no figures and
> paints everything in `draw()` puts nothing on the price scale, and correctly gets no such control.

> [!CAUTION]
> **MANDATORY: Dynamic Binding for Configurable Figure Colors & Widths**
> KlineCharts renders figures with static default palette colors unless a `figure.styles` callback is defined.
> If your indicator defines color or line-width settings in `inputs` (e.g. `vwapColor`, `vwapLineWidth`), you **MUST** attach a `styles` callback reading `indicator.extendData?.inputs`.
> If you omit `styles`, KlineCharts ignores the user's input values and edits in the Settings modal will **fail silently** without changing the line color or width on the chart canvas!
> Give the bound color input `"tab": "style"` so it shows on the **Style** tab; the figure's own Colour row is hidden there because your callback decides it. Give a bound width input `"tab": "style"` too, so it sits next to the color.

```javascript
figures: [
  {
    key: 'ma',
    type: 'line', // 'line' | 'bar' | 'circle'
    title: 'EMA: ',
    styles: ({ indicator }) => ({
      color: indicator.extendData?.inputs?.maColor || '#2962ff',
      size: 2,
      style: 'solid' // 'solid' | 'dashed'
    })
  },
  {
    key: 'hist',
    type: 'bar',
    baseValue: 0,
    title: 'Histogram: ',
    styles: ({ data, indicator }) => {
      const current = data?.current; // CRITICAL: NEVER use ({ bar })
      const prev = data?.prev;
      const val = current?.hist ?? 0;
      const prevVal = prev?.hist ?? 0;
      const col = val >= 0 
        ? (val > prevVal ? '#00e676' : '#26a69a') 
        : (val < prevVal ? '#ff5252' : '#ef5350');
      return { color: col };
    }
  }
]
```

---

## 7. The 4 Gold Standard Architecture Archetypes

### Archetype 1: Multi-Line Overlay (Bollinger Bands / Moving Average Cloud)

#### Inputs Tab (JSON):
```json
[
  { "id": "length", "name": "Period Length", "type": "int", "defval": 20, "min": 1, "max": 200 },
  { "id": "mult", "name": "StdDev Multiplier", "type": "float", "defval": 2.0, "min": 0.1, "max": 10.0, "step": 0.1 },
  { "id": "basisColor", "name": "Basis Line Color", "type": "color", "defval": "#ff9800", "tab": "style" },
  { "id": "bandColor", "name": "Bands Line Color", "type": "color", "defval": "#2196f3", "tab": "style" }
]
```

#### Script Tab (JavaScript):
```javascript
// Name, Overlay (on: main chart) and precision (2) are set in Editor Settings.
return {
  figures: [
    { key: 'upper', type: 'line', title: 'Upper: ', styles: ({ indicator }) => ({ color: indicator.extendData?.inputs?.bandColor || '#2196f3', size: 1 }) },
    { key: 'basis', type: 'line', title: 'Basis: ', styles: ({ indicator }) => ({ color: indicator.extendData?.inputs?.basisColor || '#ff9800', size: 2 }) },
    { key: 'lower', type: 'line', title: 'Lower: ', styles: ({ indicator }) => ({ color: indicator.extendData?.inputs?.bandColor || '#2196f3', size: 1 }) }
  ],

  calc(dataList, indicator) {
    const { length = 20, mult = 2.0 } = indicator.extendData?.inputs || {};
    const closes = dataList.map(b => b.close);
    const n = dataList.length;
    const res = new Array(n);

    // SMA and StDev
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += closes[i];
      if (i >= length) sum -= closes[i - length];
      
      if (i >= length - 1) {
        const mean = sum / length;
        let sumSq = 0;
        for (let k = i - length + 1; k <= i; k++) {
          const d = closes[k] - mean;
          sumSq += d * d;
        }
        const stdev = Math.sqrt(sumSq / length);
        res[i] = {
          basis: mean,
          upper: mean + stdev * mult,
          lower: mean - stdev * mult
        };
      } else {
        res[i] = {};
      }
    }
    return res;
  }
};
```

---

### Archetype 2: Sub-Pane Oscillator with Dynamic Histogram (Squeeze Momentum)

#### Inputs Tab (JSON):
```json
[
  { "id": "lengthBB", "name": "Bollinger Bands Length", "type": "int", "defval": 20, "min": 5, "max": 100 },
  { "id": "multBB", "name": "Bollinger Bands Mult", "type": "float", "defval": 2.0, "min": 0.5, "max": 5.0, "step": 0.1 },
  { "id": "lengthKC", "name": "Keltner Channel Length", "type": "int", "defval": 20, "min": 5, "max": 100 },
  { "id": "multKC", "name": "Keltner Channel Mult", "type": "float", "defval": 1.5, "min": 0.5, "max": 5.0, "step": 0.1 }
]
```

#### Script Tab (JavaScript):
```javascript
// Name, Overlay (off: sub-pane) and precision (4) are set in Editor Settings.
return {
  figures: [
    {
      key: 'val',
      type: 'bar',
      baseValue: 0,
      title: 'Hist: ',
      styles: ({ data }) => {
        const current = data?.current;
        const prev = data?.prev;
        const val = current?.val ?? 0;
        const prevVal = prev?.val ?? 0;
        let color = '#26a69a';
        if (val > 0) color = val > prevVal ? '#00e676' : '#26a69a';
        else color = val < prevVal ? '#ff5252' : '#ef5350';
        return { color };
      }
    },
    {
      key: 'sqz',
      type: 'circle',
      title: 'Squeeze: ',
      styles: ({ data }) => {
        const on = data?.current?.sqzOn;
        return {
          color: on ? '#000000' : '#808080',
          size: 4
        };
      }
    }
  ],

  calc(dataList, indicator) {
    const { lengthBB = 20, multBB = 2.0, lengthKC = 20, multKC = 1.5 } = indicator.extendData?.inputs || {};
    const n = dataList.length;
    const res = new Array(n);
    if (n === 0) return res;

    // Calculate ATR for Keltner
    const tr = new Array(n);
    for (let i = 0; i < n; i++) {
      const h = dataList[i].high, l = dataList[i].low;
      const prevC = i > 0 ? dataList[i - 1].close : dataList[i].open;
      tr[i] = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    }
    const trSma = new Array(n);
    let trSum = 0;
    for (let i = 0; i < n; i++) {
      trSum += tr[i];
      if (i >= lengthKC) trSum -= tr[i - lengthKC];
      trSma[i] = i >= lengthKC - 1 ? trSum / lengthKC : 0;
    }

    // BB and KC calculation
    let cSum = 0;
    for (let i = 0; i < n; i++) {
      cSum += dataList[i].close;
      if (i >= lengthBB) cSum -= dataList[i - lengthBB].close;

      if (i >= Math.max(lengthBB, lengthKC) - 1) {
        const basis = cSum / lengthBB;
        let sumSq = 0;
        for (let k = i - lengthBB + 1; k <= i; k++) {
          const d = dataList[k].close - basis;
          sumSq += d * d;
        }
        const dev = Math.sqrt(sumSq / lengthBB) * multBB;
        const upperBB = basis + dev;
        const lowerBB = basis - dev;

        const upperKC = basis + trSma[i] * multKC;
        const lowerKC = basis - trSma[i] * multKC;

        const sqzOn = (lowerBB > lowerKC) && (upperBB < upperKC);

        // Momentum delta: close minus the midpoint of the KC range and the basis
        let highest = -Infinity, lowest = Infinity;
        for (let k = i - lengthKC + 1; k <= i; k++) {
          if (dataList[k].high > highest) highest = dataList[k].high;
          if (dataList[k].low < lowest) lowest = dataList[k].low;
        }
        const avg = (highest + lowest + basis) / 3;
        const delta = dataList[i].close - avg;

        res[i] = {
          val: delta,
          sqz: 0,
          sqzOn
        };
      } else {
        res[i] = {};
      }
    }
    return res;
  }
};
```

---

### Archetype 3: Session Boxes & Daily Dividers Overlay

Sessions in a named timezone through `bv.session` (DST handled), the box being built kept in a variable instead of searched for, inputs parsed once, and a `draw()` that culls by `bv.visible` and strokes every divider in one path.

#### Inputs Tab (JSON):
```json
[
  { "id": "showLondon", "name": "Show London Session", "type": "bool", "defval": true },
  { "id": "londonSess", "name": "London Session", "type": "session", "defval": "03:00-12:00" },
  { "id": "londonColor", "name": "London Color", "type": "color", "defval": "#2157f3", "tab": "style" },
  { "id": "showNy", "name": "Show New York Session", "type": "bool", "defval": true },
  { "id": "nySess", "name": "New York Session", "type": "session", "defval": "08:00-17:00" },
  { "id": "nyColor", "name": "New York Color", "type": "color", "defval": "#ff5d00", "tab": "style" },
  { "id": "timezone", "name": "Session Timezone", "type": "select", "options": ["America/New_York", "Europe/London", "UTC"], "defval": "America/New_York" },
  { "id": "fillAlpha", "name": "Fill Opacity", "type": "float", "defval": 0.12, "min": 0.01, "max": 1.0, "step": 0.01, "tab": "style" },
  { "id": "showDividers", "name": "Show Daily Dividers", "type": "bool", "defval": true }
]
```

#### Script Tab (JavaScript):
```javascript
// Name, Overlay (on: main chart) and precision are set in Editor Settings.
return {
  figures: [],

  calc(dataList, indicator) {
    const {
      showLondon = true, londonSess = '03:00-12:00', londonColor = '#2157f3',
      showNy = true, nySess = '08:00-17:00', nyColor = '#ff5d00',
      timezone = 'America/New_York', showDividers = true
    } = indicator.extendData?.inputs || {};
    const n = dataList.length;

    // Read the inputs ONCE, before the bar loop. bv.session takes '03:00-12:00' as it is.
    const sessions = [
      { label: 'London', color: londonColor, range: londonSess, enabled: showLondon },
      { label: 'New York', color: nyColor, range: nySess, enabled: showNy }
    ].filter((s) => s.enabled).map((s) => ({ ...s, open: null }));

    const boxes = [];
    const dividers = [];
    const DAY = ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];   // Pine numbering: Sunday = 1
    let lastDay = null;

    for (let i = 0; i < n; i++) {
      const bar = dataList[i];
      const t = bar.timestamp;

      if (showDividers) {
        const day = bv.dayofmonth(t, timezone);                    // cached, DST-aware; never Intl per bar
        if (lastDay !== null && day !== lastDay) dividers.push({ index: i, label: DAY[bv.dayofweek(t, timezone)] });
        lastDay = day;
      }

      for (const s of sessions) {
        const sess = bv.session(t, s.range, timezone);             // { start, end, tradingDay } or null
        if (!sess) { s.open = null; continue; }
        if (!s.open || s.open.start !== sess.start) {
          // The box being built lives in a variable: no boxes.find(...) per bar.
          s.open = { start: sess.start, label: s.label, color: s.color, fromIndex: i, toIndex: i, top: bar.high, bottom: bar.low };
          boxes.push(s.open);
        } else {
          s.open.toIndex = i;
          if (bar.high > s.open.top) s.open.top = bar.high;
          if (bar.low < s.open.bottom) s.open.bottom = bar.low;
        }
      }
    }

    // What draw() needs goes on our OWN field, never into extendData. Keep only what we draw.
    indicator._sessions = { boxes: boxes.slice(-60), dividers: dividers.slice(-60) };
    return dataList.map(() => ({}));
  },

  draw(args) {
    const { ctx, indicator } = args;
    const state = indicator._sessions;
    if (!state) return false;
    const { fillAlpha = 0.12, showDividers = true } = indicator.extendData?.inputs || {};
    const { from, to } = bv.visible(args);
    const { top, bottom } = bv.bounds(args);

    ctx.save();
    ctx.setLineDash([]);

    // 1. Session boxes under the candles. Cull first, so off-screen boxes cost nothing.
    for (const box of state.boxes) {
      if (box.toIndex < from || box.fromIndex > to) continue;
      bv.box(args, {
        fromIndex: box.fromIndex, toIndex: box.toIndex, top: box.top, bottom: box.bottom,
        color: box.color, fillOpacity: fillAlpha, borderOpacity: 0.6, under: true, text: box.label
      });
    }

    // 2. Daily dividers: full-height lines, one path and one stroke for all of them.
    if (showDividers) {
      const labels = [];
      ctx.strokeStyle = 'rgba(120, 123, 134, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (const d of state.dividers) {
        if (d.index < from || d.index > to) continue;
        const x = Math.round(bv.xOfIndex(args, d.index) - bv.halfBar(args, d.index)) + 0.5;
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        labels.push([d.label, x]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(120, 123, 134, 0.8)';
      ctx.font = bv.font(args, { size: 10 }).css;                  // set once, outside the loop
      for (const [label, x] of labels) ctx.fillText(label, x + 4, top + 14);
    }

    ctx.restore();
    return false;
  }
};
```

---

### Pattern: Full-Height Vertical Time Lines (`extend.both`) vs Bounding Boxes (`bv.box`)

When converting indicators that draw vertical time markers, macro intervals, session open/close boundaries, or time dividers (e.g. PineScript's `line.new(bar_index, low - ta.tr, bar_index, high + ta.tr, extend=extend.both, style=line.style_dotted)`):

#### 🚨 The Invariant Rule:
1. **Never substitute vertical lines with candle bounding boxes (`bv.box(..., top: bar.high, bottom: bar.low)`)!**
   - Wrapping bars in a bounding box produces chunky colored bricks over candle bodies instead of the clean vertical grid/time lines users expect.
2. **Span full canvas height from top to bottom**:
   - Use `bv.bounds(args)` to get `{ top, bottom, left, right }`.
   - Calculate pixel `x = bv.xOfIndex(args, line.index)`.
   - Use crisp 1px stroke positioning: `const px = Math.round(x) + 0.5`.
   - Stroke directly from canvas `top` to `bottom`:
     ```javascript
     const { top, bottom, left, right } = bv.bounds(args);
     const x = bv.xOfIndex(args, line.index);
     if (Number.isFinite(x) && x >= left && x <= right) {
         ctx.save();
         ctx.strokeStyle = line.color;
         ctx.lineWidth = line.width || 1;
         if (line.dash) ctx.setLineDash(line.dash); // [2, 3] for dotted, [5, 5] for dashed
         ctx.beginPath();
         const px = Math.round(x) + 0.5; // sharp 1px vertical line
         ctx.moveTo(px, top);
         ctx.lineTo(px, bottom);
         ctx.stroke();
         ctx.restore();

         // Clean floating label above candle high without heavy background chips
         if (line.text) {
             bv.text(args, {
                 index: line.index,
                 price: line.price, // bar.high
                 text: line.text,   // e.g. 'M.O.', 'M.C.'
                 color: line.color,
                 size: 10,
                 align: 'center',
                 offsetY: -8,
             });
         }
     }
     ```
3. **Background shading between vertical lines**:
   - If the original script does not explicitly paint filled boxes, keep background shading **disabled by default** (`showShading: false`, subtle `fillOpacity: 0.05` when toggled on) to match original visual fidelity.

---

### Archetype 4: Smart Money Concepts & Geometric Pattern Engine

#### Inputs Tab (JSON):
```json
[
  { "id": "swingsLength", "name": "Swing Period", "type": "int", "defval": 50, "min": 10, "max": 200 },
  { "id": "showBOS", "name": "Show BOS / CHoCH", "type": "bool", "defval": true },
  { "id": "bullColor", "name": "Bullish Color", "type": "color", "defval": "#089981", "tab": "style" },
  { "id": "bearColor", "name": "Bearish Color", "type": "color", "defval": "#f23645", "tab": "style" },
  { "id": "showOB", "name": "Show Order Blocks", "type": "bool", "defval": true },
  { "id": "obCount", "name": "Max OB Boxes", "type": "int", "defval": 5, "min": 1, "max": 20 }
]
```

#### Script Tab (JavaScript):
```javascript
// Name, Overlay (on: main chart) and precision (2) are set in Editor Settings.
return {
  figures: [],

  calc(dataList, indicator) {
    const { swingsLength = 50, showOB = true, obCount = 5 } = indicator.extendData?.inputs || {};
    const n = dataList ? dataList.length : 0;
    const res = new Array(n);
    if (n === 0) return res;

    let swingHigh = NaN, swingLow = NaN;
    let swingHighIdx = -1, swingLowIdx = -1;
    let crossedH = false, crossedL = false;
    let trend = 0;

    const breaks = [];
    const active = [];   // UNMITIGATED order blocks only, newest last. Mitigated ones leave the list.

    for (let i = 0; i < n; i++) {
      const bar = dataList[i];
      res[i] = {};

      if (i >= swingsLength * 2) {
        const p = i - swingsLength;
        const targetH = dataList[p].high, targetL = dataList[p].low;
        let isPh = true, isPl = true;
        for (let k = p - swingsLength; k <= i; k++) {
          if (k === p) continue;
          if (dataList[k].high > targetH) isPh = false;
          if (dataList[k].low < targetL) isPl = false;
        }
        if (isPh) { swingHigh = targetH; swingHighIdx = p; crossedH = false; }
        if (isPl) { swingLow = targetL; swingLowIdx = p; crossedL = false; }
      }

      const prevC = i > 0 ? dataList[i - 1].close : bar.open;

      // Bullish break
      if (!isNaN(swingHigh) && !crossedH && prevC <= swingHigh && bar.close > swingHigh) {
        crossedH = true;
        const tag = trend === -1 ? 'CHoCH' : 'BOS';
        trend = 1;
        breaks.push({ tag, isBull: true, level: swingHigh, from: swingHighIdx, to: i });

        if (showOB) {
          let mn = Infinity, obIdx = -1;
          for (let k = swingHighIdx; k <= i; k++) {
            if (dataList[k].low < mn) { mn = dataList[k].low; obIdx = k; }
          }
          if (obIdx >= 0) {
            active.push({ isBull: true, high: dataList[obIdx].high, low: dataList[obIdx].low, from: obIdx });
          }
        }
      }

      // Bearish break
      if (!isNaN(swingLow) && !crossedL && prevC >= swingLow && bar.close < swingLow) {
        crossedL = true;
        const tag = trend === 1 ? 'CHoCH' : 'BOS';
        trend = -1;
        breaks.push({ tag, isBull: false, level: swingLow, from: swingLowIdx, to: i });

        if (showOB) {
          let mx = -Infinity, obIdx = -1;
          for (let k = swingLowIdx; k <= i; k++) {
            if (dataList[k].high > mx) { mx = dataList[k].high; obIdx = k; }
          }
          if (obIdx >= 0) {
            active.push({ isBull: false, high: dataList[obIdx].high, low: dataList[obIdx].low, from: obIdx });
          }
        }
      }

      // Mitigations: walk only the still-active blocks and drop each one as it is mitigated,
      // instead of re-checking every block ever found on every later bar.
      for (let k = active.length - 1; k >= 0; k--) {
        const ob = active[k];
        if ((!ob.isBull && bar.high > ob.high) || (ob.isBull && bar.low < ob.low)) active.splice(k, 1);
      }
    }

    // Our own field, never extendData. Keep only what draw() shows.
    indicator._smc = {
      breaks: breaks.slice(-100),
      orderBlocks: active.slice(-obCount),
      totalBars: n
    };
    return res;
  },

  draw(args) {
    const { ctx, bounding, xAxis, yAxis, indicator } = args;
    const smc = indicator._smc;
    if (!smc) return false;

    const { showBOS = true, bullColor = '#089981', bearColor = '#f23645', showOB = true } = indicator.extendData?.inputs || {};
    const left = 0, right = bounding.width || ctx.canvas.width;
    const { from, to } = bv.visible(args);

    ctx.save();
    ctx.setLineDash([]);

    // 1. Draw Structure Breaks (cull by bar index before converting anything)
    if (showBOS) {
      for (const sb of smc.breaks) {
        if (sb.to < from || sb.from > to) continue;
        const x1 = xAxis.convertToPixel(sb.from);
        const x2 = xAxis.convertToPixel(sb.to);
        if (Math.max(x1, x2) < left || Math.min(x1, x2) > right) continue;

        const y = yAxis.convertToPixel(sb.level);
        const col = sb.isBull ? bullColor : bearColor;

        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();

        ctx.fillStyle = col;
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sb.tag, (x1 + x2) / 2, y - 3);
        ctx.restore();
      }
    }

    // 2. Draw Active Order Blocks
    if (showOB) {
      for (const ob of smc.orderBlocks) {
        const x1 = xAxis.convertToPixel(ob.from);
        const x2 = xAxis.convertToPixel(smc.totalBars - 1);
        if (x2 < left || x1 > right) continue;

        const drawX1 = Math.max(x1, left);
        const drawX2 = Math.min(x2, right);
        const w = drawX2 - drawX1;
        if (w <= 0) continue;

        const y1 = Math.min(yAxis.convertToPixel(ob.high), yAxis.convertToPixel(ob.low));
        const y2 = Math.max(yAxis.convertToPixel(ob.high), yAxis.convertToPixel(ob.low));
        const h = y2 - y1;
        if (h <= 0) continue;

        const col = ob.isBull ? bullColor : bearColor;

        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = ob.isBull ? 'rgba(8, 153, 129, 0.2)' : 'rgba(242, 54, 69, 0.2)';
        ctx.fillRect(drawX1, y1, w, h);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX1, y1, w, h);
        ctx.fillStyle = col;
        ctx.font = '9px sans-serif';
        ctx.fillText(ob.isBull ? '+OB' : '-OB', drawX1 + 4, y1 + 10);
        ctx.restore();
      }
    }

    ctx.restore();
    return true;
  }
};
```

---

## 8. Performance: Keep the Chart Smooth

A custom indicator runs inside the chart, on the same thread that paints the candles, scrolls, zooms and moves the crosshair. A slow indicator makes the whole chart lag for everyone who adds it. Every rule here comes from a real indicator that made a user's chart lag.

### 8.1 When your code runs

| Code | Runs again when | Covers |
|---|---|---|
| `calc(dataList, indicator)` | every price update (several a second on an active market), when older history loads, when an input changes, on a symbol or timeframe switch | every bar in `dataList`: tens of thousands on a 1-minute chart |
| `draw(args)` | every repaint: scroll, zoom, crosshair move, every price update | once per frame |
| `figures[].styles` | every repaint | once per visible bar, per figure |

- Hiding an indicator does not always stop its `calc()`. Treat it as running all the time.
- One loop of 10,000,000 passes in a single run, or a script that keeps the chart busy for 60 seconds, is stopped: its line goes blank and the error appears in the editor Log.
- A `calc()` using `bv.security` that has not finished after 10 seconds is abandoned and its line goes blank.
- These limits only stop a frozen tab. A script far below them can still lag on every tick.

### 8.2 Fast `calc()`: per-bar rules

Anything inside the per-bar loop is multiplied by the number of bars and again by every price update: 50,000 one-minute bars with a 200-bar lookback is 10 million steps, on every tick.

| Don't (inside the bar loop) | Do instead |
|---|---|
| `Intl.DateTimeFormat`, `formatToParts`, `toLocaleString`, `toLocaleDateString`, `toLocaleTimeString` | `bv.hour`, `bv.tzParts`, `bv.time`, `bv.session`, which cache the timezone work. A formatter created once does not help: `formatToParts` is the cost. Measured at 50,000 one-minute bars: 270 ms per recalculation with one Intl call per bar, 11 ms through `bv.session`. |
| `new Date(t).getHours()`, `getDay()`, `getDate()` | `bv.hour(t, tz)`, `bv.dayofweek(t, tz)`… The local getters use each viewer's own computer timezone, so different people see different sessions. `getUTC*` is fine when you mean UTC. |
| an inner loop walking back over the last N bars at every bar (rolling sum, highest, lowest) | a running total (add the bar that enters, subtract the one that leaves); `bv.ma` for averages; keep any walked lookback short |
| `find`, `filter`, `indexOf`, `includes`, `some` on a list that grows with history | keep the item being built in a variable; keep a short list of still-active items and remove each as it finishes |
| `unshift`, `shift`, `splice(0, …)` on large arrays | `push` and read from the end; trim once after the loop |
| `split`, regular expressions, `JSON.parse`, `bv.parseClock` on input values | parse every input once, before the loop |
| `slice`, `[...array]`, `map` / `filter` chains built per bar | one pass with plain `for` loops; build each array once |
| a `while` whose exit depends on a value that can be `NaN` or never change | bound every loop by `dataList.length` or a fixed count |
| walking the whole history when only the last few sessions or structures are shown | start the scan shortly before the part you draw, keeping warm-up bars |
| `console.log` | remove it before publishing; in `calc()` it runs every tick |

```javascript
// ❌ DON'T — Intl on every bar. Even with the formatter created once,
// formatToParts runs per bar, on every price update.
const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false });
for (let i = 0; i < dataList.length; i++) {
    const parts = fmt.formatToParts(new Date(dataList[i].timestamp));   // slow
    // ...
}

// ❌ DON'T — new Date(t).getHours() uses each VIEWER's computer timezone,
// so the same script shows different sessions to different people.

// ✅ DO — the bv time helpers cache the timezone work.
const tz = 'America/New_York';
for (let i = 0; i < dataList.length; i++) {
    const t = dataList[i].timestamp;
    const minuteOfDay = bv.tzParts(t, tz)?.minuteOfDay;          // 0..1439, DST handled
    const inNyAm = bv.time(t, '09:30-11:00', tz) !== null;         // Pine's time(tf, session, tz)
    const sess = bv.session(t, '20:00-00:00', tz);                 // { start, end, tradingDay } | null
    // ...
}
```

```javascript
// ❌ DON'T — re-add the last `length` bars on every bar: bars × length steps, every update.
for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = i - length + 1; k <= i; k++) sum += dataList[k]?.close ?? 0;
    out[i] = { ma: sum / length };
}

// ✅ DO — a running sum: add the bar that enters, subtract the bar that leaves.
let sum = 0;
for (let i = 0; i < n; i++) {
    sum += dataList[i].close;
    if (i >= length) sum -= dataList[i - length].close;
    out[i] = i >= length - 1 ? { ma: sum / length } : {};
}
// Better still for averages: bv.ma(values, length, 'SMA' | 'EMA' | 'WMA' | 'RMA').

// ❌ DON'T — search a list that grows with history, inside the bar loop.
for (let i = 0; i < n; i++) {
    let box = boxes.find((b) => b.toIndex === i - 1);           // walks every past box, every bar
    // ...
}

// ✅ DO — keep the open item in a variable, and only the still-active items in a list.
let open = null;
const active = [];                                               // e.g. unmitigated order blocks
for (let i = 0; i < n; i++) {
    const bar = dataList[i];
    if (bv.time(bar.timestamp, session, tz) !== null) {
        if (!open) { open = { fromIndex: i, toIndex: i, top: bar.high, bottom: bar.low }; boxes.push(open); }
        else { open.toIndex = i; open.top = Math.max(open.top, bar.high); open.bottom = Math.min(open.bottom, bar.low); }
    } else {
        open = null;
    }
    // drop finished items instead of re-checking them forever; the active list stays short
    for (let k = active.length - 1; k >= 0; k--) {
        if (bar.low < active[k].low) active.splice(k, 1);
    }
}

// ✅ DO — parse inputs ONCE, before the loop (not split / regex / parseClock per bar).
const startMin = bv.parseClock(inputs.startTime, 420);
```

### 8.3 Where to keep state

- **Never write to `indicator.extendData`.** It belongs to the platform: `extendData.inputs` holds the user's settings, saved with their layout and edited in Settings. `indicator.extendData = …` wipes every setting the user made; adding your own fields makes the chart treat each change as a settings change and recalculate again.
- **Keep `draw()` data on your own field**: compute shapes in `calc()`, store them as `indicator._yourName = { … }`, and only read them in `draw()`. Keep only what you draw (for example the last 50 boxes), never a copy of `dataList`.
- **Per-bar values belong in the array `calc()` returns**; figures, the legend and the tooltip read them from there.

```javascript
calc(dataList, indicator) {
    // ❌ DON'T — extendData holds the user's saved settings.
    // indicator.extendData = { lines: [] };          // wipes every input the user set
    // indicator.extendData.lines = lines;            // looks like a settings change, triggers recalcs

    // ✅ DO — store what draw() needs on your OWN field, computed here, read in draw().
    const lines = [];
    // ... fill lines (keep only what you will draw, e.g. the last 50) ...
    indicator._nyOpen = { lines };
    return dataList.map(() => ({}));
},

draw(args) {
    const state = args.indicator._nyOpen;
    if (!state) return false;
    // read state.lines; no calculation here
    return false;
}
```

### 8.4 Fast `draw()`: per-frame rules

1. **Cull first**: skip every shape outside `bv.visible(args)` before converting coordinates or painting it.
2. **No calculation**: no loops over `dataList`, no `bv.ma`, no sorting or searching. Read what `calc()` stored.
3. `ctx.save()` and `ctx.setLineDash([])` once at the start, `ctx.restore()` once at the end, not around every shape.
4. **Batch strokes**: one `beginPath`, many `moveTo` / `lineTo`, one `stroke` per colour.
5. Set `ctx.font` and `fillStyle` outside loops; avoid `measureText` for many labels every frame.
6. Avoid `shadowBlur` and `ctx.filter`.
7. Render background fills with `ctx.globalCompositeOperation = 'destination-over'` (or `bv.box` with `under: true`) so candles stay on top; reset before stroking borders or text.
8. A vertical time line is one full-height stroke from `bv.bounds(args)`, never a `bv.box` around a candle.

```javascript
draw(args) {
    const { ctx, indicator } = args;
    const state = indicator._myState;
    if (!state) return false;

    ctx.save();                 // once per frame, not once per shape
    ctx.setLineDash([]);

    const { from, to } = bv.visible(args);
    const { top, bottom } = bv.bounds(args);

    // One path for every visible vertical line of the same colour, one stroke.
    ctx.strokeStyle = indicator.extendData?.inputs?.lineColor ?? '#ff0000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const line of state.lines) {
        if (line.index < from || line.index > to) continue;   // cull BEFORE converting
        const x = Math.round(bv.xOfIndex(args, line.index)) + 0.5;
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
    }
    ctx.stroke();

    // Boxes: cull, then let bv.box place them.
    for (const box of state.boxes) {
        if (box.toIndex < from || box.fromIndex > to) continue;
        bv.box(args, box);
    }

    ctx.restore();
    return false;
}
```

### 8.5 Checklist before publishing

- Open a 1-minute chart with plenty of history, add the indicator, scroll and zoom: it should feel the same as without it.
- No Intl, `toLocale…` or local `Date` getters inside `calc()`.
- No loop inside the bar loop that walks back over history, apart from short fixed lookbacks.
- No `find` / `filter` / `indexOf` / `unshift` on growing arrays inside the bar loop.
- `indicator.extendData` is only read, never written.
- `draw()` culls with `bv.visible` and does no calculation.
- Every input in the Inputs tab is actually read by the script.
- No `console.log` left in.

---

## 9. Positive Offset & Future Projections (Displacement past Running Candle)

KlineCharts' built-in `figures` (`type: 'line'`, etc.) only render from bar `0` to `dataList.length - 1`. If an indicator has a **positive offset / future displacement** (`offset > 0` or `displacement > 0`), it MUST use custom `draw(args)` to extend the lines / shapes into future space past the running candle.

### 📌 Indicator Classification — Which Ones Need Future Projections?

| Category | Examples | Future Extension Needed? | Implementation Pattern |
| :--- | :--- | :--- | :--- |
| **Future Displaced Indicators** | Ichimoku Cloud (Span A, Span B, Kumo Cloud `offset = +26`), Displaced Moving Average (DMA `offset > 0`) | **YES (+Offset bars)** | Store `indicator._state = { rawSeries, offset, totalBars }` in `calc()`. In `draw()`, use `realTo` and `xAxis.convertToPixel(i)` up to `totalBars - 1 + offset`. |
| **Right-Extended Projections** | Fibonacci Time Zones, Projected Target levels, Unmitigated Order Blocks, FVG Right Extensions | **YES (+Projected bars)** | In `draw()`, draw lines/boxes to `totalBars - 1 + extensionBars` or `realTo`. |
| **Session / Day Open Lines** | Midnight Open, Daily Open, Initial Balance | **YES (to end of day session)** | In `draw()`, extend horizontal lines across future bars of the same trading day. |
| **Standard Oscillators** | RSI, MACD, Stochastic, CCI, ATR, ADX, Williams %R | **NO (stops at live candle)** | Standard `calc()` + `figures` (`offset = 0`). |
| **Standard Overlays** | Bollinger Bands, SuperTrend, EMA/SMA (with `offset = 0`), Parabolic SAR | **NO (stops at live candle)** | Standard `calc()` + `figures` (`offset = 0`). |
| **Past Displaced (Lagging)** | Chikou Span (Ichimoku Lagging `offset = -26`) | **NO (stops in the past)** | In `calc()`, `res[i] = dataList[i + disp].close` (`null` for `i > n - 1 - disp`). Stops 26 bars BEFORE live candle. |

### 🛠️ Future Extension Code Pattern for `calc()` & `draw()`:
```javascript
// In calc(dataList, indicator):
indicator._state = { rawSeries, offset: 26, totalBars: dataList.length };

// In draw(args):
const { rawSeries, offset, totalBars } = indicator._state;
const maxIndex = totalBars - 1 + offset;
const visibleRange = args.chart?.getVisibleRange?.();
// CRITICAL: Use realFrom & realTo (NOT from/to which are clamped to dataList.length - 1)
const from = Math.max(0, Math.floor((visibleRange?.realFrom ?? visibleRange?.from ?? 0) - 2));
const to = Math.min(maxIndex, Math.ceil((visibleRange?.realTo ?? maxIndex) + 2));

// Draw lines / polygon across future bars:
for (let i = from; i <= to; i++) {
    const val = (i - offset >= 0 && i - offset < totalBars) ? rawSeries[i - offset] : null;
    if (val !== null) {
        const x = args.xAxis.convertToPixel(i); // xAxis converts future bar indices accurately!
        const y = args.yAxis.convertToPixel(val);
        // ... ctx lineTo / moveTo
    }
}
```
