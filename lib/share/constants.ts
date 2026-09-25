/** Version field inside portable share payloads (URL fragment). */
export const SHARE_PAYLOAD_VERSION = 1;

/** Hash prefix: `#share=v1.<payload>` */
export const SHARE_HASH_PREFIX = 'share=v1.';

/**
 * Practical URL length budget for static hosting (fragment + path).
 * Browsers tolerate ~2k–8k; we stay conservative so links work in chat and email.
 */
export const SHARE_URL_SAFE_MAX_CHARS = 6_000;

/** Reject decompressed share JSON larger than this (bytes, UTF-8). */
export const SHARE_DECODED_MAX_BYTES = 512_000;

/** Reject compressed fragment payloads larger than this (bytes). */
export const SHARE_ENCODED_MAX_BYTES = 750_000;
