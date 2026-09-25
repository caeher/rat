'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { RelationSchema } from '@/lib/engine/types';
import type { SandboxSnapshot } from '@/lib/sandbox/types';
import type { SqlParameter } from '../types';
import { executeSqlOnDatabase } from './execute';
import { initSqlEngine } from './initSql';
import type { SqlRuntimeLimits } from './limits';
import type { SqlWorkerRequest, SqlWorkerResponse } from './protocol';
import type { SqlExecutionOutcome } from './types';

export interface RunSqlVerificationParams {
  snapshot: SandboxSnapshot;
  sql: string;
  parameters: SqlParameter[];
  expectedSchema: RelationSchema;
  wasmLocateUrl: string;
  limits?: Partial<SqlRuntimeLimits>;
}

export interface RunSqlVerificationOutcome {
  requestId: number;
  outcome: SqlExecutionOutcome;
  cancelled?: boolean;
}

function canUseWorker(): boolean {
  return typeof Worker !== 'undefined';
}

export function useSqlExecutor() {
  const workerRef = useRef<Worker | null>(null);
  const latestRequestIdRef = useRef(0);
  const pendingHandlerRef = useRef<((response: SqlWorkerResponse) => void) | null>(null);

  useEffect(() => {
    return () => {
      pendingHandlerRef.current = null;
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const ensureWorker = useCallback((): Worker | null => {
    if (!canUseWorker()) {
      return null;
    }
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./sqlite.worker.ts', import.meta.url));
      workerRef.current.onmessage = (event: MessageEvent<SqlWorkerResponse>) => {
        pendingHandlerRef.current?.(event.data);
      };
    }
    return workerRef.current;
  }, []);

  const cancel = useCallback((requestId?: number) => {
    const id = requestId ?? latestRequestIdRef.current;
    const worker = workerRef.current;
    if (worker && id > 0) {
      const msg: SqlWorkerRequest = { type: 'cancel', requestId: id };
      worker.postMessage(msg);
    }
  }, []);

  const runSqlVerification = useCallback(
    (params: RunSqlVerificationParams): Promise<RunSqlVerificationOutcome> => {
      latestRequestIdRef.current += 1;
      const requestId = latestRequestIdRef.current;

      if (latestRequestIdRef.current > 1) {
        cancel(latestRequestIdRef.current - 1);
      }

      const worker = ensureWorker();

      const runMainThread = async (): Promise<RunSqlVerificationOutcome> => {
        try {
          const SQL = await initSqlEngine(() => params.wasmLocateUrl);
          const db = new SQL.Database();
          try {
            const outcome = executeSqlOnDatabase({
              db,
              snapshot: params.snapshot,
              sql: params.sql,
              parameters: params.parameters,
              expectedSchema: params.expectedSchema,
              limits: params.limits,
            });
            return { requestId, outcome };
          } finally {
            db.close();
          }
        } catch (error) {
          return {
            requestId,
            outcome: {
              success: false,
              failureKind: 'initialization',
              message: error instanceof Error ? error.message : 'Failed to initialize SQLite.',
              diagnostics: [],
            },
          };
        }
      };

      if (!worker) {
        return runMainThread();
      }

      return new Promise((resolve) => {
        pendingHandlerRef.current = (response: SqlWorkerResponse) => {
          if (response.requestId !== requestId) {
            return;
          }
          pendingHandlerRef.current = null;
          if (response.type === 'cancelled') {
            resolve({
              requestId,
              cancelled: true,
              outcome: {
                success: false,
                failureKind: 'cancelled',
                message: 'SQL verification was cancelled.',
                diagnostics: [],
              },
            });
            return;
          }
          resolve({ requestId, outcome: response.outcome });
        };

        const msg: SqlWorkerRequest = {
          type: 'execute',
          requestId,
          wasmUrl: params.wasmLocateUrl,
          snapshot: params.snapshot,
          sql: params.sql,
          parameters: params.parameters,
          expectedSchema: params.expectedSchema,
          limits: params.limits,
        };
        worker.postMessage(msg);
      });
    },
    [cancel, ensureWorker]
  );

  return {
    runSqlVerification,
    cancel,
    latestRequestIdRef,
  };
}
