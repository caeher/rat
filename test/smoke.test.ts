import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Static Site Export Smoke Checks', () => {
  const outDir = path.resolve(process.cwd(), 'out');
  const expectRoot = process.env.SMOKE_EXPECT_ROOT === '1';

  it('verifies that the out directory exists and contains exported pages', () => {
    expect(fs.existsSync(outDir), 'out directory should exist (run build first)').toBe(true);
  });

  it('preserves .nojekyll in export directory to allow _next asset serving', () => {
    const nojekyllPath = path.join(outDir, '.nojekyll');
    expect(fs.existsSync(nojekyllPath), '.nojekyll must exist in out/ to disable Jekyll').toBe(true);
  });

  const expectedHtmlRoutes = [
    'index.html',
    '404.html',
    path.join('404', 'index.html'),
    path.join('sandbox', 'index.html'),
    path.join('exercises', 'index.html'),
    path.join('reference', 'index.html'),
    path.join('components', 'index.html'),
    path.join('quiz', 'index.html'),
    path.join('quiz', 'ex-begin-selection', 'algebra-to-sql', 'index.html'),
    path.join('exercises', 'ex-begin-selection', 'index.html'),
  ];

  it.each(expectedHtmlRoutes)('exports route file: %s', (relativePath) => {
    const filePath = path.join(outDir, relativePath);
    expect(fs.existsSync(filePath), `Exported file ${relativePath} must exist`).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content.length).toBeGreaterThan(100);
    expect(content).toContain('<!DOCTYPE html>');
  });

  it('exports _next static asset bundles and manifests', () => {
    const nextDir = path.join(outDir, '_next');
    expect(fs.existsSync(nextDir), 'out/_next must exist').toBe(true);

    const staticDir = path.join(nextDir, 'static');
    expect(fs.existsSync(staticDir), 'out/_next/static must exist').toBe(true);

    const chunksDir = path.join(staticDir, 'chunks');
    expect(fs.existsSync(chunksDir), 'out/_next/static/chunks must exist').toBe(true);

    const chunkFiles = fs.readdirSync(chunksDir);
    expect(chunkFiles.length).toBeGreaterThan(0);
  });

  it('ships sql.js WASM under public path in export', () => {
    const wasmDir = path.join(outDir, 'sql-wasm');
    expect(fs.existsSync(wasmDir), 'out/sql-wasm must exist').toBe(true);
    const wasmFiles = fs.readdirSync(wasmDir).filter((f) => f.endsWith('.wasm'));
    expect(wasmFiles.length).toBeGreaterThan(0);
  });

  it('properly prefixes asset URLs with base path in HTML when configured', () => {
    const indexHtmlPath = path.join(outDir, 'index.html');
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');

    const scriptSrcMatches = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)).map(
      (m) => m[1]
    );
    const linkHrefMatches = Array.from(
      html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g)
    ).map((m) => m[1]);

    const allAssets = [...scriptSrcMatches, ...linkHrefMatches];
    expect(allAssets.length).toBeGreaterThan(0);

    if (expectRoot) {
      const internalNext = allAssets.filter((asset) => asset.includes('/_next/'));
      expect(internalNext.every((asset) => asset.startsWith('/_next/'))).toBe(true);
      expect(internalNext.some((asset) => asset.startsWith('/rat/'))).toBe(false);
    } else {
      const hasRatBasePath = allAssets.some((asset) => asset.startsWith('/rat/_next/'));
      if (hasRatBasePath) {
        for (const asset of allAssets) {
          if (asset.includes('/_next/')) {
            expect(asset.startsWith('/rat/_next/')).toBe(true);
          }
        }
      }
    }
  });

  it('contains expected root metadata and title tags in exported pages', () => {
    const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf-8');
    expect(indexHtml).toMatch(/<title[^>]*>.*Relational Algebra.*<\/title>/i);

    const sandboxHtml = fs.readFileSync(path.join(outDir, 'sandbox', 'index.html'), 'utf-8');
    expect(sandboxHtml).toMatch(/<title[^>]*>.*Sandbox.*<\/title>/i);

    const exercisesHtml = fs.readFileSync(path.join(outDir, 'exercises', 'index.html'), 'utf-8');
    expect(exercisesHtml).toMatch(/<title[^>]*>.*Exercises.*<\/title>/i);

    const referenceHtml = fs.readFileSync(path.join(outDir, 'reference', 'index.html'), 'utf-8');
    expect(referenceHtml).toMatch(/<title[^>]*>.*Reference.*<\/title>/i);

    const quizHtml = fs.readFileSync(path.join(outDir, 'quiz', 'index.html'), 'utf-8');
    expect(quizHtml).toMatch(/<title[^>]*>.*Quiz/i);
  });
});
