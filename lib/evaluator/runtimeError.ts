import type { DiagnosticCode, SourceRange } from '@/lib/engine/types';

export class EvaluationRuntimeError extends Error {
  readonly code: DiagnosticCode;
  readonly nodeId: string;
  readonly range: SourceRange;
  readonly limitKey?: string;

  constructor(
    message: string,
    opts: {
      code: DiagnosticCode;
      nodeId: string;
      range: SourceRange;
      limitKey?: string;
    }
  ) {
    super(message);
    this.name = 'EvaluationRuntimeError';
    this.code = opts.code;
    this.nodeId = opts.nodeId;
    this.range = opts.range;
    this.limitKey = opts.limitKey;
  }
}

export class EvaluationAbortedError extends EvaluationRuntimeError {
  constructor(nodeId: string, range: SourceRange) {
    super('Evaluation was cancelled.', {
      code: 'E_RUNTIME_ABORTED',
      nodeId,
      range,
    });
    this.name = 'EvaluationAbortedError';
  }
}
