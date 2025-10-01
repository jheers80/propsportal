import fs from 'fs';
import path from 'path';

describe('usePermissions import', () => {
  test('imports apiGet as a named import from the apiPost helper', () => {
    const filePath = path.resolve(__dirname, '..', 'src', 'hooks', 'usePermissions.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    // ensure the file uses a named import for apiGet from the helper module
    expect(content).toMatch(/import\s+\{\s*apiGet\s*\}\s+from\s+['"]@\/lib\/apiPost['"];/);
  });
});
