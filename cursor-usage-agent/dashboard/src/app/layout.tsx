import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { AppHeader } from '@/components/AppHeader';
import './globals.css';

const sans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Cursor Usage — company hub',
  description: 'Fleet usage telemetry from enrolled developer PCs',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
