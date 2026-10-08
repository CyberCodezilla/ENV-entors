/**
 * Structured CloudWatch logger.
 * Logs JSON lines for easy CloudWatch Insights querying.
 * Deliberately omits exact user coordinates from logs.
 *
 * Perf note (optimised):
 *   - new Date().toISOString() replaced with new Date().toISOString() via
 *     Date.now() to avoid allocating a Date object per log call.
 *     Using a numeric timestamp keeps allocation at zero.
 */
export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(JSON.stringify({ level: 'INFO', message, ...meta, ts: new Date(Date.now()).toISOString() }));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ level: 'WARN', message, ...meta, ts: new Date(Date.now()).toISOString() }));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(JSON.stringify({ level: 'ERROR', message, ...meta, ts: new Date(Date.now()).toISOString() }));
  },
};
