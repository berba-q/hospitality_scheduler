import type { Metadata, Viewport } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Schedula',
  description: 'Professional hospitality scheduling made simple',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Schedula',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/icons/icon-192x192.png',
    apple: '/icons/icons/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#6366f1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}