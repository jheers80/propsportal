import fs from 'fs';
import path from 'path';

test('supabaseClient exports getSessionToken', () => {
  const filePath = path.resolve(__dirname, '..', 'src', 'lib', 'supabaseClient.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  // allow `export async function getSessionToken(...)` or `export const getSessionToken = ...`
  expect(content).toMatch(/export\s+(?:async\s+)?(?:const|function)\s+getSessionToken\s*\(/);
});
