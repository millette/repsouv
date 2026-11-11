// progress.ts — minimal single-line progress bar, no dependencies.

export interface ProgressOptions {
  /** Output stream. Defaults to stderr so stdout stays clean for data. */
  stream?: NodeJS.WriteStream;
  /** When not a TTY (CI, pipes), print a plain line every 10% instead of staying silent. */
  logWhenNotTTY?: boolean;
  /** Minimum milliseconds between redraws. */
  intervalMs?: number;
}

export interface Progress {
  /**
   * Set the absolute number of completed units (clamped to 0..total).
   * An optional label (e.g. the item being processed) is shown after the percentage, and
   * stays until another label is given; a new label is drawn immediately.
   */
  update(value: number, label?: string): void;
  /** Print a line above the bar without corrupting it (plain line when not a TTY). */
  message(text: string): void;
  /** Draw the final state and release the line. Safe to call more than once. */
  end(): void;
}

export function createProgress(total: number, options: ProgressOptions = {}): Progress {
  const { stream = process.stderr, logWhenNotTTY = false, intervalMs = 100 } = options;

  if (!Number.isFinite(total) || total <= 0) {
    throw new RangeError("total must be positive and finite");
  }

  const tty = stream.isTTY === true;
  let current = 0;
  let lastDraw = -Infinity;
  let lastBucket = -1;
  let lastLoggedPct = -1;
  let rendered = false;
  let ended = false;
  let label = "";

  const ratio = (): number => current / total;
  const percent = (): number => Math.floor(ratio() * 100);

  function drawPlain(force: boolean): void {
    if (!logWhenNotTTY) return;
    const pct = percent();
    const bucket = Math.floor(pct / 10);
    if (bucket > lastBucket || (force && pct !== lastLoggedPct)) {
      lastBucket = bucket;
      lastLoggedPct = pct;
      stream.write(`${pct}%\n`);
    }
  }

  function drawTTY(force: boolean): void {
    const now = performance.now();
    if (!force && now - lastDraw < intervalMs && current < total) return;
    lastDraw = now;

    const columns = stream.columns || 80;
    if (columns < 2) return;

    const pct = `${percent()}%`;
    // "[" + bar + "] " + "100%" = width + 7; keep one spare column to avoid wrapping.
    const width = Math.max(0, Math.min(30, columns - 8));
    const filled = Math.floor(ratio() * width);
    let line =
      width > 0
        ? `[${"#".repeat(filled)}${"-".repeat(width - filled)}] ${pct}`
        : pct.slice(0, columns - 1);
    // Append the label if at least a few columns remain (one is kept spare to avoid wrapping).
    const room = columns - 1 - line.length - 1;
    if (label && room >= 4) line += ` ${label.length > room ? `${label.slice(0, room - 1)}…` : label}`;

    // \r returns to column 0; \x1b[K clears leftovers from a longer previous line.
    stream.write(`\r${line}\x1b[K`);
    rendered = true;
  }

  function draw(force = false): void {
    if (tty) drawTTY(force);
    else drawPlain(force);
  }

  return {
    update(value: number, newLabel?: string): void {
      if (ended) return;
      if (!Number.isFinite(value)) throw new RangeError("progress must be finite");
      current = Math.max(0, Math.min(total, value));
      const labelChanged = newLabel !== undefined && newLabel !== label;
      if (newLabel !== undefined) label = newLabel;
      draw(labelChanged);
    },

    message(text: string): void {
      const barOnLine = tty && rendered && !ended;
      if (barOnLine) stream.write("\r\x1b[K");
      stream.write(`${text}\n`);
      if (barOnLine) draw(true);
    },

    end(): void {
      if (ended) return;
      ended = true;
      draw(true);
      if (tty && rendered) stream.write("\n");
    },
  };
}
