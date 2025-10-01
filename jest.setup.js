require('dotenv').config({ path: '.env.test' });

// Polyfill TextEncoder/TextDecoder for MSW/node and other libs that expect them
const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
