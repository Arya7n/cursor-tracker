import type { Metadata, Viewport } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import { AppHeader } from '@/components/AppHeader';
import './globals.css';

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
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
  title: 'Cursor Usage — company',
  description: 'Usage from enrolled developer PCs',
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
