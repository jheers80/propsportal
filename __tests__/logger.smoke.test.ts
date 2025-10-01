import logger from '../src/lib/logger';

test('logger has methods and can be called', () => {
  expect(typeof logger).toBe('object');
  ['error','warn','info','debug'].forEach((m) => {
    // method exists
    expect(typeof (logger as any)[m]).toBe('function');
    // calling should not throw
    (logger as any)[m]('smoke test', { ok: true });
  });
});
