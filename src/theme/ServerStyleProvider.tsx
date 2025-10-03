import * as React from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import createEmotionCache from './createEmotionCache';

// Server-only: create an emotion cache and inject the collected styles via
// useServerInsertedHTML. We intentionally avoid importing CacheProvider here
// to prevent the module from being classified as a client module by Next.
export default function ServerStyleProvider({ children }: { children: React.ReactNode }) {
  const cache = createEmotionCache();

  useServerInsertedHTML(() => {
    const sheet = (cache as any).sheet;
    if (!sheet || !sheet.tags || sheet.tags.length === 0) return null;

    const styles = sheet.tags.map((t: any) => t.textContent).join('');
    const keys = sheet.tags.map((t: any) => t.key).join(' ');

    sheet.flush();

    return (
      <style
        data-emotion={`${(cache as any).key} ${keys}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  // Return children unchanged; the client-side provider will create and
  // provide the CacheProvider on the client.
  return <>{children}</>;
}
