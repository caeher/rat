import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withBasePath, getBasePath, resolveAssetPath } from '@/lib/paths';

describe('Paths and BasePath Resolution', () => {
  const originalEnv = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    process.env.NEXT_PUBLIC_BASE_PATH = originalEnv;
  });

  describe('when NEXT_PUBLIC_BASE_PATH is not set (root hosting)', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    });

    it('returns empty string for getBasePath()', () => {
      expect(getBasePath()).toBe('');
    });

    it('returns path as is with leading slash', () => {
      expect(withBasePath('/sandbox')).toBe('/sandbox');
      expect(withBasePath('exercises')).toBe('/exercises');
      expect(resolveAssetPath('/assets/icon.svg')).toBe('/assets/icon.svg');
    });

    it('leaves external URLs unchanged', () => {
      expect(withBasePath('https://github.com/caeher/rat')).toBe('https://github.com/caeher/rat');
      expect(withBasePath('http://localhost:3000')).toBe('http://localhost:3000');
      expect(withBasePath('//cdn.example.com/file.js')).toBe('//cdn.example.com/file.js');
      expect(withBasePath('mailto:test@example.com')).toBe('mailto:test@example.com');
      expect(withBasePath('#section')).toBe('#section');
    });

    it('handles empty path', () => {
      expect(withBasePath('')).toBe('');
    });
  });

  describe('when NEXT_PUBLIC_BASE_PATH is /rat (GitHub Pages hosting)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_BASE_PATH = '/rat';
    });

    it('returns /rat for getBasePath()', () => {
      expect(getBasePath()).toBe('/rat');
    });

    it('prefixes /rat to internal paths', () => {
      expect(withBasePath('/sandbox')).toBe('/rat/sandbox');
      expect(withBasePath('exercises')).toBe('/rat/exercises');
      expect(resolveAssetPath('/worker.js')).toBe('/rat/worker.js');
    });

    it('avoids double prefixing if path already starts with /rat', () => {
      expect(withBasePath('/rat/sandbox')).toBe('/rat/sandbox');
      expect(withBasePath('/rat')).toBe('/rat');
    });

    it('leaves external URLs unchanged', () => {
      expect(withBasePath('https://github.com/caeher/rat')).toBe('https://github.com/caeher/rat');
      expect(withBasePath('#anchor')).toBe('#anchor');
    });
  });
});
