import type { ShareErrorCode } from './types';

export class ShareError extends Error {
  readonly code: ShareErrorCode;

  constructor(code: ShareErrorCode, message: string) {
    super(message);
    this.name = 'ShareError';
    this.code = code;
  }
}
