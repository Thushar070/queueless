import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "QueueLess",
  description: "Virtual queue management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'system';
                const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}

              try {
                const originalReplace = window.history.replaceState;
                window.history.replaceState = function(...args) {
                  try {
                    return originalReplace.apply(this, args);
                  } catch (e) {
                    console.warn("history.replaceState blocked by browser context:", e);
                  }
                };
                const originalPush = window.history.pushState;
                window.history.pushState = function(...args) {
                  try {
                    return originalPush.apply(this, args);
                  } catch (e) {
                    console.warn("history.pushState blocked by browser context:", e);
                  }
                };
              } catch (_) {}
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
