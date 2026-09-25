/** IndexedDB database name for RAT client persistence. */
export const PERSISTENCE_DB_NAME = 'rat-persistence';

/** Bump when object stores or record shapes change (runs migrations). */
export const PERSISTENCE_SCHEMA_VERSION = 1;

/** Version field inside workspace / export JSON documents. */
export const WORKSPACE_DOCUMENT_VERSION = 1;

export const WORKSPACE_EXPORT_VERSION = 1;

export const MAX_HISTORY_ENTRIES = 200;

export const BROADCAST_CHANNEL_NAME = 'rat-workspace-sync';

export const LEGACY_QUIZ_PREFIX = 'rat:quiz:';

export const LEGACY_EXERCISE_PREFIX = 'rat:exercise:';
