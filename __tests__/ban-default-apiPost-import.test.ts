import fs from 'fs';
import path from 'path';

function listSourceFiles(dir: string, exts = ['.ts', '.tsx', '.js', '.jsx']) {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(full, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

test('no files default-import apiPost from @/lib/apiPost', () => {
  const root = path.resolve(__dirname, '..', 'src');
  const files = listSourceFiles(root);
  const pattern = /import\s+apiPost\s+from\s+['"]@\/lib\/apiPost['"];?/;
  const offenders: string[] = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    if (pattern.test(content)) offenders.push(path.relative(process.cwd(), f));
  }
  if (offenders.length > 0) {
    throw new Error('Found default imports of apiPost in: ' + offenders.join(', '));
  }
});
