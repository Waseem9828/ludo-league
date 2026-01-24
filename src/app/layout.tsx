
import type { Metadata, Viewport } from 'next';
import React from 'react';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Inter } from 'next/font/google';
import { UserProvider } from '@/hooks/useUser'; // Import UserProvider

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.ludoleague.online'),
  title: 'Ludo League Online – Play Ludo League Games & Compete in Real Matches',
  description: 'Play Ludo League Online at LudoLeague.online. Join multiplayer Ludo matches, compete with real players, and enjoy classic Ludo gameplay on web browsers.',
  keywords: 'ludo league online, play ludo league, online ludo game, multiplayer ludo, ludo league dashboard',
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
      title: 'Ludo League Online – Play Ludo League Games & Compete in Real Matches',
      description: 'Play Ludo League Online at LudoLeague.online. Join multiplayer Ludo matches, compete with real players, and enjoy classic Ludo gameplay on web browsers.',
      url: 'https://www.ludoleague.online',
      siteName: 'Ludo League',
      images: [
        {
          url: '/og-image.png',
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
          <UserProvider>
            {children}
            <Toaster />
            <FirebaseErrorListener />
          </UserProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
