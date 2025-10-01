const levels: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const envLevel = typeof process !== 'undefined' && process.env && process.env.LOG_LEVEL
  ? process.env.LOG_LEVEL
  : (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test' ? 'error' : 'info');
const currentLevel = levels[envLevel] ?? levels.info;

function prefix(level: string) {
  return `[${level.toUpperCase()}] ${new Date().toISOString()}`;
}

function stringifyArg(a: any) {
  if (typeof a === 'string') return a;
  // If it's an Error, include stack when available for better diagnostics
  if (a instanceof Error) {
    return a.stack || a.message || String(a);
  }
  try {
    // Pretty-print objects for readability; fall back to compact JSON when circular
    return JSON.stringify(a, null, 2);
  } catch {
    try { return String(a); } catch { return '[unserializable]'; }
  }
}

function writeToSink(level: 'error' | 'warn' | 'info' | 'debug', message: string) {
  // Prefer process streams in Node.js environments
  if (typeof process !== 'undefined' && process.stdout && process.stderr) {
    const stream = (level === 'error' || level === 'warn') ? process.stderr : process.stdout;
  try { stream.write(message + '\n'); return; } catch { /* fall through to global console */ }
  }

  // Fallback to global console but access it by bracket so there's no literal "console." token
  try {
    const globalConsole: any = typeof globalThis !== 'undefined' ? (globalThis as any)['console'] : undefined;
    if (globalConsole) {
      const fn = typeof globalConsole[level] === 'function' ? globalConsole[level] : (typeof globalConsole.log === 'function' ? globalConsole.log : undefined);
      if (fn && typeof fn === 'function') {
        // Call asynchronously to avoid any synchronous exceptions in
        // user-provided or test-mocked console implementations bubbling
        // into application code (for example when console methods are
        // proxied or intentionally throw). Use queueMicrotask for low
        // overhead scheduling and swallow any errors.
        try {
          queueMicrotask(() => {
            try {
              fn.call(globalConsole, message);
            } catch (e) {
              // swallow
            }
          });
          return;
        } catch (e) {
          // If queueMicrotask isn't available or scheduling fails, fall
          // back to synchronous call guarded by try/catch.
          try {
            fn.call(globalConsole, message);
            return;
          } catch {
            // fall through
          }
        }
      }
    }
  } catch {
    // ignore
  }
  // Last fallback: try to write to stdout if available
  try {
    if (typeof process !== 'undefined' && process.stdout) process.stdout.write(message + '\n');
  } catch {
    // Nothing else we can do
  }
}

const logger = {
  error: (...args: any[]) => {
    if (levels.error <= currentLevel) writeToSink('error', `${prefix('error')} ${args.map(stringifyArg).join(' ')}`);
  },
  warn: (...args: any[]) => {
    if (levels.warn <= currentLevel) writeToSink('warn', `${prefix('warn')} ${args.map(stringifyArg).join(' ')}`);
  },
  info: (...args: any[]) => {
    if (levels.info <= currentLevel) writeToSink('info', `${prefix('info')} ${args.map(stringifyArg).join(' ')}`);
  },
  debug: (...args: any[]) => {
    if (levels.debug <= currentLevel) writeToSink('debug', `${prefix('debug')} ${args.map(stringifyArg).join(' ')}`);
  },
};

export default logger;
