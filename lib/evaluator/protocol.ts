import type { ASTNode, EvaluationOptions, QueryExecutionResult, RelationData } from '@/lib/engine/types';

export type RaWorkerRequest =
  | {
      type: 'evaluate';
      requestId: number;
      ast: ASTNode;
      relations: Record<string, RelationData>;
      options?: EvaluationOptions;
    }
  | {
      type: 'cancel';
      requestId: number;
    };

export type RaWorkerResponse =
  | {
      type: 'result';
      requestId: number;
      result: QueryExecutionResult;
    }
  | {
      type: 'cancelled';
      requestId: number;
    };
