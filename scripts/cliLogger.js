// Lightweight CLI logger for Node scripts (CommonJS)
// Keep this small and dependency-free so CLI scripts can require it directly.
const levels = { error: 0, warn: 1, info: 2, log: 2 };
const levelNames = Object.keys(levels);

function now() {
  return new Date().toISOString();
}

function write(stream, msg) {
  try {
    stream.write(msg + '\n');
  } catch (e) {
    // best-effort
  }
}

module.exports = {
  error: (...args) => {
    write(process.stderr, `[ERROR] ${now()} ${args.map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(' ')}`);
  },
  warn: (...args) => {
    write(process.stderr, `[WARN] ${now()} ${args.map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(' ')}`);
  },
  info: (...args) => {
    write(process.stdout, `[INFO] ${now()} ${args.map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(' ')}`);
  },
  log: (...args) => {
    write(process.stdout, `[INFO] ${now()} ${args.map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
    }).join(' ')}`);
  }
};
