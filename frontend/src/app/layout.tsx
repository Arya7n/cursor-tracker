import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const sans = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

const display = Source_Serif_4({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700'],
});

export const metadata: Metadata = {
  title: 'Cursor Personal API Explorer',
  description:
    'POC to discover what a personal Cursor API key can retrieve about account and usage.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${mono.variable} ${display.variable} min-h-screen font-sans antialiased`}
      >
        <nav className="border-b border-zinc-200/80 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="text-sm font-semibold text-zinc-900">
              Cursor Personal API Explorer
            </Link>
            <div className="flex gap-4 text-sm text-zinc-600">
              <Link href="/" className="hover:text-teal-800">
                Dashboard
              </Link>
              <Link href="/debug" className="hover:text-teal-800">
                Debug
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
