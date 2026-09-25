export type StorageErrorCode =
  | 'unavailable'
  | 'quota_exceeded'
  | 'corrupt'
  | 'version_mismatch'
  | 'invalid_import'
  | 'conflict'
  | 'unknown';

export interface StorageResult<T> {
  ok: boolean;
  value?: T;
  error?: StorageError;
}

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly recoverable: boolean;

  constructor(code: StorageErrorCode, message: string, recoverable = true) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

export function storageOk<T>(value: T): StorageResult<T> {
  return { ok: true, value };
}

export function storageFail<T>(error: StorageError): StorageResult<T> {
  return { ok: false, error };
}

export function mapDomException(err: unknown): StorageError {
  if (err instanceof DOMException) {
    if (err.name === 'QuotaExceededError') {
      return new StorageError(
        'quota_exceeded',
        'Browser storage is full. Export your workspace or clear history, then try again.'
      );
    }
    if (err.name === 'InvalidStateError' || err.name === 'NotFoundError') {
      return new StorageError('unavailable', 'Local storage is not available in this browser.', false);
    }
  }
  if (err instanceof StorageError) return err;
  const message = err instanceof Error ? err.message : 'Unknown storage error.';
  return new StorageError('unknown', message);
}
