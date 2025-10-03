import createCache from '@emotion/cache';

// Create a fresh emotion cache
export default function createEmotionCache() {
  return createCache({ key: 'css', prepend: true });
}
