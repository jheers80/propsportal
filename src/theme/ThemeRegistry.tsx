import * as React from 'react';

// Keep ThemeRegistry as a simple server component wrapper for now. We
// intentionally avoid server-side style injection and do not create an
// emotion cache on the server. Client-side cache is created in
// ClientThemeProvider to ensure consistent class name generation.
export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
