
import type { Metadata, Viewport } from 'next';
import React from 'react';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Ludo League Online – Play Competitive Ludo Matches',
  description: 'Ludo League Online is a competitive Ludo platform where players join matches, compete fairly, and enjoy an online Ludo gaming experience.',
  keywords: 'ludo league, ludo league online, play ludo online, ludo league game, online ludo competition',
  robots: 'index, follow',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ludo League',
  },
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
  openGraph: {
      title: 'Ludo League Online – Play Competitive Ludo Matches',
      description: 'The ultimate platform for Ludo enthusiasts. Join thousands of players in fair, secure, and exciting online Ludo matches.',
      url: 'https://www.ludoleague.online',
      siteName: 'Ludo League',
      images: [
        {
          url: 'https://www.ludoleague.online/og-image.png', // Assuming you will add an OG image here
          width: 1200,
          height: 630,
        },
      ],
      locale: 'en_US',
      type: 'website',
  }
};

export const viewport: Viewport = {
  themeColor: '#1F5FA8',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      <body className="font-sans antialiased">
        <FirebaseClientProvider>
            {children}
            <Toaster />
            <FirebaseErrorListener />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
