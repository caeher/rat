import type { SandboxState } from '@/lib/sandbox/types';
import type { WorkspaceExportBundle } from '@/lib/persistence/types';
import { SHARE_PAYLOAD_VERSION } from './constants';

export interface SandboxShareMeta {
  /** Active schema set display name at share time. */
  schemaSetName?: string;
  /** Optional human label (not validated for display only). */
  title?: string;
  sharedAt: number;
}

export interface SandboxSharePayloadV1 {
  v: typeof SHARE_PAYLOAD_VERSION;
  expression: string;
  sandbox: SandboxState;
  meta?: SandboxShareMeta;
}

export type ShareBuildResult =
  | { ok: true; url: string; encodedLength: number; preview: SharePreview }
  | { ok: false; reason: 'oversized'; preview: SharePreview; bundle: WorkspaceExportBundle };

export interface SharePreview {
  expression: string;
  schemaSetName: string;
  schemaSetCount: number;
  relationCount: number;
  rowCount: number;
  approxDecodedBytes: number;
}

export type ShareParseResult =
  | { ok: true; payload: SandboxSharePayloadV1; preview: SharePreview }
  | { ok: false; code: ShareErrorCode; message: string };

export type ShareErrorCode =
  | 'missing'
  | 'malformed'
  | 'unsupported_version'
  | 'too_large'
  | 'invalid_structure'
  | 'unicode';
