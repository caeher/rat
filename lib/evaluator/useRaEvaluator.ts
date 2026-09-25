'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { ASTNode, EvaluationOptions, QueryExecutionResult, RelationData } from '@/lib/engine/types';
import { evaluateRaAst } from './evaluate';
import type { RaWorkerRequest, RaWorkerResponse } from './protocol';

export interface RunEvaluationParams {
  ast: ASTNode;
  relations: Record<string, RelationData>;
  options?: EvaluationOptions;
}

export interface RunEvaluationOutcome {
  requestId: number;
  result: QueryExecutionResult;
  cancelled?: boolean;
}

function canUseWorker(): boolean {
  return typeof Worker !== 'undefined';
}

export function useRaEvaluator() {
  const workerRef = useRef<Worker | null>(null);
  const latestRequestIdRef = useRef(0);
  const pendingHandlerRef = useRef<((response: RaWorkerResponse) => void) | null>(null);

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
      workerRef.current = new Worker(new URL('./raEvaluator.worker.ts', import.meta.url));
      workerRef.current.onmessage = (event: MessageEvent<RaWorkerResponse>) => {
        pendingHandlerRef.current?.(event.data);
      };
    }
    return workerRef.current;
  }, []);

  const cancel = useCallback((requestId?: number) => {
    const id = requestId ?? latestRequestIdRef.current;
    const worker = workerRef.current;
    if (worker && id > 0) {
      const msg: RaWorkerRequest = { type: 'cancel', requestId: id };
      worker.postMessage(msg);
    }
  }, []);

  const runEvaluation = useCallback(
    (params: RunEvaluationParams): Promise<RunEvaluationOutcome> => {
      latestRequestIdRef.current += 1;
      const requestId = latestRequestIdRef.current;

      if (latestRequestIdRef.current > 1) {
        cancel(latestRequestIdRef.current - 1);
      }

      const worker = ensureWorker();
      if (!worker) {
        const result = evaluateRaAst({
          ast: params.ast,
          relations: params.relations,
          options: params.options,
        });
        return Promise.resolve({ requestId, result });
      }

      return new Promise((resolve) => {
        pendingHandlerRef.current = (response: RaWorkerResponse) => {
          if (response.requestId !== requestId) {
            return;
          }
          pendingHandlerRef.current = null;
          if (response.type === 'cancelled') {
            resolve({
              requestId,
              cancelled: true,
              result: {
                version: '1.0.0',
                success: false,
                diagnostics: [
                  {
                    code: 'E_RUNTIME_ABORTED',
                    severity: 'error',
                    message: 'Evaluation was cancelled.',
                    range: params.ast.range,
                  },
                ],
                error: 'Evaluation was cancelled.',
              },
            });
            return;
          }
          resolve({ requestId, result: response.result });
        };

        const msg: RaWorkerRequest = {
          type: 'evaluate',
          requestId,
          ast: params.ast,
          relations: params.relations,
          options: params.options,
        };
        worker.postMessage(msg);
      });
    },
    [cancel, ensureWorker]
  );

  return {
    runEvaluation,
    cancel,
    latestRequestIdRef,
  };
}
