import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'HawkRoute — Convoy Command System',
  description:
    'Advanced military convoy intelligence, route optimization, and real-time threat assessment system.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-slateDepth">
      <body className={`${inter.variable} antialiased bg-slateDepth text-textNeutral`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
