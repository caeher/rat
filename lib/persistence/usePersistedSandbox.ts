import { useCallback, useEffect, useRef } from 'react';
import { useSandboxState } from '@/lib/sandbox';
import type { SandboxState } from '@/lib/sandbox/types';
import { WORKSPACE_DOCUMENT_VERSION } from './constants';
import type { WorkspaceDocument } from './types';
import { useWorkspace } from './WorkspaceProvider';

export function usePersistedSandbox() {
  const {
    status,
    initialDocument,
    persistWorkspace,
    isDirty,
    remoteNotice,
    applyRemoteWorkspace,
    dismissRemoteNotice,
    persistedRevision,
  } = useWorkspace();

  const hydratedRef = useRef(false);
  const sandbox = useSandboxState(
    status === 'ready' && initialDocument ? initialDocument.sandbox : undefined
  );

  const expressionRef = useRef(
    initialDocument?.expression ?? 'π name, dept_name ( Employees ⋈ Departments )'
  );

  useEffect(() => {
    if (status !== 'ready' || !initialDocument || hydratedRef.current) return;
    hydratedRef.current = true;
    expressionRef.current = initialDocument.expression;
  }, [status, initialDocument]);

  const persistCurrent = useCallback(
    (state: SandboxState, expression: string) => {
      const document: WorkspaceDocument = {
        version: WORKSPACE_DOCUMENT_VERSION,
        sandbox: state,
        expression,
        updatedAt: Date.now(),
      };
      void persistWorkspace(document);
    },
    [persistWorkspace]
  );

  return {
    ...sandbox,
    workspaceStatus: status,
    initialExpression: initialDocument?.expression,
    persistCurrent,
    isWorkspaceDirty: isDirty,
    remoteNotice,
    applyRemoteWorkspace,
    dismissRemoteNotice,
    persistedRevision,
  };
}
