/**
 * Worker observability — tick instrumentation wrapper (AUTOMATION-RUNTIME A0-5).
 *
 * `withTickInstrumentation` wraps a per-tenant tick function so that each
 * invocation emits a structured JSON log line with processed/succeeded/failed/
 * durationMs counts. Errors are logged separately and rethrown.
 */

export interface TickMetrics {
  domain: string;
  tenantId: string;
  processed: number;
  succeeded: number;
  failed: number;
  durationMs: number;
  asOf: string;
}

export interface TickInstrumentationOptions {
  domain: string;
  logger?: (event: {
    domain: string;
    tenantId: string;
    metrics?: TickMetrics;
    error?: { message: string };
  }) => void;
  clock?: () => number;
}

/**
 * Wrap a tick function so that each per-tenant invocation emits a structured
 * JSON line with processed/succeeded/failed/durationMs counts. Errors are
 * logged separately and rethrown so the main loop's per-tenant error handler
 * can decide whether to swallow.
 */
export function withTickInstrumentation<
  TArgs extends { organizationId: string },
  TResult extends {
    processed: number;
    succeeded: number;
    failed: number;
    asOf?: Date;
  }
>(
  fn: (args: TArgs) => Promise<TResult>,
  opts: TickInstrumentationOptions
): (args: TArgs) => Promise<TResult> {
  const logger = opts.logger ?? defaultLogger;
  const clock = opts.clock ?? Date.now;

  return async (args: TArgs) => {
    const start = clock();
    try {
      const result = await fn(args);
      const metrics: TickMetrics = {
        domain: opts.domain,
        tenantId: args.organizationId,
        processed: result.processed ?? 0,
        succeeded: result.succeeded ?? 0,
        failed: result.failed ?? 0,
        durationMs: clock() - start,
        asOf: (result.asOf ?? new Date()).toISOString(),
      };
      logger({ domain: opts.domain, tenantId: args.organizationId, metrics });
      return result;
    } catch (err) {
      logger({
        domain: opts.domain,
        tenantId: args.organizationId,
        error: {
          message: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  };
}

function defaultLogger(event: unknown): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(event));
}
