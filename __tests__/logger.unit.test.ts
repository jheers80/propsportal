// Ensure we import after we've set up env in tests where needed

describe('logger robustness', () => {
  let origConsole: any;
  let origStdoutWrite: any;
  let origStderrWrite: any;
  let logger: any;

  beforeEach(() => {
  origConsole = (globalThis as any).console;
  origStdoutWrite = (process as any).stdout && (process as any).stdout.write;
  origStderrWrite = (process as any).stderr && (process as any).stderr.write;
    // import logger fresh per test to pick up environment
    logger = require('../src/lib/logger').default;
  });

  afterEach(() => {
  (globalThis as any).console = origConsole;
  if ((process as any).stdout && typeof origStdoutWrite !== 'undefined') (process as any).stdout.write = origStdoutWrite;
  if ((process as any).stderr && typeof origStderrWrite !== 'undefined') (process as any).stderr.write = origStderrWrite;
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('does not throw when global console methods throw', async () => {
  // Force logger to use console fallback by making process stream writes unavailable
  if ((process as any).stdout) (process as any).stdout.write = undefined;
  if ((process as any).stderr) (process as any).stderr.write = undefined;
    const mockConsole = {
      error: jest.fn(() => { throw new Error('boom'); }),
      log: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };
    (globalThis as any).console = mockConsole;

    expect(() => logger.error('test', { x: 1 })).not.toThrow();

  // wait a tick for the queued microtask to run
  await new Promise((r) => setTimeout(r, 0));

    // The error-level function should have been called asynchronously
    expect(mockConsole.error).toHaveBeenCalled();
  });

  test('writes to process streams when available and does not throw', async () => {
  const writeSpy = jest.fn();
  if ((process as any).stdout) (process as any).stdout.write = writeSpy;
  if ((process as any).stderr) (process as any).stderr.write = writeSpy;

  (globalThis as any).console = undefined;

    expect(() => logger.error('stream-test')).not.toThrow();
  // write is synchronous in our implementation but may be scheduled; wait a tick
  await new Promise((r) => setTimeout(r, 0));
    expect(writeSpy).toHaveBeenCalled();
    const firstArg = writeSpy.mock.calls[0][0];
    expect(typeof firstArg).toBe('string');
    expect(firstArg).toMatch(/ERROR/);
    expect(firstArg).toMatch(/stream-test/);
  });
});
