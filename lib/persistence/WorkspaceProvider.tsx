import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import type { WorkspaceDocument } from './types';
import {
  bumpLocalWorkspaceRevision,
  clearLastStorageNotice,
  clearRemoteWorkspaceNotice,
  getLastStorageNotice,
  getPersistedRevision,
  getRemoteWorkspaceNotice,
  initPersistence,
  isWorkspaceDirty,
  loadWorkspaceDocument,
  reloadWorkspaceFromStorage,
  saveWorkspaceDocument,
} from './client';
import type { StorageError } from './errors';
import type { StorageHealth } from './types';
import type { RemoteWorkspaceNotice } from './types';

export interface WorkspaceContextValue {
  status: 'loading' | 'ready' | 'error';
  health: StorageHealth | null;
  initialDocument: WorkspaceDocument | null;
  localRevision: number;
  persistedRevision: number;
  isDirty: boolean;
  storageNotice: StorageError | null;
  remoteNotice: RemoteWorkspaceNotice | null;
  clearStorageNotice: () => void;
  dismissRemoteNotice: () => void;
  persistWorkspace: (document: WorkspaceDocument) => Promise<boolean>;
  applyRemoteWorkspace: () => Promise<WorkspaceDocument | null>;
  bumpRevision: () => number;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const PERSIST_DEBOUNCE_MS = 600;

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [initialDocument, setInitialDocument] = useState<WorkspaceDocument | null>(null);
  const [localRevision, setLocalRevision] = useState(0);
  const [persistedRevision, setPersistedRevision] = useState(0);
  const [storageNotice, setStorageNotice] = useState<StorageError | null>(null);
  const [remoteNotice, setRemoteNotice] = useState<RemoteWorkspaceNotice | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDocumentRef = useRef<WorkspaceDocument | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const h = await initPersistence();
        if (cancelled) return;
        setHealth(h);
        const loaded = await loadWorkspaceDocument();
        if (cancelled) return;
        setInitialDocument(loaded.document);
        setLocalRevision(loaded.meta.revision);
        setPersistedRevision(getPersistedRevision());
        setStatus('ready');
        if (!h.writable && h.message) {
          setStorageNotice(getLastStorageNotice());
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const remote = getRemoteWorkspaceNotice();
      if (remote && remote.revision > persistedRevision) {
        setRemoteNotice(remote);
      }
      const notice = getLastStorageNotice();
      if (notice) setStorageNotice(notice);
    }, 1500);
    return () => window.clearInterval(interval);
  }, [persistedRevision]);

  const flushPersist = useCallback(async () => {
    const doc = pendingDocumentRef.current;
    if (!doc) return true;
    const result = await saveWorkspaceDocument(doc, {
      localRevision: localRevision,
      lastRoute: router.asPath,
    });
    if (result.ok && result.value) {
      setPersistedRevision(result.value.revision);
      setLocalRevision(result.value.revision);
      pendingDocumentRef.current = null;
      setStorageNotice(null);
      return true;
    }
    if (result.error) setStorageNotice(result.error);
    return false;
  }, [localRevision, router.asPath]);

  const persistWorkspace = useCallback(
    (document: WorkspaceDocument) => {
      pendingDocumentRef.current = document;
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      return new Promise<boolean>((resolve) => {
        persistTimerRef.current = setTimeout(() => {
          void flushPersist().then(resolve);
        }, PERSIST_DEBOUNCE_MS);
      });
    },
    [flushPersist]
  );

  const bumpRevision = useCallback(() => {
    const next = bumpLocalWorkspaceRevision();
    setLocalRevision(next);
    return next;
  }, []);

  const applyRemoteWorkspace = useCallback(async () => {
    const doc = await reloadWorkspaceFromStorage();
    if (doc) {
      setInitialDocument(doc);
      setPersistedRevision(getPersistedRevision());
      setLocalRevision(getPersistedRevision());
      clearRemoteWorkspaceNotice();
      setRemoteNotice(null);
    }
    return doc;
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      status,
      health,
      initialDocument,
      localRevision,
      persistedRevision,
      isDirty: isWorkspaceDirty(localRevision),
      storageNotice,
      remoteNotice,
      clearStorageNotice: () => {
        clearLastStorageNotice();
        setStorageNotice(null);
      },
      dismissRemoteNotice: () => {
        clearRemoteWorkspaceNotice();
        setRemoteNotice(null);
      },
      persistWorkspace,
      applyRemoteWorkspace,
      bumpRevision,
    }),
    [
      status,
      health,
      initialDocument,
      localRevision,
      persistedRevision,
      storageNotice,
      remoteNotice,
      persistWorkspace,
      applyRemoteWorkspace,
      bumpRevision,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}

export function useOptionalWorkspace(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}
