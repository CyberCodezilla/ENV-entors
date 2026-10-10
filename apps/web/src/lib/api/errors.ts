export interface AppError {
  kind:
    | 'network'
    | 'validation'
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'rate_limit'
    | 'routing'
    | 'server';
  message: string;
  fieldErrors?: Array<{ path: (string | number)[]; message: string }>;
  requestId?: string;
  retryAfterSec?: number;
}