import fs from 'fs';
import path from 'path';

describe('usePermissions source assertions', () => {
  const filePath = path.resolve(__dirname, '..', 'src', 'hooks', 'usePermissions.ts');
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf8');
  });

  test('imports apiGet as a named import from the apiPost helper', () => {
    expect(content).toMatch(/import\s+\{\s*apiGet\s*\}\s+from\s+['"]@\/lib\/apiPost['"];?/);
  });

  test('contains a supabase fallback that queries role_permissions', () => {
    expect(content).toMatch(/supabase[\s\S]*?from\(\s*['"]role_permissions['"]/);
    expect(content).toMatch(/select\([\s\S]*permissions/);
  });
});
