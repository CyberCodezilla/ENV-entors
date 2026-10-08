/**
 * Structured CloudWatch logger.
 * Logs JSON lines for easy CloudWatch Insights querying.
 * Deliberately omits exact user coordinates from logs.
 */
export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(JSON.stringify({ level: 'INFO', message, ...meta, ts: new Date().toISOString() }));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ level: 'WARN', message, ...meta, ts: new Date().toISOString() }));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(JSON.stringify({ level: 'ERROR', message, ...meta, ts: new Date().toISOString() }));
  },
};
