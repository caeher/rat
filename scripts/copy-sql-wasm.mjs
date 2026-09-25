import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(root, '../node_modules/sql.js/dist');
const destDir = path.join(root, '../public/sql-wasm');

const files = ['sql-wasm.wasm'];

fs.mkdirSync(destDir, { recursive: true });

for (const file of files) {
  const from = path.join(srcDir, file);
  const to = path.join(destDir, file);
  if (!fs.existsSync(from)) {
    console.warn(`[copy-sql-wasm] missing ${from}; run pnpm install first`);
    continue;
  }
  fs.copyFileSync(from, to);
  console.log(`[copy-sql-wasm] copied ${file} -> public/sql-wasm/`);
}
