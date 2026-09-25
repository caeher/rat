/// <reference lib="webworker" />

import { cancelActiveEvaluation, evaluateRaAst } from './evaluate';
import type { RaWorkerRequest, RaWorkerResponse } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<RaWorkerRequest>) => {
  const message = event.data;
  if (message.type === 'cancel') {
    cancelActiveEvaluation();
    const response: RaWorkerResponse = { type: 'cancelled', requestId: message.requestId };
    self.postMessage(response);
    return;
  }

  if (message.type === 'evaluate') {
    const result = evaluateRaAst({
      ast: message.ast,
      relations: message.relations,
      options: message.options,
    });

    if (!result.success && result.diagnostics.some((d) => d.code === 'E_RUNTIME_ABORTED')) {
      const response: RaWorkerResponse = { type: 'cancelled', requestId: message.requestId };
      self.postMessage(response);
      return;
    }

    const response: RaWorkerResponse = {
      type: 'result',
      requestId: message.requestId,
      result,
    };
    self.postMessage(response);
  }
};

export {};
