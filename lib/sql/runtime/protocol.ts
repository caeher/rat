import type { RelationSchema } from '@/lib/engine/types';
import type { SandboxSnapshot } from '@/lib/sandbox/types';
import type { SqlParameter } from '../types';
import type { SqlRuntimeLimits } from './limits';
import type { SqlExecutionOutcome } from './types';

export type SqlWorkerRequest =
  | {
      type: 'execute';
      requestId: number;
      wasmUrl: string;
      snapshot: SandboxSnapshot;
      sql: string;
      parameters: SqlParameter[];
      expectedSchema: RelationSchema;
      limits?: Partial<SqlRuntimeLimits>;
    }
  | {
      type: 'cancel';
      requestId: number;
    };

export type SqlWorkerResponse =
  | {
      type: 'result';
      requestId: number;
      outcome: SqlExecutionOutcome;
    }
  | {
      type: 'cancelled';
      requestId: number;
    };
