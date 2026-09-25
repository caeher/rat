/**
 * Utility functions for base path resolution across root (/) and project-site (/rat) hosting.
 */

export function getBasePath(): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return basePath.replace(/\/+$/, '');
}

/**
 * Resolves an internal route or asset path by prefixing the configured base path.
 * Ensures compatibility with GitHub Pages (/rat) and root (/) hosting.
 *
 * @param path Internal path (e.g. '/sandbox', '/assets/icon.svg', 'worker.js')
 * @returns Fully resolved path with base path prefixed where appropriate
 */
export function withBasePath(path: string): string {
  if (!path) return '';

  // Return absolute or external URLs unmodified
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
    path.startsWith('mailto:') ||
    path.startsWith('data:') ||
    path.startsWith('#')
  ) {
    return path;
  }

  const base = getBasePath();
  if (!base) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  // Ensure path starts with single leading slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // If path already begins with the base path, avoid double prefixing
  if (normalizedPath === base || normalizedPath.startsWith(`${base}/`)) {
    return normalizedPath;
  }

  return `${base}${normalizedPath}`;
}

/**
 * Resolves static assets, WebAssembly modules, or Web Worker scripts relative to the base path.
 */
export function resolveAssetPath(assetPath: string): string {
  return withBasePath(assetPath);
}
