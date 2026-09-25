/// <reference lib="webworker" />

import initSqlJs from 'sql.js/dist/sql-wasm.js';
import type { SqlJsStatic } from './execute';
import { executeSqlOnDatabase } from './execute';
import type { SqlWorkerRequest, SqlWorkerResponse } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

let sqlModule: SqlJsStatic | null = null;
let sqlInitPromise: Promise<SqlJsStatic> | null = null;
let cancelRequestedFor = 0;
let wasmLocateUrl = '';

function isCancelled(requestId: number): boolean {
  return cancelRequestedFor === requestId;
}

async function ensureSql(wasmUrl: string): Promise<SqlJsStatic> {
  if (sqlModule && wasmLocateUrl === wasmUrl) {
    return sqlModule;
  }
  wasmLocateUrl = wasmUrl;
  if (!sqlInitPromise) {
    sqlInitPromise = initSqlJs({
      locateFile: () => wasmUrl,
    }).then((SQL) => {
      sqlModule = SQL as SqlJsStatic;
      return sqlModule;
    });
  }
  return sqlInitPromise;
}

self.onmessage = async (event: MessageEvent<SqlWorkerRequest>) => {
  const message = event.data;

  if (message.type === 'cancel') {
    cancelRequestedFor = message.requestId;
    const response: SqlWorkerResponse = { type: 'cancelled', requestId: message.requestId };
    self.postMessage(response);
    return;
  }

  if (message.type === 'execute') {
    cancelRequestedFor = 0;
    const startedAt = Date.now();

    try {
      const SQL = await ensureSql(message.wasmUrl);
      if (isCancelled(message.requestId)) {
        const response: SqlWorkerResponse = { type: 'cancelled', requestId: message.requestId };
        self.postMessage(response);
        return;
      }

      const db = new SQL.Database();
      try {
        const outcome = executeSqlOnDatabase({
          db,
          snapshot: message.snapshot,
          sql: message.sql,
          parameters: message.parameters,
          expectedSchema: message.expectedSchema,
          limits: message.limits,
          startedAt,
          isCancelled: () => isCancelled(message.requestId),
        });

        if (outcome.failureKind === 'cancelled') {
          const response: SqlWorkerResponse = { type: 'cancelled', requestId: message.requestId };
          self.postMessage(response);
          return;
        }

        const response: SqlWorkerResponse = {
          type: 'result',
          requestId: message.requestId,
          outcome,
        };
        self.postMessage(response);
      } finally {
        db.close();
      }
    } catch (error) {
      const response: SqlWorkerResponse = {
        type: 'result',
        requestId: message.requestId,
        outcome: {
          success: false,
          failureKind: 'initialization',
          message: error instanceof Error ? error.message : 'Failed to initialize SQLite.',
          diagnostics: [],
        },
      };
      self.postMessage(response);
    }
  }
};

export {};
