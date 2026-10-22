// After the static export: remove pages that rendered Next's not-found response (gated or unknown
// routes) so the host serves its real 404 status instead of a 200 with "not found" content.
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? 'out';
const MARKER = 'NEXT_HTTP_ERROR_FALLBACK;404';
let removed = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('_next')) continue;
    const index = path.join(full, 'index.html');
    if (fs.existsSync(index) && fs.readFileSync(index, 'utf8').includes(MARKER)) {
      fs.rmSync(full, { recursive: true, force: true });
      removed.push(path.relative(root, full));
      continue;
    }
    walk(full);
  }
}

walk(root);
console.log(`prune-static: removed ${removed.length} not-found page(s): ${removed.join(', ') || '(none)'}`);
